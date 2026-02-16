import type { BookProject } from '../../project/BookProject'
import type { ContextBlock } from '@shared/types'
import { TokenCounter } from './TokenCounter'

export class ContextAssembler {
  assemble(
    project: BookProject,
    userPrompt: string,
    targetChapterIds: string[]
  ): { blocks: ContextBlock[]; totalTokens: number } {
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

      // We need to read the chapter synchronously from cache
      // The caller should have pre-loaded the chapter
      const content = `[Chapter: ${chMeta.title}]\nID: ${id}\nStatus: ${chMeta.status}\nWord count: ${chMeta.wordCount}\n\n${chMeta.summary || '(no content loaded - use read_chapter tool)'}`

      blocks.push({
        type: 'chapter-full',
        id,
        content,
        tokenEstimate: TokenCounter.estimate(content),
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

  private getTokenLimit(aiConfig: { provider: string; model: string }): number {
    if (aiConfig.provider === 'anthropic') return 180000
    if (aiConfig.model === 'gpt-4o') return 120000
    if (aiConfig.model === 'gpt-4o-mini') return 120000
    return 100000
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
}
