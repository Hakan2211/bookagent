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
      const context = this.contextAssembler.assemble(
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

      // 4. Call AI with streaming
      const messages: ChatMessageData[] = [
        { role: 'user', content: fullUserMessage }
      ]

      let fullResponse = ''
      const pendingActions: ToolResult[] = []

      for await (const chunk of this.ai.stream({
        systemPrompt,
        messages,
        tools: AGENT_TOOLS,
        temperature: 0.7,
        maxTokens: 8192,
        signal: this.abortController?.signal
      })) {
        if (this.abortController?.signal.aborted) {
          yield { type: 'error', error: 'Agent cancelled by user' }
          return
        }

        if (chunk.type === 'text_delta' && chunk.text) {
          fullResponse += chunk.text
          yield { type: 'stream', text: chunk.text }
        }

        if (chunk.type === 'tool_use' && chunk.toolCall) {
          yield { type: 'tool_call', toolCall: chunk.toolCall }

          const result = await this.executeTool(chunk.toolCall)
          pendingActions.push(result)
          yield { type: 'tool_result', result }
        }
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
          const content = await this.project.readChapter(
            toolCall.input.chapterId as string
          )
          return { success: true, data: content }
        }

        case 'edit_chapter': {
          const chapterId = toolCall.input.chapterId as string
          const newContent = toolCall.input.newContent as string
          const description = toolCall.input.changeDescription as string

          const currentContent = await this.project.readChapter(chapterId)
          const diff = computeDiff(currentContent, newContent)

          return {
            success: true,
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
          return {
            success: true,
            pendingAction: {
              type: 'create',
              title: toolCall.input.title as string,
              content: toolCall.input.content as string,
              afterChapterId: toolCall.input.afterChapterId as string | undefined
            }
          }
        }

        case 'split_chapter': {
          return {
            success: true,
            pendingAction: {
              type: 'split',
              chapterId: toolCall.input.chapterId as string,
              splitAtParagraph: toolCall.input.splitAtParagraph as number,
              secondChapterTitle: toolCall.input.secondChapterTitle as string
            }
          }
        }

        case 'merge_chapters': {
          return {
            success: true,
            pendingAction: {
              type: 'merge',
              firstChapterId: toolCall.input.firstChapterId as string,
              secondChapterId: toolCall.input.secondChapterId as string,
              mergedTitle: toolCall.input.mergedTitle as string
            }
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
          return {
            success: true,
            pendingAction: {
              type: 'create_section',
              chapterId: toolCall.input.chapterId as string,
              title: toolCall.input.title as string,
              content: toolCall.input.content as string,
              afterSectionId: toolCall.input.afterSectionId as string | undefined
            }
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
