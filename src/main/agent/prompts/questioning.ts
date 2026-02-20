import type { BookManifest, IntentClassification } from '@shared/types'

/**
 * Build a prompt that asks the AI to generate smart clarifying questions
 * based on the user's intent and its clarity level.
 */
export function buildQuestioningPrompt(
  manifest: BookManifest,
  classification: IntentClassification,
  openChapterId: string | null
): string {
  const openChapter = openChapterId
    ? manifest.chapters.find((ch) => ch.id === openChapterId)
    : null

  const questionCount = classification.clarity === 'vague' ? '3 to 5' : '1 to 2'

  return `You are a smart writing assistant that asks targeted clarifying questions before executing a task. Your goal is to gather just enough information to proceed confidently.

## CONTEXT
Book: "${manifest.title}" by ${manifest.author}
Genre: ${manifest.style.genre || 'not specified'}
POV: ${manifest.style.pov || 'not specified'}
Tense: ${manifest.style.tense || 'not specified'}
Total chapters: ${manifest.chapters.length}
${openChapter ? `Currently open: [${openChapter.id}] "${openChapter.title}" (${openChapter.wordCount} words, ${openChapter.status})` : 'No chapter open'}

## TASK CLASSIFICATION
Intent: ${classification.intent}
Clarity: ${classification.clarity}
Scope: ${classification.scope}

## YOUR JOB
Generate ${questionCount} clarifying questions that will help you execute the user's request effectively. The questions should:

1. Fill in the gaps that the user's prompt left ambiguous
2. Be specific and actionable — not generic
3. Offer choices where possible (makes it easier for the user to answer)
4. Be ordered from most important to least important
5. Never ask about things already specified in the prompt or book metadata

## QUESTION TYPES
- "text": Free-form text answer (for open-ended questions)
- "choice": Single selection from options (for binary/few-option decisions)
- "multi-choice": Multiple selections allowed (for selecting multiple items)

## INTENT-SPECIFIC GUIDANCE

${getIntentGuidance(classification.intent)}

## RESPONSE FORMAT
Respond with ONLY a JSON array of question objects:

[
  {
    "id": "q1",
    "question": "The question text",
    "type": "text" | "choice" | "multi-choice",
    "options": ["option1", "option2"],
    "placeholder": "Hint text for text inputs",
    "required": true/false
  }
]

Keep questions concise and friendly. Use the author's book context to make questions relevant.`
}

function getIntentGuidance(intent: string): string {
  switch (intent) {
    case 'write_new':
      return `For NEW CONTENT creation, ask about:
- What should happen in the chapter/scene (main events, conflicts)
- Which characters appear and their roles
- The emotional arc or mood (tension building, revelation, calm before storm)
- Any specific scenes or moments the author envisions
- POV character (if the book uses multiple POVs)
- Where this fits in the narrative timeline
Do NOT ask about style/tone/tense — those are in the style guide.`

    case 'edit_existing':
      return `For EDITING existing content, ask about:
- What specifically feels wrong or could be improved
- Whether to preserve the current structure or rewrite freely
- The desired outcome or feeling after the edit
- Any specific passages or elements to focus on
Do NOT ask vague questions like "what do you want to change" — be specific.`

    case 'structural':
      return `For STRUCTURAL changes, ask about:
- Where exactly the split/merge point should be
- What the new chapter/section titles should be
- Whether existing narrative threads need adjustment
- If the author has a preference for chapter length`

    case 'planning':
      return `For PLANNING/BRAINSTORMING, ask about:
- What aspect to focus on (plot, characters, world, themes)
- How far ahead to plan (next chapter, next arc, full book)
- Any constraints or ideas the author already has
- Tone and direction for the upcoming content
- Key events or revelations they want to build toward`

    case 'feedback':
      return `For FEEDBACK/REVIEW, usually no questions needed. If the request is very broad, ask about:
- What aspects to focus the review on (pacing, consistency, prose quality, dialogue)
- Whether they want high-level feedback or line-by-line notes`

    case 'question':
    default:
      return `For QUESTIONS about the book, usually no questions needed. Just answer directly.`
  }
}
