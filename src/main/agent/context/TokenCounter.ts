export class TokenCounter {
  /**
   * Rough heuristic: 1 token ≈ 4 characters for English text.
   * This is intentionally conservative (overestimates slightly).
   */
  static estimate(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / 4)
  }

  /**
   * Estimate tokens for a word count.
   * Rough heuristic: 1 token ≈ 0.75 words
   */
  static fromWordCount(wordCount: number): number {
    return Math.ceil(wordCount * 1.3)
  }
}
