import type { BookProject } from '../../project/BookProject'

const NUMBER_WORDS = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty'
]

export function detectTargetChapters(
  prompt: string,
  project: BookProject,
  openChapterId: string | null
): string[] {
  const targets = new Set<string>()
  const promptLower = prompt.toLowerCase()

  // 1. Explicit chapter references
  for (const ch of project.manifest.chapters) {
    const num = parseInt(ch.id.replace('ch-', ''), 10)

    const patterns: string[] = [
      `chapter ${num}`,
      `ch ${num}`,
      `ch-${String(num).padStart(2, '0')}`,
      `chapter${num}`
    ]

    if (num >= 1 && num <= 20) {
      patterns.push(`chapter ${NUMBER_WORDS[num - 1]}`)
    }

    if (patterns.some(p => promptLower.includes(p))) {
      targets.add(ch.id)
      continue
    }

    // Match by title
    if (ch.title && promptLower.includes(ch.title.toLowerCase())) {
      targets.add(ch.id)
    }
  }

  // 2. Keywords suggesting current chapter
  const currentChapterKeywords = [
    'this chapter', 'this section', 'this part',
    'current chapter', 'the chapter'
  ]

  if (openChapterId && currentChapterKeywords.some(k => promptLower.includes(k))) {
    targets.add(openChapterId)
  }

  // 3. Keywords suggesting whole book (no specific target)
  const wholeBookKeywords = [
    'whole book', 'entire book', 'all chapters', 'every chapter',
    'throughout', 'the book', 'overall'
  ]

  if (wholeBookKeywords.some(k => promptLower.includes(k))) {
    return [] // Agent will work with summaries only
  }

  // 4. Fallback: if no chapters detected, use the currently open chapter
  if (targets.size === 0 && openChapterId) {
    targets.add(openChapterId)
  }

  return Array.from(targets)
}
