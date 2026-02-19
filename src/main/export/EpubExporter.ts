import fs from 'fs/promises'
import epub from 'epub-gen-memory'
import type { Chapter as EpubChapter, Options as EpubOptions } from 'epub-gen-memory'
import type { ExportConfig, ExportProgress } from '@shared/types'
import type { BookProject } from '../project/BookProject'
import { ExportEngine } from './ExportEngine'

export class EpubExporter {
  /**
   * Export the book/chapter as an EPUB file.
   *
   * @param project - The open book project
   * @param config - Export configuration
   * @param outputPath - Absolute path where the EPUB will be saved
   * @param onProgress - Optional callback for progress updates
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

    try {
      // Step 1: Gather chapter content
      progress('preparing', 10, 'Preparing chapters...')

      const chapterData = await ExportEngine.getChaptersForEpub(
        project,
        config.scope === 'chapter' ? config.chapterId : undefined
      )

      // Step 2: Build EPUB chapters
      progress('generating', 40, 'Building EPUB...')

      const chapters: EpubChapter[] = chapterData.map((ch) => ({
        title: ch.title,
        content: ch.html
      }))

      // Step 3: Configure EPUB metadata
      const manifest = project.manifest
      const fontFamilies: Record<string, string> = {
        serif: 'Georgia, serif',
        'sans-serif': 'Helvetica, Arial, sans-serif',
        monospace: 'Courier New, monospace'
      }

      const epubOptions: EpubOptions = {
        title:
          config.scope === 'chapter'
            ? `${manifest.title} - ${chapterData[0]?.title || 'Chapter'}`
            : manifest.title,
        author: manifest.author,
        tocTitle: 'Table of Contents',
        css: `
          body {
            font-family: ${fontFamilies[config.fontFamily] || fontFamilies.serif};
            font-size: ${config.fontSize}pt;
            line-height: ${config.lineSpacing};
            color: #1a1a1a;
          }
          h1, h2, h3 {
            font-weight: 600;
            margin: 1.5em 0 0.8em;
          }
          h1 { font-size: 1.5em; }
          h2 { font-size: 1.3em; }
          h3 { font-size: 1.1em; }
          p {
            text-indent: 1.5em;
            margin-bottom: 0.2em;
            text-align: justify;
          }
          blockquote {
            margin: 1.2em 2em;
            padding-left: 1em;
            border-left: 3px solid #ddd;
            color: #555;
            font-style: italic;
          }
          hr {
            border: none;
            text-align: center;
            margin: 2em 0;
          }
          hr::after {
            content: "* * *";
            color: #aaa;
            letter-spacing: 0.5em;
          }
        `
      }

      // Step 4: Generate EPUB buffer
      progress('generating', 70, 'Generating EPUB file...')

      const epubBuffer = await epub(epubOptions, chapters)

      // Step 5: Write to file
      progress('saving', 90, 'Saving file...')

      await fs.writeFile(outputPath, epubBuffer)

      progress('done', 100, 'EPUB exported successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      progress('error', 0, `Export failed: ${message}`)
      throw error
    }
  }
}
