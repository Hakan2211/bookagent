import fs from 'fs/promises'
import { marked, type Token, type Tokens } from 'marked'
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  TableOfContents,
  TextRun,
  convertMillimetersToTwip,
  type IRunOptions,
  type ISectionOptions
} from 'docx'
import type { ExportConfig, ExportProgress, PageSize } from '@shared/types'
import type { BookProject } from '../project/BookProject'
import { ExportEngine } from './ExportEngine'

const PAGE_SIZES_MM: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  a5: { width: 148, height: 210 },
  '6x9': { width: 152.4, height: 228.6 }
}

const FONTS: Record<ExportConfig['fontFamily'], string> = {
  serif: 'Georgia',
  'sans-serif': 'Arial',
  monospace: 'Courier New'
}

type RunStyle = Pick<IRunOptions, 'bold' | 'italics' | 'strike'> & { code?: boolean }

/** Flatten marked inline tokens into styled TextRuns. */
function inlineRuns(tokens: Token[] | undefined, style: RunStyle = {}): TextRun[] {
  if (!tokens) return []
  const runs: TextRun[] = []
  for (const tok of tokens) {
    switch (tok.type) {
      case 'strong':
        runs.push(...inlineRuns((tok as Tokens.Strong).tokens, { ...style, bold: true }))
        break
      case 'em':
        runs.push(...inlineRuns((tok as Tokens.Em).tokens, { ...style, italics: true }))
        break
      case 'del':
        runs.push(...inlineRuns((tok as Tokens.Del).tokens, { ...style, strike: true }))
        break
      case 'codespan':
        runs.push(textRun(decode((tok as Tokens.Codespan).text), { ...style, code: true }))
        break
      case 'br':
        runs.push(new TextRun({ break: 1 }))
        break
      case 'link':
        runs.push(...inlineRuns((tok as Tokens.Link).tokens, style))
        break
      case 'text': {
        const t = tok as Tokens.Text
        if (t.tokens && t.tokens.length > 0) runs.push(...inlineRuns(t.tokens, style))
        else runs.push(textRun(decode(t.text), style))
        break
      }
      case 'escape':
        runs.push(textRun((tok as Tokens.Escape).text, style))
        break
      default:
        if ('text' in tok && typeof tok.text === 'string') runs.push(textRun(decode(tok.text), style))
    }
  }
  return runs
}

function textRun(text: string, style: RunStyle): TextRun {
  const { code, ...rest } = style
  return new TextRun({ text, ...rest, ...(code ? { font: 'Courier New' } : {}) })
}

/** marked HTML-escapes entities in text tokens; undo that for Word. */
function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

const SCENE_BREAK = (): Paragraph =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: '*   *   *', color: '888888' })]
  })

