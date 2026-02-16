import type { AIProvider, ProposedChapter } from '@shared/types'

interface SplitResult {
  chapters: Array<{
    title: string
    summary: string
    startCharIndex: number
    endCharIndex: number
    detectedMarker?: string
  }>
  bookSummary: string
  detectedGenre: string
  detectedPOV: string
  detectedTense: string
}

function buildSplittingPrompt(
  text: string,
  targetChapterWords: number,
  totalWords: number
): { systemPrompt: string; userMessage: string } {
  const estimatedChapters = Math.max(1, Math.round(totalWords / targetChapterWords))

  const systemPrompt = `You are a book structuring assistant. Your job is to analyze a manuscript and propose how to split it into chapters.

RULES:
- Target approximately ${targetChapterWords} words per chapter (flexible ±30%)
- Identify natural break points: scene changes, time jumps, topic shifts, POV shifts
- If the text already has chapter markers (e.g., "Chapter 1", "PART ONE", "I.", "1."), respect those
- Preserve the original text EXACTLY — do not rewrite, edit, or correct anything
- Each chapter needs a descriptive title (not just "Chapter 1")
- Provide a 2-3 sentence summary for each chapter
- Also detect the overall genre, POV, and tense if possible

RESPOND WITH VALID JSON ONLY. No markdown, no explanation, no backticks.`

  const userMessage = `Here is a manuscript with approximately ${totalWords} words. 
Please split it into roughly ${estimatedChapters} chapters of about ${targetChapterWords} words each.

<manuscript>
${text}
</manuscript>

Respond with this exact JSON structure:
{
  "chapters": [
    {
      "title": "Chapter title here",
      "summary": "2-3 sentence summary of this chapter's content.",
      "startCharIndex": 0,
      "endCharIndex": 4500,
      "detectedMarker": "Chapter 1"
    }
  ],
  "bookSummary": "Overall summary of the entire manuscript.",
  "detectedGenre": "genre or empty string",
  "detectedPOV": "first-person | third-limited | third-omniscient | second-person | unknown",
  "detectedTense": "past | present | unknown"
}

IMPORTANT: startCharIndex and endCharIndex are CHARACTER offsets (not word offsets) in the manuscript text above. They must cover the entire text with no gaps or overlaps. The first chapter must start at 0 and the last chapter must end at the final character.`

  return { systemPrompt, userMessage }
}

export class ChapterSplitter {
  constructor(private ai: AIProvider) {}

  async split(text: string, targetWords: number): Promise<{
    chapters: ProposedChapter[]
    bookSummary: string
    detectedGenre: string
    detectedPOV: string
    detectedTense: string
  }> {
    const totalWords = text.split(/\s+/).length
    const { systemPrompt, userMessage } = buildSplittingPrompt(text, targetWords, totalWords)

    let parsed: SplitResult

    const response = await this.ai.complete({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.2,
      responseFormat: 'json',
      maxTokens: 8192
    })

    try {
      const cleaned = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned) as SplitResult
    } catch {
      // Retry with stricter instructions
      const retry = await this.ai.complete({
        systemPrompt:
          systemPrompt + '\n\nCRITICAL: Respond ONLY with valid JSON. No other text.',
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content:
              'That was not valid JSON. Please try again with ONLY the JSON object, no other text.'
          }
        ],
        temperature: 0.1,
        responseFormat: 'json',
        maxTokens: 8192
      })

      const retryContent = retry.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(retryContent) as SplitResult
    }

    const chapters = this.validateAndFixChapters(parsed, text)

    return {
      chapters,
      bookSummary: parsed.bookSummary || '',
      detectedGenre: parsed.detectedGenre || '',
      detectedPOV: parsed.detectedPOV || 'unknown',
      detectedTense: parsed.detectedTense || 'unknown'
    }
  }

  private validateAndFixChapters(parsed: SplitResult, fullText: string): ProposedChapter[] {
    if (!parsed.chapters || parsed.chapters.length === 0) {
      // Fallback: treat entire text as one chapter
      return [
        {
          index: 0,
          title: 'Chapter 1',
          summary: '',
          text: fullText,
          startCharIndex: 0,
          endCharIndex: fullText.length,
          wordCount: fullText.split(/\s+/).length,
          detectedMarker: null
        }
      ]
    }

    const chapters: ProposedChapter[] = parsed.chapters.map((ch, i) => {
      const start = Math.max(0, Math.min(ch.startCharIndex, fullText.length))
      const end = Math.max(start, Math.min(ch.endCharIndex, fullText.length))
      const text = fullText.slice(start, end)

      return {
        index: i,
        title: ch.title || `Chapter ${i + 1}`,
        summary: ch.summary || '',
        text,
        startCharIndex: start,
        endCharIndex: end,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        detectedMarker: ch.detectedMarker || null
      }
    })

    // Fix gaps: ensure chapters are contiguous
    for (let i = 1; i < chapters.length; i++) {
      if (chapters[i].startCharIndex !== chapters[i - 1].endCharIndex) {
        chapters[i].startCharIndex = chapters[i - 1].endCharIndex
        chapters[i].text = fullText.slice(chapters[i].startCharIndex, chapters[i].endCharIndex)
        chapters[i].wordCount = chapters[i].text.split(/\s+/).filter(Boolean).length
      }
    }

    // Ensure first starts at 0
    if (chapters[0].startCharIndex !== 0) {
      chapters[0].startCharIndex = 0
      chapters[0].text = fullText.slice(0, chapters[0].endCharIndex)
      chapters[0].wordCount = chapters[0].text.split(/\s+/).filter(Boolean).length
    }

    // Ensure last ends at fullText.length
    const last = chapters[chapters.length - 1]
    if (last.endCharIndex !== fullText.length) {
      last.endCharIndex = fullText.length
      last.text = fullText.slice(last.startCharIndex, fullText.length)
      last.wordCount = last.text.split(/\s+/).filter(Boolean).length
    }

    return chapters
  }
}
