import type { BookProject } from '../../project/BookProject'
import type { ContextBlock, ChatMessageData } from '@shared/types'
import { TokenCounter } from './TokenCounter'

export class ContextAssembler {
  async assemble(
    project: BookProject,
    userPrompt: string,
    targetChapterIds: string[],
    conversationHistory?: ChatMessageData[]
  ): Promise<{ blocks: ContextBlock[]; totalTokens: number }> {
    const blocks: ContextBlock[] = []
    const tokenLimit = this.getTokenLimit(project.manifest.ai)
    const reservedForResponse = 8000
    const budget = tokenLimit - reservedForResponse

    // ── Priority 1: Always included ──────────────
    // Style guide
    const styleContent = this.formatStyleGuide(project)
    blocks.push({
      type: 'style',
      content: styleContent,
      tokenEstimate: TokenCounter.estimate(styleContent),
      priority: 100
    })

    // ── Priority 2: Target chapters (full text) ──
    for (const id of targetChapterIds) {
      const chMeta = project.getChapterMeta(id)
      if (!chMeta) continue

      // Build chapter context block
      const hasSections = chMeta.sections && chMeta.sections.length > 0
      let chapterContent: string

      if (hasSections) {
        // For sectioned chapters, list sections with their metadata
        const sectionsList = chMeta.sections!
          .map(
            (s, i) =>
              `  ${i + 1}. [${s.id}] "${s.title}" — ${s.status}, ${s.wordCount} words${s.summary ? `: ${s.summary}` : ''}`
          )
          .join('\n')
        // Pre-load section content to eliminate read_section round-trips
        const sectionContents: string[] = []
        for (const sec of chMeta.sections!) {
          try {
            const secContent = await project.readSection(id, sec.id)
            sectionContents.push(`--- Section: ${sec.title} [ID: ${sec.id}] ---\n${secContent}`)
          } catch {
            sectionContents.push(`--- Section: ${sec.title} [ID: ${sec.id}] ---\n(failed to load)`)
          }
        }
        chapterContent = `[Chapter: ${chMeta.title}]\nID: ${id}\nStatus: ${chMeta.status}\nType: sectioned (${chMeta.sections!.length} sections)\n\nSections:\n${sectionsList}\n\n${sectionContents.join('\n\n')}`
      } else {
        // Pre-load actual chapter content to eliminate read_chapter round-trip
        try {
          const fileContent = await project.readChapter(id)
          chapterContent = `[Chapter: ${chMeta.title}]\nID: ${id}\nStatus: ${chMeta.status}\nWord count: ${chMeta.wordCount}\n\n${fileContent}`
        } catch {
          chapterContent = `[Chapter: ${chMeta.title}]\nID: ${id}\nStatus: ${chMeta.status}\nWord count: ${chMeta.wordCount}\n\n${chMeta.summary || '(no content loaded - use read_chapter tool)'}`
        }
      }

      blocks.push({
        type: 'chapter-full',
        id,
        content: chapterContent,
        tokenEstimate: TokenCounter.estimate(chapterContent),
        priority: 90
      })
    }

    // ── Priority 3: Adjacent chapter summaries ────
    for (const id of targetChapterIds) {
      const prev = project.getPreviousChapter(id)
      const next = project.getNextChapter(id)

      if (prev && !targetChapterIds.includes(prev.id)) {
        const summary = `[Previous chapter "${prev.title}" summary]: ${prev.summary || 'No summary available'}`
        blocks.push({
          type: 'chapter-summary',
          id: prev.id,
          content: summary,
          tokenEstimate: TokenCounter.estimate(summary),
          priority: 70
        })
      }

      if (next && !targetChapterIds.includes(next.id)) {
        const summary = `[Next chapter "${next.title}" summary]: ${next.summary || 'No summary available'}`
        blocks.push({
          type: 'chapter-summary',
          id: next.id,
          content: summary,
          tokenEstimate: TokenCounter.estimate(summary),
          priority: 70
        })
      }
    }

    // ── Priority 4: Referenced chapters ───────────
    const referenced = this.detectReferencedChapters(userPrompt, project)
    for (const ch of referenced) {
      if (!targetChapterIds.includes(ch.id)) {
        const summary = `[Referenced chapter "${ch.title}" summary]: ${ch.summary || 'No summary available'}`
        blocks.push({
          type: 'chapter-summary',
          id: ch.id,
          content: summary,
          tokenEstimate: TokenCounter.estimate(summary),
          priority: 60
        })
      }
    }

    // ── Priority 5: Relevant notes ───────────────
    const promptLower = userPrompt.toLowerCase()

    if (this.mentionsCharacters(promptLower)) {
      blocks.push({
        type: 'notes',
        id: 'characters',
        content: '[Character Notes]\n(Use read_chapter or update_notes tool to access full notes)',
        tokenEstimate: 50,
        priority: 50
      })
    }

    if (this.mentionsWorldBuilding(promptLower)) {
      blocks.push({
        type: 'notes',
        id: 'world',
        content: '[World & Setting Notes]\n(Use update_notes tool to access full notes)',
        tokenEstimate: 50,
        priority: 50
      })
    }

    // ── Priority 6: Conversation history ────────
    if (conversationHistory && conversationHistory.length > 0) {
      const historyContent = this.formatConversationHistory(conversationHistory)
      if (historyContent) {
        blocks.push({
          type: 'notes',
          id: 'conversation-history',
          content: historyContent,
          tokenEstimate: TokenCounter.estimate(historyContent),
          priority: 40
        })
      }
    }

    // ── Fit to budget ────────────────────────────
    return this.fitToBudget(blocks, budget)
  }

