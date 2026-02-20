import type { AIProvider } from '@shared/types'
import type { BookProject } from '../project/BookProject'

export type InlineEditAction =
  | 'rewrite'
  | 'change-tone'
  | 'expand'
  | 'shorten'
  | 'continue'
  | 'custom'

export interface InlineEditRequest {
  selectedText: string
  action: InlineEditAction
  customPrompt?: string
  /** Surrounding context: text before the selection */
  contextBefore: string
  /** Surrounding context: text after the selection */
  contextAfter: string
}

const ACTION_INSTRUCTIONS: Record<InlineEditAction, string> = {
  rewrite:
    'Rewrite the selected text to improve clarity, flow, and prose quality while preserving the meaning and voice.',
  'change-tone':
    'Rewrite the selected text with a more engaging, vivid tone. Adjust the emotional register while keeping the core meaning.',
  expand:
    'Expand the selected text with more detail, description, or depth. Add sensory details, inner thoughts, or world-building as appropriate.',
  shorten:
    'Condense the selected text to be more concise while preserving the key meaning and impact. Remove redundancy.',
  continue:
    'Continue writing naturally from where the selected text ends. Match the existing style and voice seamlessly.',
  custom: '' // Will be overridden by customPrompt
}

function buildInlineEditPrompt(
  request: InlineEditRequest,
  project: BookProject
): string {
  const style = project.manifest.style
  const actionInstruction =
    request.action === 'custom' && request.customPrompt
      ? request.customPrompt
      : ACTION_INSTRUCTIONS[request.action]

  return `You are a skilled fiction editor working on a book.

## STYLE GUIDE
- Genre: ${style.genre || 'not specified'}
- Point of View: ${style.pov || 'not specified'}
- Tense: ${style.tense || 'not specified'}
- Tone: ${style.tone || 'not specified'}
- Words to avoid: ${style.avoidWords.length > 0 ? style.avoidWords.join(', ') : 'none'}
${style.customInstructions ? `- Custom instructions: ${style.customInstructions}` : ''}

## TASK
${actionInstruction}

## CONTEXT (before selection)
${request.contextBefore || '(start of text)'}

## SELECTED TEXT
${request.selectedText}

## CONTEXT (after selection)
${request.contextAfter || '(end of text)'}

## RULES
- Output ONLY the rewritten/edited text that replaces the selection
- Do NOT include any explanation, commentary, or markdown formatting
- Do NOT include the surrounding context — only the replacement text
- Match the existing writing style, POV, and tense exactly
- Preserve character names, proper nouns, and established facts`
}

/**
 * Stream an inline edit rewrite from the AI provider.
 * Yields text chunks as they arrive. The full accumulated text is the replacement.
 */
export async function* streamInlineEdit(
  request: InlineEditRequest,
  project: BookProject,
  ai: AIProvider,
  signal?: AbortSignal
): AsyncGenerator<{ type: 'text'; text: string } | { type: 'done'; fullText: string }> {
  const systemPrompt = buildInlineEditPrompt(request, project)
  let fullText = ''

  const stream = ai.stream({
    systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Please ${request.action === 'custom' ? 'apply the requested edit to' : request.action} the selected text.`
      }
    ],
    temperature: 0.7,
    maxTokens: 4096,
    signal
  })

  for await (const chunk of stream) {
    if (chunk.type === 'text_delta' && chunk.text) {
      fullText += chunk.text
      yield { type: 'text', text: chunk.text }
    }
    if (chunk.type === 'done') {
      break
    }
  }

  yield { type: 'done', fullText: fullText.trim() }
}
