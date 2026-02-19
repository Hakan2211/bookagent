import { marked } from 'marked'
import type { BookManifest, ExportConfig, PageSize } from '@shared/types'
import type { BookProject } from '../project/BookProject'

// ── Page dimensions in mm ────────────────────

const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
  a5: { width: 148, height: 210 },
  '6x9': { width: 152, height: 229 }
}

// ── Font stacks ──────────────────────────────

const FONT_STACKS: Record<string, string> = {
  serif: "'Georgia', 'Lora', 'Times New Roman', serif",
  'sans-serif': "'Inter', 'Helvetica Neue', 'Arial', sans-serif",
  monospace: "'Courier New', 'Consolas', monospace"
}

// ── Markdown → HTML setup ────────────────────

function configureMarked(): void {
  marked.setOptions({
    gfm: true,
    breaks: false
  })
}

// ── Chapter data extraction ──────────────────

interface ChapterData {
  id: string
  title: string
  html: string
  wordCount: number
}

function isSectionedChapter(meta: { file: string; sections?: unknown[] }): boolean {
  // A chapter is sectioned if it has sections or if its file path points to a directory (no .md extension)
  if (meta.sections && meta.sections.length > 0) return true
  if (!meta.file.endsWith('.md')) return true
  return false
}

async function readAllChapters(project: BookProject): Promise<ChapterData[]> {
  configureMarked()
  const chapters: ChapterData[] = []

  for (const meta of project.manifest.chapters) {
    if (isSectionedChapter(meta) && meta.sections && meta.sections.length > 0) {
      // Sectioned chapter: concatenate all sections
      let combinedMd = ''
      for (const section of meta.sections) {
        const sectionContent = await project.readSection(meta.id, section.id)
        if (combinedMd) combinedMd += '\n\n---\n\n'
        combinedMd += sectionContent
      }
      chapters.push({
        id: meta.id,
        title: meta.title,
        html: await marked.parse(combinedMd),
        wordCount: meta.wordCount
      })
    } else if (isSectionedChapter(meta)) {
      // Sectioned chapter directory but no sections populated — skip gracefully
      chapters.push({
        id: meta.id,
        title: meta.title,
        html: '<p><em>(Empty chapter)</em></p>',
        wordCount: 0
      })
    } else {
      try {
        const content = await project.readChapter(meta.id)
        chapters.push({
          id: meta.id,
          title: meta.title,
          html: await marked.parse(content),
          wordCount: meta.wordCount
        })
      } catch (err: unknown) {
        // If readChapter fails (e.g. EISDIR), skip gracefully
        const code = (err as { code?: string })?.code
        if (code === 'EISDIR') {
          chapters.push({
            id: meta.id,
            title: meta.title,
            html: '<p><em>(Empty chapter)</em></p>',
            wordCount: 0
          })
        } else {
          throw err
        }
      }
    }
  }

  return chapters
}

async function readSingleChapter(
  project: BookProject,
  chapterId: string
): Promise<ChapterData> {
  configureMarked()
  const meta = project.manifest.chapters.find((ch) => ch.id === chapterId)
  if (!meta) throw new Error(`Chapter "${chapterId}" not found`)

  if (isSectionedChapter(meta) && meta.sections && meta.sections.length > 0) {
    let combinedMd = ''
    for (const section of meta.sections) {
      const sectionContent = await project.readSection(meta.id, section.id)
      if (combinedMd) combinedMd += '\n\n---\n\n'
      combinedMd += sectionContent
    }
    return {
      id: meta.id,
      title: meta.title,
      html: await marked.parse(combinedMd),
      wordCount: meta.wordCount
    }
  }

  if (isSectionedChapter(meta)) {
    return {
      id: meta.id,
      title: meta.title,
      html: '<p><em>(Empty chapter)</em></p>',
      wordCount: 0
    }
  }

  try {
    const content = await project.readChapter(chapterId)
    return {
      id: meta.id,
      title: meta.title,
      html: await marked.parse(content),
      wordCount: meta.wordCount
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'EISDIR') {
      return {
        id: meta.id,
        title: meta.title,
        html: '<p><em>(Empty chapter)</em></p>',
        wordCount: 0
      }
    }
    throw err
  }
}

