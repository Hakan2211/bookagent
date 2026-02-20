import type {
  AIProvider,
  AgentEvent,
  AgentPhase,
  AgentPlan,
  AgentQuestion,
  AgentQuestionResponse,
  IntentClassification,
  PlanStep,
  ToolCall,
  ToolResult,
  ChatMessageData
} from '@shared/types'
import type { BookProject } from '../project/BookProject'
import { ContextAssembler } from './context/ContextAssembler'
import { detectTargetChapters } from './context/ChapterDetector'
import { IntentClassifier } from './IntentClassifier'
import { buildSystemPrompt, buildExecutionSystemPrompt } from './prompts/system'
import { buildQuestioningPrompt } from './prompts/questioning'
import { AGENT_TOOLS } from './tools'
import { computeDiff } from './diff-utils'

/**
 * Persistent agent session that maintains conversation history
 * and implements the multi-phase agentic workflow:
 *
 *   Classify Intent → Smart Questions → Plan → Execute → Done
 *
 * A session persists across multiple user prompts within the same
 * project. It is created when a project opens and destroyed on close.
 */
export class AgentSession {
  private conversationHistory: ChatMessageData[] = []
  private abortController: AbortController | null = null
  private contextAssembler = new ContextAssembler()
  private intentClassifier: IntentClassifier
  private currentPhase: AgentPhase = 'done'
  private currentClassification: IntentClassification | null = null
  private currentPlan: AgentPlan | null = null
  private pendingQuestionResolve: ((answers: AgentQuestionResponse[]) => void) | null = null
  private pendingPlanResolve: ((decision: 'execute' | 'adjust' | 'cancel', adjustment?: string) => void) | null = null

  /** Maximum conversation history pairs to keep (older ones are dropped) */
  private static MAX_HISTORY_PAIRS = 10

  constructor(
    private ai: AIProvider,
    private project: BookProject
  ) {
    this.intentClassifier = new IntentClassifier(ai)
  }

  /**
   * Main entry point: handle a user prompt through the multi-phase workflow.
   * Yields events that the IPC layer forwards to the renderer.
   */
  async *handlePrompt(
    userPrompt: string,
    openChapterId: string | null
  ): AsyncGenerator<AgentEvent> {
    this.abortController = new AbortController()

    try {
      // ── Phase 1: Classify Intent ─────────────────
      yield { type: 'phase_change', phase: 'classifying' }
      this.currentPhase = 'classifying'

      const classification = await this.intentClassifier.classify(
        userPrompt,
        this.project.manifest,
        openChapterId
      )
      this.currentClassification = classification

      // For simple intents (question, feedback) or clear prompts: skip questions
      const skipQuestions =
        classification.intent === 'question' ||
        classification.intent === 'feedback' ||
        classification.clarity === 'clear'

      // ── Phase 2: Smart Questions (if needed) ─────
      if (!skipQuestions) {
        yield { type: 'phase_change', phase: 'questioning' }
        this.currentPhase = 'questioning'

        const questions = await this.generateQuestions(classification, openChapterId)

        if (questions.length > 0) {
          yield { type: 'questions', questions }

          // Wait for user to answer questions
          const answers = await this.waitForQuestionAnswers()

          if (this.abortController?.signal.aborted) {
            yield { type: 'error', error: 'Agent cancelled by user' }
            return
          }

          // Append the Q&A to the prompt context for the planning/execution phase
          const qaContext = this.formatQAContext(questions, answers)
          userPrompt = `${userPrompt}\n\n${qaContext}`
        }
      }

      // ── Phase 3: Plan (if approval required) ─────
      const skipPlan =
        !classification.requiresApproval ||
        classification.intent === 'question' ||
        classification.intent === 'feedback'

      if (!skipPlan) {
        yield { type: 'phase_change', phase: 'planning' }
        this.currentPhase = 'planning'

        const plan = await this.generatePlan(userPrompt, classification, openChapterId)

        if (plan) {
          this.currentPlan = plan
          yield { type: 'plan_proposal', plan }
          yield { type: 'phase_change', phase: 'awaiting_plan' }
          this.currentPhase = 'awaiting_plan'

          // Wait for user to approve/adjust/cancel
          const { decision, adjustment } = await this.waitForPlanDecision()

          if (this.abortController?.signal.aborted || decision === 'cancel') {
            yield { type: 'stream', text: 'Plan cancelled.' }
            yield { type: 'done', fullResponse: 'Plan cancelled.' }
            return
          }

          if (decision === 'adjust' && adjustment) {
            userPrompt = `${userPrompt}\n\nUser adjustment to the plan: ${adjustment}`
            // Re-generate plan with adjustment? No — just pass adjustment as additional context
          }
        }
      }

      // ── Phase 4: Execute ─────────────────────────
      yield { type: 'phase_change', phase: 'executing' }
      this.currentPhase = 'executing'

      yield* this.executeAgentLoop(userPrompt, openChapterId, classification)

      // ── Done ─────────────────────────────────────
      yield { type: 'phase_change', phase: 'done' }
      this.currentPhase = 'done'
    } catch (error) {
      this.currentPhase = 'error'
      yield { type: 'phase_change', phase: 'error' }
      const message = error instanceof Error ? error.message : 'Unknown error'
      yield { type: 'error', error: message }
    }
  }

