import type { BookManifest } from '@shared/types'

export function buildOutliningPrompt(manifest: BookManifest): string {
  const chapterList = manifest.chapters
    .map(
      (ch, i) =>
        `${i + 1}. "${ch.title}" (${ch.wordCount} words) — ${ch.summary || 'no summary'}`
    )
    .join('\n')

  return `Generate a structured outline for the book "${manifest.title}" by ${manifest.author}.

Current chapters:
${chapterList}

Create a markdown outline that includes:
1. A one-paragraph book overview
2. For each chapter: the chapter number, title, and a 2-3 sentence summary of key events
3. Key narrative threads and where they appear
4. Character arcs across the book

Format as clean markdown with headings and bullet points.`
}