// ── CSS generation ───────────────────────────

function buildCSS(config: ExportConfig): string {
  const page = PAGE_SIZES[config.pageSize]
  const { top, bottom, left, right } = config.margins
  const fontStack = FONT_STACKS[config.fontFamily] || FONT_STACKS.serif

  return `
    @page {
      size: ${page.width}mm ${page.height}mm;
      margin: ${top}mm ${right}mm ${bottom}mm ${left}mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      font-family: ${fontStack};
      font-size: ${config.fontSize}pt;
      line-height: ${config.lineSpacing};
      color: #1a1a1a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Title page ────────────────────────── */

    .title-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      page-break-after: always;
      break-after: page;
      padding: 20% 10%;
    }

    .title-page h1 {
      font-size: 2.4em;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.3em;
      color: #111;
    }

    .title-page .subtitle {
      font-size: 1.2em;
      font-weight: 400;
      color: #555;
      margin-bottom: 1.5em;
      font-style: italic;
    }

    .title-page .author {
      font-size: 1.1em;
      font-weight: 500;
      color: #333;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .title-page .divider {
      width: 60px;
      height: 2px;
      background: #ccc;
      margin: 1.5em auto;
    }

    /* ── Table of contents ─────────────────── */

    .toc {
      page-break-after: always;
      break-after: page;
      padding: 2em 0;
    }

    .toc h2 {
      font-size: 1.6em;
      font-weight: 600;
      margin-bottom: 1.5em;
      color: #111;
      text-align: center;
    }

    .toc-entry {
      display: flex;
      align-items: baseline;
      padding: 0.4em 0;
      border-bottom: 1px dotted #ddd;
    }

    .toc-entry .toc-num {
      font-weight: 600;
      min-width: 2.5em;
      color: #666;
    }

    .toc-entry .toc-title {
      flex: 1;
      color: #222;
    }

    /* ── Chapter content ───────────────────── */

    .chapter {
      page-break-before: always;
      break-before: page;
      padding-top: 3em;
    }

    .chapter:first-of-type {
      page-break-before: auto;
      break-before: auto;
    }

    .chapter-heading {
      text-align: center;
      margin-bottom: 2.5em;
    }

    .chapter-heading .chapter-label {
      font-size: 0.85em;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #888;
      margin-bottom: 0.5em;
    }

    .chapter-heading h2 {
      font-size: 1.8em;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.01em;
    }

    .chapter-heading .heading-rule {
      width: 40px;
      height: 2px;
      background: #ccc;
      margin: 1em auto 0;
    }

    /* ── Prose typography ──────────────────── */

    .chapter-body p {
      text-indent: 1.5em;
      margin-bottom: 0.2em;
      text-align: justify;
      hyphens: auto;
      -webkit-hyphens: auto;
    }

    .chapter-body p:first-child,
    .chapter-body hr + p,
    .chapter-body h1 + p,
    .chapter-body h2 + p,
    .chapter-body h3 + p,
    .chapter-body blockquote + p {
      text-indent: 0;
    }

    .chapter-body h1,
    .chapter-body h2,
    .chapter-body h3 {
      margin: 1.5em 0 0.8em;
      font-weight: 600;
      color: #111;
    }

    .chapter-body h1 { font-size: 1.5em; }
    .chapter-body h2 { font-size: 1.3em; }
    .chapter-body h3 { font-size: 1.1em; }

    .chapter-body blockquote {
      margin: 1.2em 2em;
      padding-left: 1em;
      border-left: 3px solid #ddd;
      color: #555;
      font-style: italic;
    }

    .chapter-body hr {
      border: none;
      text-align: center;
      margin: 2em 0;
      page-break-inside: avoid;
    }

    .chapter-body hr::after {
      content: "* * *";
      color: #aaa;
      font-size: 1em;
      letter-spacing: 0.5em;
    }

    .chapter-body ul,
    .chapter-body ol {
      margin: 0.8em 0 0.8em 2em;
    }

    .chapter-body li {
      margin-bottom: 0.3em;
    }

    .chapter-body em {
      font-style: italic;
    }

    .chapter-body strong {
      font-weight: 700;
    }

    /* ── Preview-specific (simulated pages) ─── */

    .preview-mode .chapter {
      background: #fff;
      box-shadow: 0 2px 20px rgba(0,0,0,0.12);
      margin: 2em auto;
      padding: 60px 70px;
      max-width: ${page.width}mm;
      min-height: ${page.height * 0.6}mm;
      border-radius: 2px;
    }

    .preview-mode .title-page {
      background: #fff;
      box-shadow: 0 2px 20px rgba(0,0,0,0.12);
      margin: 2em auto;
      padding: 60px 70px;
      max-width: ${page.width}mm;
      min-height: ${page.height * 0.8}mm;
      border-radius: 2px;
    }

    .preview-mode .toc {
      background: #fff;
      box-shadow: 0 2px 20px rgba(0,0,0,0.12);
      margin: 2em auto;
      padding: 60px 70px;
      max-width: ${page.width}mm;
      min-height: ${page.height * 0.4}mm;
      border-radius: 2px;
    }

    .preview-mode body, .preview-mode html {
      background: #e8e8e8;
    }
  `
}