  /**
   * Supply answers to the questions the agent asked.
   * Called from the IPC layer when the user submits the question form.
   */
  supplyQuestionAnswers(answers: AgentQuestionResponse[]): void {
    if (this.pendingQuestionResolve) {
      this.pendingQuestionResolve(answers)
      this.pendingQuestionResolve = null
    }
  }

  /**
   * Supply the user's decision on the proposed plan.
   * Called from the IPC layer when the user clicks Execute/Adjust/Cancel.
   */
  supplyPlanDecision(decision: 'execute' | 'adjust' | 'cancel', adjustment?: string): void {
    if (this.pendingPlanResolve) {
      this.pendingPlanResolve(decision, adjustment)
      this.pendingPlanResolve = null
    }
  }

  /**
   * Cancel the current operation.
   */
  cancel(): void {
    this.abortController?.abort()
    // Also resolve any pending promises so the generator can exit
    if (this.pendingQuestionResolve) {
      this.pendingQuestionResolve([])
      this.pendingQuestionResolve = null
    }
    if (this.pendingPlanResolve) {
      this.pendingPlanResolve('cancel')
      this.pendingPlanResolve = null
    }
  }

  /**
   * Clear conversation history. Called on project switch or user request.
   */
  clearHistory(): void {
    this.conversationHistory = []
    this.currentClassification = null
    this.currentPlan = null
  }

  /**
   * Get the current agent phase for status display.
   */
  getPhase(): AgentPhase {
    return this.currentPhase
  }

  // ─── Private: Question Generation ──────────────

  private async generateQuestions(
    classification: IntentClassification,
    openChapterId: string | null
  ): Promise<AgentQuestion[]> {
    try {
      const systemPrompt = buildQuestioningPrompt(
        this.project.manifest,
        classification,
        openChapterId
      )

      const response = await this.ai.complete({
        systemPrompt,
        messages: [
          {
            role: 'user',
            content: `The user said: "${classification.reasoning}"\n\nGenerate clarifying questions.`
          }
        ],
        temperature: 0.3,
        maxTokens: 1024,
        responseFormat: 'json'
      })

      const questions: AgentQuestion[] = JSON.parse(response.content)

      // Validate and sanitize
      return questions
        .filter(
          (q) =>
            q.question &&
            typeof q.question === 'string' &&
            ['text', 'choice', 'multi-choice'].includes(q.type)
        )
        .map((q) => ({
          id: q.id || crypto.randomUUID(),
          question: q.question,
          type: q.type,
          options: q.options || undefined,
          placeholder: q.placeholder || undefined,
          required: q.required ?? false
        }))
    } catch {
      // If question generation fails, skip questions
      return []
    }
  }

  private waitForQuestionAnswers(): Promise<AgentQuestionResponse[]> {
    return new Promise((resolve) => {
      this.pendingQuestionResolve = resolve
    })
  }

