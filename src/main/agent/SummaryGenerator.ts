import type { AIProvider, ChapterSummary } from '@shared/types'
import { buildSummarizingPrompt } from './prompts/summarizing'

export class SummaryGenerator {
  constructor(private ai: AIProvider) {}

  async generateSummary(
    chapterTitle: string,
    chapterContent: string
  ): Promise<ChapterSummary> {
    const prompt = buildSummarizingPrompt(chapterTitle, chapterContent)

    try {
      const response = await this.ai.complete({
        systemPrompt: 'You are a literary analysis assistant. Respond with valid JSON only.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        responseFormat: 'json',
        maxTokens: 1024
      })

      const cleaned = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      const parsed = JSON.parse(cleaned) as ChapterSummary

      return {
        summary: parsed.summary || '',
        characters: parsed.characters || [],
        locations: parsed.locations || [],
        keyEvents: parsed.keyEvents || [],
        wordCount: chapterContent.split(/\s+/).filter(Boolean).length
      }
    } catch {
      // Fallback: basic summary
      const words = chapterContent.split(/\s+/).filter(Boolean)
      return {
        summary: words.slice(0, 30).join(' ') + '...',
        characters: [],
        locations: [],
        keyEvents: [],
        wordCount: words.length
      }
    }
  }
}