// ── HTML document assembly ───────────────────

function buildTitlePage(manifest: BookManifest): string {
  return `
    <div class="title-page">
      <h1>${escapeHtml(manifest.title)}</h1>
      ${manifest.subtitle ? `<div class="subtitle">${escapeHtml(manifest.subtitle)}</div>` : ''}
      <div class="divider"></div>
      <div class="author">${escapeHtml(manifest.author)}</div>
    </div>
  `
}

function buildTableOfContents(chapters: ChapterData[]): string {
  const entries = chapters
    .map(
      (ch, i) => `
      <div class="toc-entry">
        <span class="toc-num">${i + 1}.</span>
        <span class="toc-title">${escapeHtml(ch.title)}</span>
      </div>
    `
    )
    .join('')

  return `
    <div class="toc">
      <h2>Contents</h2>
      ${entries}
    </div>
  `
}

function buildChapterHtml(chapter: ChapterData, index: number): string {
  return `
    <div class="chapter" id="chapter-${chapter.id}">
      <div class="chapter-heading">
        <div class="chapter-label">Chapter ${index + 1}</div>
        <h2>${escapeHtml(chapter.title)}</h2>
        <div class="heading-rule"></div>
      </div>
      <div class="chapter-body">
        ${chapter.html}
      </div>
    </div>
  `
}

function wrapInDocument(
  css: string,
  body: string,
  isPreview: boolean = false
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body class="${isPreview ? 'preview-mode' : ''}">
  ${body}
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Public API ───────────────────────────────

export class ExportEngine {
  /**
   * Assemble full book as styled HTML document.
   */
  static async assembleBookHtml(
    project: BookProject,
    config: ExportConfig,
    isPreview: boolean = false
  ): Promise<string> {
    const chapters = await readAllChapters(project)
    const css = buildCSS(config)

    let body = ''
    if (config.includeTitlePage) {
      body += buildTitlePage(project.manifest)
    }
    if (config.includeTableOfContents && chapters.length > 1) {
      body += buildTableOfContents(chapters)
    }
    body += chapters.map((ch, i) => buildChapterHtml(ch, i)).join('')

    return wrapInDocument(css, body, isPreview)
  }

  /**
   * Assemble a single chapter as styled HTML document.
   */
  static async assembleChapterHtml(
    project: BookProject,
    chapterId: string,
    config: ExportConfig,
    isPreview: boolean = false
  ): Promise<string> {
    const chapter = await readSingleChapter(project, chapterId)
    const index = project.manifest.chapters.findIndex((ch) => ch.id === chapterId)
    const css = buildCSS(config)
    const body = buildChapterHtml(chapter, index >= 0 ? index : 0)

    return wrapInDocument(css, body, isPreview)
  }

  /**
   * Get chapter data suitable for EPUB generation (per-chapter HTML bodies).
   */
  static async getChaptersForEpub(
    project: BookProject,
    chapterId?: string
  ): Promise<{ title: string; html: string }[]> {
    configureMarked()

    if (chapterId) {
      const ch = await readSingleChapter(project, chapterId)
      return [{ title: ch.title, html: ch.html }]
    }

    const chapters = await readAllChapters(project)
    return chapters.map((ch) => ({ title: ch.title, html: ch.html }))
  }
}
