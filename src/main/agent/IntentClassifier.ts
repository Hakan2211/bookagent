import type {
  AIProvider,
  AgentIntent,
  AgentClarity,
  AgentScope,
  IntentClassification,
  BookManifest
} from '@shared/types'
import { buildClassifyPrompt } from './prompts/classify'

/**
 * Hybrid intent classifier that uses heuristics first and falls back
 * to an LLM call for ambiguous prompts.
 */
export class IntentClassifier {
  constructor(private ai: AIProvider) {}

  /**
   * Classify a user prompt into intent, clarity, and scope.
   * Uses fast heuristics first; falls back to LLM for ambiguous cases.
   */
  async classify(
    prompt: string,
    manifest: BookManifest,
    openChapterId: string | null
  ): Promise<IntentClassification> {
    // Try heuristic classification first
    const heuristic = this.heuristicClassify(prompt, manifest, openChapterId)

    if (heuristic.clarity !== 'vague') {
      // Heuristics were confident enough
      return heuristic
    }

    // For vague prompts, use the LLM for more accurate classification
    try {
      return await this.llmClassify(prompt, manifest, openChapterId)
    } catch {
      // If LLM fails, fall back to heuristic result
      return heuristic
    }
  }

  /**
   * Fast heuristic-based classification using keyword matching and patterns.
   */
  private heuristicClassify(
    prompt: string,
    manifest: BookManifest,
    openChapterId: string | null
  ): IntentClassification {
    const p = prompt.toLowerCase().trim()
    const hasChapters = manifest.chapters.length > 0

    // Detect intent from keywords
    const intent = this.detectIntent(p, hasChapters)

    // Detect clarity based on how specific the prompt is
    const clarity = this.detectClarity(p, intent)

    // Detect scope
    const scope = this.detectScope(p, openChapterId, manifest)

    // Detect target chapters
    const targetChapters = this.detectTargetChapterIds(p, manifest, openChapterId)

    // Determine if approval is needed
    const requiresApproval = ['write_new', 'edit_existing', 'structural'].includes(intent)

    return {
      intent,
      clarity,
      scope,
      targetChapters,
      requiresApproval,
      reasoning: `Heuristic: detected "${intent}" intent with "${clarity}" clarity`
    }
  }

  /**
   * LLM-based classification for ambiguous prompts. Uses a short, cheap call.
   */
  private async llmClassify(
    prompt: string,
    manifest: BookManifest,
    openChapterId: string | null
  ): Promise<IntentClassification> {
    const systemPrompt = buildClassifyPrompt(manifest, openChapterId)

    const response = await this.ai.complete({
      systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 512,
      responseFormat: 'json'
    })

    const parsed = JSON.parse(response.content)

    return {
      intent: parsed.intent || 'question',
      clarity: parsed.clarity || 'moderate',
      scope: parsed.scope || 'chapter',
      targetChapters: parsed.targetChapters || [],
      requiresApproval: parsed.requiresApproval ?? true,
      reasoning: parsed.reasoning || 'LLM classification'
    }
  }

  // ── Heuristic helpers ────────────────────────

  private detectIntent(prompt: string, hasChapters: boolean): AgentIntent {
    // Question patterns
    const questionPatterns = [
      /^(what|who|where|when|why|how|is|are|was|were|do|does|did|can|could|would|will|shall|should)\b/,
      /\?$/
    ]
    if (questionPatterns.some((p) => p.test(prompt)) && !this.hasActionVerb(prompt)) {
      return 'question'
    }

    // Feedback / review patterns
    const feedbackKeywords = [
      'review', 'check', 'analyze', 'critique', 'assess', 'evaluate',
      'feedback', 'inconsistenc', 'plot hole', 'pacing', 'how is', 'how\'s',
      'what do you think', 'summarize', 'summary'
    ]
    if (feedbackKeywords.some((k) => prompt.includes(k)) && !this.hasEditVerb(prompt)) {
      return 'feedback'
    }

    // Structural patterns
    const structuralKeywords = [
      'split', 'merge', 'combine', 'reorder', 'move', 'reorganize',
      'restructure', 'rearrange', 'swap', 'convert to section'
    ]
    if (structuralKeywords.some((k) => prompt.includes(k))) {
      return 'structural'
    }

    // Planning patterns
    const planningKeywords = [
      'outline', 'plan', 'brainstorm', 'develop character', 'develop the character',
      'character development', 'world build', 'worldbuild', 'arc', 'plot structure',
      'help me think', 'ideas for', 'what should happen', 'where should',
      'map out', 'story structure'
    ]
    if (planningKeywords.some((k) => prompt.includes(k))) {
      return 'planning'
    }

    // Write new patterns
    const writeNewKeywords = [
      'write', 'create', 'add', 'new chapter', 'new section', 'next chapter',
      'first chapter', 'opening', 'prologue', 'epilogue', 'draft', 'start writing',
      'write me', 'generate'
    ]
    if (writeNewKeywords.some((k) => prompt.includes(k)) && !hasChapters) {
      return 'write_new'
    }
    if (writeNewKeywords.some((k) => prompt.includes(k))) {
      // If they say "write" but there's already content, check if it's "new" or "edit"
      const isNew = ['new', 'create', 'add', 'next', 'first', 'prologue', 'epilogue'].some(
        (k) => prompt.includes(k)
      )
      if (isNew) return 'write_new'
    }

    // Edit patterns
    const editKeywords = [
      'edit', 'fix', 'rewrite', 'revise', 'improve', 'change', 'update',
      'modify', 'adjust', 'correct', 'refine', 'polish', 'rework', 'tweak',
      'expand', 'shorten', 'condense', 'make more', 'make less', 'make it',
      'add more', 'remove', 'replace', 'enhance', 'strengthen', 'tighten',
      'dialogue', 'foreshadowing', 'description'
    ]
    if (editKeywords.some((k) => prompt.includes(k))) {
      return 'edit_existing'
    }

    // Default: if no chapters exist, likely wants to write; otherwise vague
    if (!hasChapters) return 'write_new'

    // Fallback to edit if a chapter is mentioned, otherwise question
    if (this.mentionsChapter(prompt)) return 'edit_existing'
    return 'question'
  }