  private fitToBudget(
    blocks: ContextBlock[],
    budget: number
  ): { blocks: ContextBlock[]; totalTokens: number } {
    blocks.sort((a, b) => b.priority - a.priority)

    const included: ContextBlock[] = []
    let totalTokens = 0

    for (const block of blocks) {
      if (totalTokens + block.tokenEstimate <= budget) {
        included.push(block)
        totalTokens += block.tokenEstimate
      }
    }

    return { blocks: included, totalTokens }
  }

  private formatStyleGuide(project: BookProject): string {
    const s = project.manifest.style
    const parts = ['[Style Guide]']
    if (s.genre) parts.push(`Genre: ${s.genre}`)
    if (s.pov) parts.push(`POV: ${s.pov}`)
    if (s.tense) parts.push(`Tense: ${s.tense}`)
    if (s.tone) parts.push(`Tone: ${s.tone}`)
    if (s.avoidWords.length > 0) parts.push(`Avoid: ${s.avoidWords.join(', ')}`)
    if (s.customInstructions) parts.push(`Instructions: ${s.customInstructions}`)
    return parts.join('\n')
  }

  private getTokenLimit(_aiConfig: { provider: string; model: string }): number {
    // All models are accessed via OpenRouter; use a generous default
    return 180000
  }

  private detectReferencedChapters(prompt: string, project: BookProject) {
    const chapters = project.manifest.chapters
    const referenced: typeof chapters = []
    const promptLower = prompt.toLowerCase()

    for (const ch of chapters) {
      const num = parseInt(ch.id.replace('ch-', ''), 10)
      const patterns = [
        `chapter ${num}`,
        `ch ${num}`,
        `ch-${String(num).padStart(2, '0')}`,
        `chapter${num}`
      ]

      if (patterns.some(p => promptLower.includes(p))) {
        referenced.push(ch)
        continue
      }

      if (ch.title && promptLower.includes(ch.title.toLowerCase())) {
        referenced.push(ch)
      }
    }

    return referenced
  }

  private mentionsCharacters(prompt: string): boolean {
    const keywords = [
      'character', 'protagonist', 'antagonist', 'name', 'dialogue',
      'personality', 'motivation', 'relationship'
    ]
    return keywords.some(k => prompt.includes(k))
  }

  private mentionsWorldBuilding(prompt: string): boolean {
    const keywords = [
      'setting', 'world', 'location', 'place', 'city',
      'building', 'environment', 'atmosphere', 'era', 'time period'
    ]
    return keywords.some(k => prompt.includes(k))
  }

  private formatConversationHistory(history: ChatMessageData[]): string {
    if (history.length === 0) return ''

    // Take the last few exchanges (at most 6 messages = 3 pairs)
    const recent = history.slice(-6)
    const lines = ['[Previous conversation context]']

    for (const msg of recent) {
      const role = msg.role === 'user' ? 'Author' : 'Assistant'
      // Truncate long messages to keep context manageable
      const content =
        msg.content.length > 500
          ? msg.content.slice(0, 500) + '...(truncated)'
          : msg.content
      lines.push(`${role}: ${content}`)
    }

    return lines.join('\n')
  }
}
