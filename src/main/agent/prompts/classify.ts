import type { BookManifest } from '@shared/types'

/**
 * Build a short system prompt for intent classification.
 * This is used as a fallback when heuristics are not confident.
 * The LLM returns a structured JSON classification.
 */
export function buildClassifyPrompt(
  manifest: BookManifest,
  openChapterId: string | null
): string {
  const chapterList = manifest.chapters
    .map(
      (ch, i) =>
        `${i + 1}. [${ch.id}] "${ch.title}" — ${ch.wordCount} words — ${ch.status}`
    )
    .join('\n')

  const openChapter = openChapterId
    ? manifest.chapters.find((ch) => ch.id === openChapterId)
    : null

  return `You are an intent classifier for a book writing assistant. Analyze the user's prompt and classify it.

## BOOK CONTEXT
Title: ${manifest.title}
Author: ${manifest.author}
Genre: ${manifest.style.genre || 'not specified'}
Total chapters: ${manifest.chapters.length}
${openChapter ? `Currently open chapter: [${openChapter.id}] "${openChapter.title}"` : 'No chapter currently open'}

Chapters:
${chapterList || '(no chapters yet)'}

## CLASSIFICATION SCHEMA
Respond with a JSON object containing:

{
  "intent": "write_new" | "edit_existing" | "structural" | "feedback" | "planning" | "question",
  "clarity": "clear" | "moderate" | "vague",
  "scope": "selection" | "section" | "chapter" | "multi-chapter" | "book",
  "targetChapters": ["ch-01", ...],
  "requiresApproval": true/false,
  "reasoning": "brief explanation of classification"
}

## INTENT DEFINITIONS
- **write_new**: User wants to create NEW content (new chapter, section, scene). Does not exist yet.
- **edit_existing**: User wants to MODIFY existing content (rewrite, improve, fix, expand, shorten).
- **structural**: User wants to REORGANIZE the book (split chapters, merge, reorder, convert to sections).
- **feedback**: User wants REVIEW or CRITIQUE without any changes (pacing analysis, consistency check, summary).
- **planning**: User wants to BRAINSTORM or PLAN (outline, character development, story arc, worldbuilding).
- **question**: User is asking a QUESTION about the book or its content (what color are X's eyes, when did Y happen).

## CLARITY DEFINITIONS
- **clear**: The request is specific enough to execute immediately (e.g., "fix the typo in chapter 3 paragraph 2").
- **moderate**: The request has some ambiguity but a reasonable default interpretation exists (e.g., "improve the dialogue in chapter 5").
- **vague**: The request is open-ended and needs clarification (e.g., "write the next chapter", "help me with my book").

## RULES
- If the user mentions a specific chapter, include it in targetChapters
- If no chapter is mentioned but one is open, include the open chapter
- requiresApproval should be true for write_new, edit_existing, and structural intents
- Respond with ONLY the JSON object, no other text`
}
