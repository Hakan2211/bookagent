import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { Packer } from 'docx'
import { buildDocument } from '../../src/main/export/DocxExporter'
import type { ExportConfig } from '../../src/shared/types'

const config: ExportConfig = {
  format: 'docx',
  scope: 'book',
  pageSize: '6x9',
  fontFamily: 'serif',
  fontSize: 11,
  lineSpacing: 1.5,
  margins: { top: 20, bottom: 20, left: 18, right: 18 },
  includeTableOfContents: true,
  includeTitlePage: true,
  headerText: 'The Salt Road',
  footerText: 'A. Writer',
  showPageNumbers: true
}

const manifest = {
  title: 'The Salt Road',
  subtitle: 'A novel',
  author: 'A. Writer',
  chapters: [{ id: 'ch1' }, { id: 'ch2' }]
}

async function documentXml(cfg: ExportConfig, chapters: { title: string; markdown: string }[], isChapter = false) {
  const buf = await Packer.toBuffer(buildDocument(cfg, manifest, chapters, isChapter))
  const zip = await JSZip.loadAsync(buf)
  return {
    doc: await zip.file('word/document.xml')!.async('string'),
    files: Object.keys(zip.files)
  }
}

describe('DocxExporter', () => {
  it('writes title page, chapters and inline formatting', async () => {
    const { doc, files } = await documentXml(config, [
      { title: 'Arrival', markdown: 'She came **at dawn** with *nothing* & no one.\n\nSecond para.\n\n---\n\n> A quote\n\n- one\n- two' },
      { title: 'Departure', markdown: '## A scene\n\nText "quoted".' }
    ])
    expect(doc).toContain('The Salt Road')
    expect(doc).toContain('A. WRITER')
    expect(doc).toContain('CHAPTER 1')
    expect(doc).toContain('CHAPTER 2')
    expect(doc).toContain('at dawn')
    expect(doc).toContain('<w:b/>')
    expect(doc).toContain('<w:i/>')
    expect(doc).toContain('&amp; no one.')
    expect(doc).toMatch(/Text ("|&quot;)quoted("|&quot;)./)
    expect(doc).toContain('*   *   *')
    expect(doc).toContain('BookQuote')
    expect(doc).toContain('BookBody"') // indented second paragraph
    expect(doc).toContain('TOC')
    expect(files.some((f) => f.startsWith('word/header'))).toBe(true)
    expect(files.some((f) => f.startsWith('word/footer'))).toBe(true)
  })

  it('single chapter export skips title page and TOC and keeps chapter number', async () => {
    const { doc } = await documentXml(
      { ...config, scope: 'chapter', chapterId: 'ch2' },
      [{ title: 'Departure', markdown: 'Only this.' }],
      true
    )
    expect(doc).not.toContain('A. WRITER')
    expect(doc).not.toContain('TOC')
    expect(doc).toContain('CHAPTER 2')
  })

  it('handles empty chapters', async () => {
    const { doc } = await documentXml({ ...config, includeTableOfContents: false }, [
      { title: 'Blank', markdown: '' }
    ])
    expect(doc).toContain('Blank')
  })
})