  private formatQAContext(questions: AgentQuestion[], answers: AgentQuestionResponse[]): string {
    if (answers.length === 0) return ''

    const lines = ['Author\'s additional context from clarifying questions:']
    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId)
      const answerText = Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer
      if (question && answerText) {
        lines.push(`Q: ${question.question}`)
        lines.push(`A: ${answerText}`)
      }
    }
    return lines.join('\n')
  }

  // ─── Private: Plan Generation ──────────────────

  private async generatePlan(
    userPrompt: string,
    classification: IntentClassification,
    openChapterId: string | null
  ): Promise<AgentPlan | null> {
    try {
      const targetChapters = detectTargetChapters(
        userPrompt,
        this.project,
        openChapterId
      )

      const context = await this.contextAssembler.assemble(
        this.project,
        userPrompt,
        targetChapters,
        this.conversationHistory
      )

      const contextBlock = context.blocks
        .map((b) => `<${b.type} id="${b.id || ''}">\n${b.content}\n</${b.type}>`)
        .join('\n\n')

      const planPrompt = `You are planning (NOT executing) a task for a book writing assistant. Analyze the request and produce a structured execution plan.

## TASK CLASSIFICATION
Intent: ${classification.intent}
Scope: ${classification.scope}
Target chapters: ${classification.targetChapters.join(', ') || 'to be determined'}

## BOOK CONTEXT
${contextBlock}

## USER REQUEST
${userPrompt}

## INSTRUCTIONS
Create an execution plan as a JSON object. Do NOT execute any tools — just plan.

{
  "summary": "One-sentence description of what will be done",
  "steps": [
    {
      "id": "step-1",
      "description": "What this step does",
      "tool": "the tool that will be used (create_chapter, edit_chapter, edit_section, etc.)",
      "target": "Which chapter/section this affects"
    }
  ],
  "affectedChapters": [
    { "id": "ch-01", "title": "Chapter Title", "action": "edit/create/delete/split/merge" }
  ],
  "estimatedScope": "e.g. '~2,000 new words in 1 chapter' or '~500 words modified across 3 sections'",
  "risks": ["Optional: any risks or trade-offs the author should know about"]
}

Respond with ONLY the JSON object.`

      const response = await this.ai.complete({
        systemPrompt: planPrompt,
        messages: [{ role: 'user', content: 'Generate the plan.' }],
        temperature: 0.3,
        maxTokens: 2048,
        responseFormat: 'json'
      })

      const parsed = JSON.parse(response.content)

      return {
        id: crypto.randomUUID(),
        summary: parsed.summary || 'Execute the requested task',
        intent: classification.intent,
        steps: (parsed.steps || []).map((s: any, i: number) => ({
          id: s.id || `step-${i + 1}`,
          description: s.description || '',
          tool: s.tool || '',
          target: s.target || '',
          status: 'pending' as const
        })),
        affectedChapters: parsed.affectedChapters || [],
        estimatedScope: parsed.estimatedScope || '',
        risks: parsed.risks || undefined
      }
    } catch {
      // If plan generation fails, skip the plan phase and go to execution
      return null
    }
  }

  private waitForPlanDecision(): Promise<{
    decision: 'execute' | 'adjust' | 'cancel'
    adjustment?: string
  }> {
    return new Promise((resolve) => {
      this.pendingPlanResolve = (
        decision: 'execute' | 'adjust' | 'cancel',
        adjustment?: string
      ) => {
        resolve({ decision, adjustment })
      }
    })
  }

  // ─── Private: Execution Loop ───────────────────

  /**
   * The core agentic execution loop — streams AI response, handles tool calls,
   * and iterates until the AI stops calling tools (max 25 turns).
   * This is the same loop as before but with plan context and conversation history.
   */
  private async *executeAgentLoop(
    userPrompt: string,
    openChapterId: string | null,
    classification: IntentClassification
  ): AsyncGenerator<AgentEvent> {
    const targetChapters = detectTargetChapters(
      userPrompt,
      this.project,
      openChapterId
    )

    const context = await this.contextAssembler.assemble(
      this.project,
      userPrompt,
      targetChapters,
      this.conversationHistory
    )

    // Build system prompt — include plan context if we have an approved plan
    const systemPrompt = this.currentPlan
      ? buildExecutionSystemPrompt(this.project, this.currentPlan)
      : buildSystemPrompt(this.project)

    const contextBlock = context.blocks
      .map((b) => `<${b.type} id="${b.id || ''}">\n${b.content}\n</${b.type}>`)
      .join('\n\n')

    const fullUserMessage = `${contextBlock}\n\n---\n\nUser request: ${userPrompt}`

    // Build messages: conversation history + current prompt
    const MAX_TURNS = 25
    const messages: ChatMessageData[] = [
      ...this.getRecentHistory(),
      { role: 'user', content: fullUserMessage }
    ]

    let fullResponse = ''
    let currentStepIndex = 0

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

        if (chunk.type === 'done' && chunk.finishReason === 'max_tokens') {
          wasTruncated = true
        }
      }

      // Handle truncation
      if (wasTruncated && turnToolCalls.length === 0) {
        if (turnText) {
          messages.push({ role: 'assistant', content: turnText })
        }
        messages.push({
          role: 'user',
          content:
            'Your previous response was truncated due to length limits. Please continue where you left off. If you were in the middle of a tool call, please retry the tool call.'
        })
        yield { type: 'stream', text: '\n\n[Continuing...]\n\n' }
        continue
      }

      // No tool calls = done
      if (turnToolCalls.length === 0) {
        break
      }

      // Add assistant response to conversation
      messages.push({
        role: 'assistant',
        content: turnText,
        toolCalls: turnToolCalls
      })

      // Execute tool calls and update plan step progress
      for (const toolCall of turnToolCalls) {
        yield { type: 'tool_call', toolCall }

        // Update plan step progress
        if (this.currentPlan && currentStepIndex < this.currentPlan.steps.length) {
          const step = this.currentPlan.steps[currentStepIndex]
          step.status = 'in_progress'
          yield { type: 'step_progress', stepId: step.id, status: 'in_progress' }
        }

        const result = await this.executeTool(toolCall)
        yield { type: 'tool_result', result }

        // Mark step complete
        if (this.currentPlan && currentStepIndex < this.currentPlan.steps.length) {
          const step = this.currentPlan.steps[currentStepIndex]
          step.status = 'complete'
          yield { type: 'step_progress', stepId: step.id, status: 'complete' }
          currentStepIndex++
        }

        const resultContent = result.success
          ? JSON.stringify(result.data ?? 'Done')
          : `Error: ${result.error}`

        messages.push({
          role: 'tool',
          content: resultContent,
          toolCallId: toolCall.id
        })
      }
    }

    // Save to conversation history
    this.conversationHistory.push(
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: fullResponse }
    )
    this.trimHistory()

    yield { type: 'done', fullResponse }
  }

  // ─── Private: Conversation History ─────────────

  private getRecentHistory(): ChatMessageData[] {
    // Return the last N message pairs (user + assistant)
    const maxMessages = AgentSession.MAX_HISTORY_PAIRS * 2
    if (this.conversationHistory.length <= maxMessages) {
      return [...this.conversationHistory]
    }
    return this.conversationHistory.slice(-maxMessages)
  }

  private trimHistory(): void {
    const maxMessages = AgentSession.MAX_HISTORY_PAIRS * 2
    if (this.conversationHistory.length > maxMessages) {
      this.conversationHistory = this.conversationHistory.slice(-maxMessages)
    }
  }

  // ─── Private: Tool Execution ───────────────────

  private async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    try {
      switch (toolCall.name) {
        case 'read_chapter': {
          const chapterId = toolCall.input.chapterId as string
          const chapterMeta = this.project.getChapterMeta(chapterId)
          if (chapterMeta?.sections && chapterMeta.sections.length > 0) {
            const sectionList = chapterMeta.sections
              .map((s) => `  - [${s.id}] "${s.title}" (${s.wordCount} words)`)
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
              .map((s) => `  - [${s.id}] "${s.title}" (${s.wordCount} words)`)
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

        case 'create_sectioned_chapter': {
          const sections = toolCall.input.sections as { title: string; content: string }[]
          const meta = await this.project.addSectionedChapter(
            toolCall.input.title as string,
            sections,
            toolCall.input.afterChapterId as string | undefined
          )
          const sectionList = (meta.sections || [])
            .map((s) => `  - [${s.id}] "${s.title}" (${s.wordCount} words)`)
            .join('\n')
          return {
            success: true,
            data: `Created sectioned chapter "${meta.title}" (${meta.id}) with ${meta.sections?.length || 0} sections, ${meta.wordCount} words total:\n${sectionList}`
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

/**
 * Legacy Agent class that wraps AgentSession for backward compatibility.
 * This can be removed once all callers migrate to AgentSession.
 * @deprecated Use AgentSession instead
 */
export class Agent {
  private session: AgentSession

  constructor(ai: AIProvider, project: BookProject) {
    this.session = new AgentSession(ai, project)
  }

  async *handlePrompt(
    userPrompt: string,
    openChapterId: string | null
  ): AsyncGenerator<AgentEvent> {
    yield* this.session.handlePrompt(userPrompt, openChapterId)
  }

  cancel(): void {
    this.session.cancel()
  }
}