  private detectClarity(prompt: string, intent: AgentIntent): AgentClarity {
    const wordCount = prompt.split(/\s+/).length

    // Very short prompts are usually clear commands
    if (wordCount <= 5 && intent !== 'write_new') return 'clear'

    // Questions and feedback are usually clear enough
    if (intent === 'question' || intent === 'feedback') return 'clear'

    // Check for specificity indicators
    const specificityIndicators = [
      /chapter \d+/i,                    // mentions a chapter number
      /section \d+/i,                    // mentions a section
      /paragraph \d+/i,                  // mentions a paragraph
      /line \d+/i,                       // mentions a line
      /"[^"]+"/,                         // quotes specific text
      /the (scene|dialogue|paragraph|sentence) (where|about|with)/i, // specific reference
      /typo|spelling|grammar/i,          // very specific edit type
      /change .+ to .+/i,               // explicit substitution
    ]

    const specificCount = specificityIndicators.filter((p) => p.test(prompt)).length

    if (specificCount >= 2) return 'clear'
    if (specificCount === 1 && wordCount < 20) return 'clear'
    if (specificCount === 1) return 'moderate'

    // Long, vague prompts for write_new
    if (intent === 'write_new' && wordCount < 15) return 'vague'
    if (intent === 'write_new' && wordCount >= 15) return 'moderate'

    // Edit requests without specificity
    if (intent === 'edit_existing' && wordCount < 10) return 'moderate'
    if (intent === 'structural') return 'moderate'

    // Planning is inherently vague
    if (intent === 'planning' && wordCount < 20) return 'vague'

    return 'moderate'
  }

  private detectScope(
    prompt: string,
    openChapterId: string | null,
    manifest: BookManifest
  ): AgentScope {
    const wholeBookKeywords = [
      'whole book', 'entire book', 'all chapters', 'the book', 'my book',
      'every chapter', 'across the book', 'full book', 'throughout'
    ]
    if (wholeBookKeywords.some((k) => prompt.includes(k))) return 'book'

    // Multi-chapter
    const multiChapterPattern = /chapters?\s+\d+\s*(,|and|to|-|through)\s*\d+/i
    if (multiChapterPattern.test(prompt)) return 'multi-chapter'
    if (prompt.includes('next few chapters') || prompt.includes('next three') || prompt.includes('next 3')) {
      return 'multi-chapter'
    }

    // Section level
    if (prompt.includes('section') || prompt.includes('scene')) return 'section'

    // If a specific chapter is mentioned or one is open, it's chapter scope
    if (this.mentionsChapter(prompt) || openChapterId) return 'chapter'

    // Default based on whether there are chapters
    if (manifest.chapters.length === 0) return 'book'
    return 'chapter'
  }

  private detectTargetChapterIds(
    prompt: string,
    manifest: BookManifest,
    openChapterId: string | null
  ): string[] {
    const targets: string[] = []

    for (const ch of manifest.chapters) {
      const num = parseInt(ch.id.replace('ch-', ''), 10)
      const patterns = [
        `chapter ${num}`,
        `ch ${num}`,
        `ch-${String(num).padStart(2, '0')}`,
        `chapter${num}`
      ]

      if (patterns.some((p) => prompt.toLowerCase().includes(p))) {
        targets.push(ch.id)
        continue
      }

      if (ch.title && prompt.toLowerCase().includes(ch.title.toLowerCase())) {
        targets.push(ch.id)
      }
    }

    // If no explicit chapters found, default to open chapter
    if (targets.length === 0 && openChapterId) {
      targets.push(openChapterId)
    }

    return targets
  }

  private hasActionVerb(prompt: string): boolean {
    const actionVerbs = [
      'write', 'create', 'edit', 'fix', 'rewrite', 'add', 'remove',
      'change', 'update', 'improve', 'expand', 'shorten'
    ]
    return actionVerbs.some((v) => prompt.includes(v))
  }

  private hasEditVerb(prompt: string): boolean {
    const editVerbs = ['fix', 'edit', 'rewrite', 'change', 'improve', 'update']
    return editVerbs.some((v) => prompt.includes(v))
  }

  private mentionsChapter(prompt: string): boolean {
    return /chapter\s*\d+|ch[\s-]\d+|this chapter|current chapter|the chapter/i.test(prompt)
  }
}
