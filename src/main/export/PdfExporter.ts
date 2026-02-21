import { BrowserWindow, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import type { ExportConfig, ExportProgress, PageSize } from '@shared/types'
import type { BookProject } from '../project/BookProject'
import { ExportEngine } from './ExportEngine'

// ── Page sizes in inches (printToPDF uses inches) ──

const PAGE_INCHES: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 8.27, height: 11.69 },
  letter: { width: 8.5, height: 11 },
  a5: { width: 5.83, height: 8.27 },
  '6x9': { width: 6, height: 9 }
}

function buildHeaderTemplate(config: ExportConfig): string {
  if (!config.headerText) return '<span></span>'
  return `<span style="font-size:9px; color:#888; width:100%; text-align:center; font-family:Georgia,serif;">${config.headerText}</span>`
}

function buildFooterTemplate(config: ExportConfig): string {
  const parts: string[] = []

  if (config.footerText) {
    parts.push(
      `<span style="font-size:9px; color:#888; font-family:Georgia,serif;">${config.footerText}</span>`
    )
  }

  if (config.showPageNumbers) {
    parts.push(
      `<span style="font-size:9px; color:#888; font-family:Georgia,serif;" class="pageNumber"></span>`
    )
  }

  if (parts.length === 0) return '<span></span>'

  if (parts.length === 1) {
    return `<div style="width:100%; text-align:center; margin:0 auto;">${parts[0]}</div>`
  }

  // Footer text on left, page number on right
  return `<div style="width:100%; display:flex; justify-content:space-between; padding:0 10px; font-size:9px; color:#888; font-family:Georgia,serif;">
    <span>${config.footerText}</span>
    <span class="pageNumber"></span>
  </div>`
}

export class PdfExporter {
  /**
   * Export the book/chapter as a PDF file.
   */
  static async export(
    project: BookProject,
    config: ExportConfig,
    outputPath: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    const progress = (stage: ExportProgress['stage'], percent: number, message: string) => {
      onProgress?.({ stage, percent, message })
    }

    // Temp file for the HTML content (data: URLs have size limits)
    const tempDir = app.getPath('temp')
    const tempHtmlPath = path.join(tempDir, `kitapmi-export-${Date.now()}.html`)

    try {
      // Step 1: Assemble HTML
      progress('preparing', 10, 'Assembling book content...')

      let html: string
      if (config.scope === 'chapter' && config.chapterId) {
        html = await ExportEngine.assembleChapterHtml(project, config.chapterId, config)
      } else {
        html = await ExportEngine.assembleBookHtml(project, config)
      }

      // Step 2: Write HTML to temp file and load in hidden window
      progress('rendering', 30, 'Rendering pages...')

      await fs.writeFile(tempHtmlPath, html, 'utf-8')

      const win = new BrowserWindow({
        show: false,
        width: 800,
        height: 1100,
        webPreferences: {
          offscreen: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      try {
        // Load from file:// URL -- no size limits unlike data: URLs
        await win.loadFile(tempHtmlPath)

        // Wait for content to fully render
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Step 3: Generate PDF
        progress('generating', 60, 'Generating PDF...')

        const pageDims = PAGE_INCHES[config.pageSize]
        const hasHeaderFooter = !!(config.headerText || config.footerText || config.showPageNumbers)

        const pdfBuffer = await win.webContents.printToPDF({
          printBackground: true,
          displayHeaderFooter: hasHeaderFooter,
          headerTemplate: hasHeaderFooter ? buildHeaderTemplate(config) : undefined,
          footerTemplate: hasHeaderFooter ? buildFooterTemplate(config) : undefined,
          pageSize: {
            width: pageDims.width,
            height: pageDims.height
          },
          margins: {
            top: config.margins.top / 25.4,
            bottom: config.margins.bottom / 25.4,
            left: config.margins.left / 25.4,
            right: config.margins.right / 25.4
          },
          preferCSSPageSize: false,
          generateDocumentOutline: true
        })

        // Step 4: Write to file
        progress('saving', 85, 'Saving file...')

        await fs.writeFile(outputPath, pdfBuffer)

        progress('done', 100, 'PDF exported successfully!')
      } finally {
        win.destroy()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      progress('error', 0, `Export failed: ${message}`)
      throw error
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempHtmlPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