/** Convert one chapter's Markdown into Word paragraphs. */
export function markdownToParagraphs(markdown: string): Paragraph[] {
  const tokens = marked.lexer(markdown, { gfm: true })
  const out: Paragraph[] = []
  // First paragraph of a chapter / after a break or heading is not indented.
  let indentNext = false

  const walk = (list: Token[], quote = false, listLevel = -1, ordered = false): void => {
    for (const tok of list) {
      switch (tok.type) {
        case 'heading': {
          const h = tok as Tokens.Heading
          const level = [HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][
            Math.min(Math.max(h.depth - 1, 0), 2)
          ]
          out.push(new Paragraph({ heading: level, children: inlineRuns(h.tokens) }))
          indentNext = false
          break
        }
        case 'paragraph': {
          const p = tok as Tokens.Paragraph
          out.push(
            new Paragraph({
              style: quote ? 'BookQuote' : indentNext ? 'BookBody' : 'BookBodyFirst',
              children: inlineRuns(p.tokens)
            })
          )
          indentNext = !quote
          break
        }
        case 'blockquote':
          walk((tok as Tokens.Blockquote).tokens, true, listLevel, ordered)
          indentNext = false
          break
        case 'hr':
          out.push(SCENE_BREAK())
          indentNext = false
          break
        case 'list': {
          const l = tok as Tokens.List
          for (const item of l.items) {
            const level = listLevel + 1
            const [first, ...rest] = item.tokens
            const firstRuns =
              first && (first.type === 'text' || first.type === 'paragraph')
                ? inlineRuns((first as Tokens.Text).tokens ?? [first])
                : []
            out.push(
              new Paragraph({
                style: 'BookList',
                children: firstRuns,
                ...(l.ordered
                  ? { numbering: { reference: 'book-numbered', level } }
                  : { bullet: { level } })
              })
            )
            const remaining = firstRuns.length > 0 ? rest : item.tokens
            walk(remaining, quote, level, l.ordered)
          }
          indentNext = false
          break
        }
        case 'code': {
          const c = tok as Tokens.Code
          for (const line of c.text.split('\n')) {
            out.push(
              new Paragraph({
                style: 'BookBodyFirst',
                children: [new TextRun({ text: line, font: 'Courier New' })]
              })
            )
          }
          indentNext = false
          break
        }
        case 'text': {
          const t = tok as Tokens.Text
          out.push(
            new Paragraph({
              style: 'BookBodyFirst',
              children: inlineRuns(t.tokens ?? [t])
            })
          )
          break
        }
        case 'space':
          break
        default:
          if ('text' in tok && typeof tok.text === 'string' && tok.text.trim()) {
            out.push(
              new Paragraph({ style: 'BookBodyFirst', children: [new TextRun(decode(tok.text))] })
            )
          }
      }
    }
  }

  walk(tokens)
  return out
}

