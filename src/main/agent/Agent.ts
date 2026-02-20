import type {
  AIProvider,
  AgentEvent,
  ToolCall,
  ToolResult,
  ChatMessageData
} from '@shared/types'
import type { BookProject } from '../project/BookProject'
import { ContextAssembler } from './context/ContextAssembler'
import { detectTargetChapters } from './context/ChapterDetector'
import { buildSystemPrompt } from './prompts/system'
import { AGENT_TOOLS } from './tools'
import { computeDiff } from './diff-utils'

export class Agent {
  private abortController: AbortController | null = null
  private contextAssembler = new ContextAssembler()

  constructor(
    private ai: AIProvider,
    private project: BookProject
  ) {}

  async *handlePrompt(
    userPrompt: string,
    openChapterId: string | null
  ): AsyncGenerator<AgentEvent> {
    this.abortController = new AbortController()

    try {
      // 1. Detect target chapters
      const targetChapters = detectTargetChapters(
        userPrompt,
        this.project,
        openChapterId
      )

      // 2. Assemble context
      const context = await this.contextAssembler.assemble(
        this.project,
        userPrompt,
        targetChapters
      )

      // 3. Build the request
      const systemPrompt = buildSystemPrompt(this.project)
      const contextBlock = context.blocks
        .map(b => `<${b.type} id="${b.id || ''}">\n${b.content}\n</${b.type}>`)
        .join('\n\n')

      const fullUserMessage = `${contextBlock}\n\n---\n\nUser request: ${userPrompt}`

      // 4. Call AI with streaming — agentic loop with multi-turn tool use
      const MAX_TURNS = 25
      const messages: ChatMessageData[] = [
        { role: 'user', content: fullUserMessage }
      ]

      let fullResponse = ''

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (this.abortController?.signal.aborted) {
          yield { type: 'error', error: 'Agent cancelled by user' }
          return
        }

        let turnText = ''
        const turnToolCalls: ToolCall[] = []
        let wasTruncated = false

        for await (const chunk of this.ai.stream({
          systemPrompt,
          messages,
          tools: AGENT_TOOLS,
          temperature: 0.7,
          maxTokens: 16384,
          signal: this.abortController?.signal
        })) {
          if (this.abortController?.signal.aborted) {
            yield { type: 'error', error: 'Agent cancelled by user' }
            return
          }

          if (chunk.type === 'text_delta' && chunk.text) {
            turnText += chunk.text
            fullResponse += chunk.text
            yield { type: 'stream', text: chunk.text }
          }

          if (chunk.type === 'tool_use' && chunk.toolCall) {
            turnToolCalls.push(chunk.toolCall)
          }

          // Detect if the response was truncated by hitting max_tokens
          if (chunk.type === 'done' && chunk.finishReason === 'max_tokens') {
            wasTruncated = true
          }
        }

        // If the response was truncated, the AI ran out of output tokens.
        // Any in-progress tool call JSON was likely malformed and dropped.
        // Continue the loop so the AI can retry with context of what it already said.
        if (wasTruncated && turnToolCalls.length === 0) {
          if (turnText) {
            messages.push({ role: 'assistant', content: turnText })
          }
          messages.push({
            role: 'user',
            content: 'Your previous response was truncated due to length limits. Please continue where you left off. If you were in the middle of a tool call, please retry the tool call.'
          })
          yield { type: 'stream', text: '\n\n[Continuing...]\n\n' }
          continue
        }

        // If no tool calls were made, the AI is done
        if (turnToolCalls.length === 0) {
          break
        }

        // Add the assistant's response (with tool calls) to the conversation
        messages.push({
          role: 'assistant',
          content: turnText,
          toolCalls: turnToolCalls
        })

        // Execute each tool call and add results to the conversation
        for (const toolCall of turnToolCalls) {
          yield { type: 'tool_call', toolCall }

          const result = await this.executeTool(toolCall)
          yield { type: 'tool_result', result }

          // Serialize tool result for the AI to see
          const resultContent = result.success
            ? JSON.stringify(result.data ?? 'Done')
            : `Error: ${result.error}`

          messages.push({
            role: 'tool',
            content: resultContent,
            toolCallId: toolCall.id
          })
        }

        // Loop continues — AI will see tool results and decide what to do next
      }

      yield { type: 'done', fullResponse }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      yield { type: 'error', error: message }
    }
  }

  cancel(): void {
    this.abortController?.abort()
  }

  private async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    try {
      switch (toolCall.name) {
        case 'read_chapter': {
          const chapterId = toolCall.input.chapterId as string
          const chapterMeta = this.project.getChapterMeta(chapterId)
          if (chapterMeta?.sections && chapterMeta.sections.length > 0) {
            const sectionList = chapterMeta.sections
              .map(s => `  - [${s.id}] "${s.title}" (${s.wordCount} words)`)
              .join('\n')
            return {
              success: false,
              error: `Chapter "${chapterId}" is sectioned into separate files. Use read_section to read individual sections:\n${sectionList}`
            }
          }
          const content = await this.project.readChapter(chapterId)
          return { success: true, data: content }
        }

        case 'edit_chapter': {
          const chapterId = toolCall.input.chapterId as string
          const chapterMeta = this.project.getChapterMeta(chapterId)
          if (chapterMeta?.sections && chapterMeta.sections.length > 0) {
            const sectionList = chapterMeta.sections
              .map(s => `  - [${s.id}] "${s.title}" (${s.wordCount} words)`)
              .join('\n')
            return {
              success: false,
              error: `Chapter "${chapterId}" is sectioned into separate files. Use edit_section to edit individual sections:\n${sectionList}`
            }
          }
          const newContent = toolCall.input.newContent as string
          const description = toolCall.input.changeDescription as string

          const currentContent = await this.project.readChapter(chapterId)
          const diff = computeDiff(currentContent, newContent)

          return {
            success: true,
            data: `Edit proposed for chapter "${this.project.getChapterTitle(chapterId)}" — waiting for user review.`,
            pendingAction: {
              type: 'edit',
              chapterId,
              oldContent: currentContent,
              newContent,
              diff,
              description
            }
          }
        }

        case 'create_chapter': {
          const meta = await this.project.addChapter(
            toolCall.input.title as string,
            toolCall.input.content as string,
            toolCall.input.afterChapterId as string | undefined
          )
          return {
            success: true,
            data: `Created chapter "${meta.title}" (${meta.id}, ${meta.wordCount} words)`
          }
        }

        case 'read_section': {
          const content = await this.project.readSection(
            toolCall.input.chapterId as string,
            toolCall.input.sectionId as string
          )
          return { success: true, data: content }
        }

        case 'edit_section': {
          const chapterId = toolCall.input.chapterId as string
          const sectionId = toolCall.input.sectionId as string
          const newContent = toolCall.input.newContent as string
          const description = toolCall.input.changeDescription as string

          const currentContent = await this.project.readSection(chapterId, sectionId)
          const diff = computeDiff(currentContent, newContent)

          return {
            success: true,
            data: `Edit proposed for section "${sectionId}" in chapter "${this.project.getChapterTitle(chapterId)}" — waiting for user review.`,
            pendingAction: {
              type: 'edit_section',
              chapterId,
              sectionId,
              oldContent: currentContent,
              newContent,
              diff,
              description
            }
          }
        }

        case 'create_section': {
          const meta = await this.project.addSection(
            toolCall.input.chapterId as string,
            toolCall.input.title as string,
            toolCall.input.content as string,
            toolCall.input.afterSectionId as string | undefined
          )
          return {
            success: true,
            data: `Created section "${meta.title}" (${meta.id}, ${meta.wordCount} words)`
          }
        }

        case 'delete_section': {
          await this.project.deleteSection(
            toolCall.input.chapterId as string,
            toolCall.input.sectionId as string
          )
          return { success: true, data: 'Section deleted' }
        }

        case 'update_outline': {
          // Handled by renderer — emit event
          return { success: true, data: 'Outline update requested' }
        }

        case 'update_notes': {
          const noteId = toolCall.input.noteId as string
          const content = toolCall.input.content as string
          await this.project.saveNote(noteId, content)
          return { success: true, data: `Updated ${noteId} notes` }
        }

        case 'search_book': {
          const results = await this.project.searchAllChapters(
            toolCall.input.query as string
          )
          return { success: true, data: results }
        }

        case 'get_book_stats': {
          const stats = this.project.getAllWordCounts()
          return { success: true, data: stats }
        }

        default:
          return { success: false, error: `Unknown tool: ${toolCall.name}` }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed'
      return { success: false, error: message }
    }
  }
}