export class DocxExporter {
  static async export(
    project: BookProject,
    config: ExportConfig,
    outputPath: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    const progress = (stage: ExportProgress['stage'], percent: number, message: string) => {
      onProgress?.({ stage, percent, message })
    }

    try {
      progress('preparing', 10, 'Preparing chapters...')
      const isChapter = config.scope === 'chapter' && !!config.chapterId
      const chapters = await ExportEngine.getChaptersMarkdown(
        project,
        isChapter ? config.chapterId : undefined
      )
      const manifest = project.manifest

      progress('generating', 40, 'Building Word document...')
      const buffer = await Packer.toBuffer(buildDocument(config, manifest, chapters, isChapter))

      progress('saving', 90, 'Saving file...')
      await fs.writeFile(outputPath, buffer)
      progress('done', 100, 'DOCX exported successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      progress('error', 0, `Export failed: ${message}`)
      throw error
    }
  }
}

export function buildDocument(
  config: ExportConfig,
  manifest: { title: string; subtitle?: string; author: string; chapters: { id: string }[] },
  chapters: { title: string; markdown: string }[],
  isChapter: boolean
): Document {
  const page = PAGE_SIZES_MM[config.pageSize] ?? PAGE_SIZES_MM.a4
  const font = FONTS[config.fontFamily] ?? FONTS.serif
  const sizeHalfPts = Math.round(config.fontSize * 2)
  // Word "auto" line spacing is in 240ths of a line.
  const line = Math.round(config.lineSpacing * 240)
  const chapterIndex = isChapter
    ? Math.max(0, manifest.chapters.findIndex((c) => c.id === config.chapterId))
    : 0

  const pageProps: ISectionOptions['properties'] = {
    page: {
      size: {
        width: convertMillimetersToTwip(page.width),
        height: convertMillimetersToTwip(page.height)
      },
      margin: {
        top: convertMillimetersToTwip(config.margins.top),
        bottom: convertMillimetersToTwip(config.margins.bottom),
        left: convertMillimetersToTwip(config.margins.left),
        right: convertMillimetersToTwip(config.margins.right)
      }
    }
  }

  const smallGrey = { size: Math.max(16, sizeHalfPts - 4), color: '777777' }
  const header = config.headerText
    ? new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: config.headerText, ...smallGrey })]
          })
        ]
      })
    : undefined
  const footerChildren: TextRun[] = []
  if (config.footerText) footerChildren.push(new TextRun({ text: config.footerText, ...smallGrey }))
  if (config.showPageNumbers) {
    if (footerChildren.length) footerChildren.push(new TextRun({ text: '   ·   ', ...smallGrey }))
    footerChildren.push(new TextRun({ children: [PageNumber.CURRENT], ...smallGrey }))
  }
  const footer = footerChildren.length
    ? new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: footerChildren })]
      })
    : undefined

  const sections: ISectionOptions[] = []

  if (config.includeTitlePage && !isChapter) {
    sections.push({
      properties: pageProps,
      children: [
        new Paragraph({ spacing: { before: 3600 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: manifest.title, bold: true, size: sizeHalfPts * 2.4 })]
        }),
        ...(manifest.subtitle
          ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 480 },
                children: [
                  new TextRun({ text: manifest.subtitle, italics: true, size: sizeHalfPts * 1.3, color: '555555' })
                ]
              })
            ]
          : []),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480 },
          children: [new TextRun({ text: manifest.author.toUpperCase(), size: sizeHalfPts * 1.1, characterSpacing: 40 })]
        })
      ]
    })
  }

  if (config.includeTableOfContents && !isChapter && chapters.length > 1) {
    sections.push({
      properties: pageProps,
      headers: header ? { default: header } : undefined,
      footers: footer ? { default: footer } : undefined,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
          children: [new TextRun({ text: 'Contents', bold: true, size: sizeHalfPts * 1.6 })]
        }),
        new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-1' })
      ]
    })
  }

  const body: Paragraph[] = []
  chapters.forEach((ch, i) => {
    if (i > 0) body.push(new Paragraph({ children: [new PageBreak()] }))
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 120 },
        children: [
          new TextRun({
            text: `CHAPTER ${(isChapter ? chapterIndex : i) + 1}`,
            size: Math.round(sizeHalfPts * 0.85),
            color: '888888',
            characterSpacing: 60
          })
        ]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 },
        children: [new TextRun(ch.title)]
      })
    )
    const paras = ch.markdown.trim() ? markdownToParagraphs(ch.markdown) : []
    body.push(...(paras.length ? paras : [new Paragraph({ style: 'BookBodyFirst', children: [] })]))
  })

  sections.push({
    properties: pageProps,
    headers: header ? { default: header } : undefined,
    footers: footer ? { default: footer } : undefined,
    children: body
  })

  return new Document({
    title: manifest.title,
    creator: manifest.author,
    features: { updateFields: config.includeTableOfContents && !isChapter },
    numbering: {
      config: [
        {
          reference: 'book-numbered',
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } }
          }))
        }
      ]
    },
    styles: {
      default: {
        document: { run: { font, size: sizeHalfPts, color: '1A1A1A' }, paragraph: { spacing: { line } } },
        heading1: { run: { font, size: Math.round(sizeHalfPts * 1.8), bold: true, color: '111111' } },
        heading2: {
          run: { font, size: Math.round(sizeHalfPts * 1.4), bold: true, color: '111111' },
          paragraph: { spacing: { before: 360, after: 180 } }
        },
        heading3: {
          run: { font, size: Math.round(sizeHalfPts * 1.2), bold: true, color: '111111' },
          paragraph: { spacing: { before: 300, after: 160 } }
        },
        heading4: {
          run: { font, size: Math.round(sizeHalfPts * 1.05), bold: true, color: '111111' },
          paragraph: { spacing: { before: 240, after: 120 } }
        }
      },
      paragraphStyles: [
        {
          id: 'BookBodyFirst',
          name: 'Book Body (first)',
          basedOn: 'Normal',
          quickFormat: true,
          paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { line, after: 40 } }
        },
        {
          id: 'BookBody',
          name: 'Book Body',
          basedOn: 'BookBodyFirst',
          quickFormat: true,
          paragraph: { indent: { firstLine: convertMillimetersToTwip(7) } }
        },
        {
          id: 'BookQuote',
          name: 'Book Quote',
          basedOn: 'BookBodyFirst',
          run: { italics: true, color: '555555' },
          paragraph: { indent: { left: 720, right: 720 }, spacing: { before: 120, after: 120 } }
        },
        {
          id: 'BookList',
          name: 'Book List',
          basedOn: 'Normal',
          paragraph: { spacing: { line, after: 40 } }
        }
      ]
    },
    sections
  })
}
