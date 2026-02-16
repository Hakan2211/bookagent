import fs from 'fs/promises'
import path from 'path'
import type {
  AIProvider,
  BookManifest,
  BookMetadata,
  ConfirmedChapter,
  ImportConfig,
  ProposedSplit
} from '@shared/types'
import { ParserFactory } from './parsers'
import { ChapterSplitter } from './ChapterSplitter'
import { ChapterFile } from '../project/ChapterFile'
import { ProjectManager } from '../project/ProjectManager'

export class ImportPipeline {
  constructor(private ai: AIProvider) {}

  async execute(
    filePath: string,
    config: ImportConfig,
    onProgress: (step: string, percent: number) => void
  ): Promise<ProposedSplit> {
    // Step 1: Parse file to raw text
    onProgress('Extracting text...', 10)
    const parser = ParserFactory.create(filePath)
    const rawText = await parser.parse(filePath)

    // Step 2: Basic cleanup
    onProgress('Cleaning up text...', 30)
    const cleanedText = this.cleanText(rawText)
    const totalWords = cleanedText.split(/\s+/).filter(Boolean).length

    // Step 3: Send to AI for chapter splitting
    onProgress('Analyzing structure with AI...', 50)
    const splitter = new ChapterSplitter(this.ai)
    const result = await splitter.split(cleanedText, config.targetChapterWords)

    // Step 4: Return proposed split for user review
    onProgress('Ready for review', 100)
    return {
      rawText: cleanedText,
      totalWords,
      chapters: result.chapters,
      bookSummary: result.bookSummary,
      detectedGenre: result.detectedGenre,
      detectedPOV: result.detectedPOV,
      detectedTense: result.detectedTense
    }
  }

  async confirmAndCreate(
    projectPath: string,
    sourceFilePath: string,
    confirmedChapters: ConfirmedChapter[],
    metadata: BookMetadata,
    projectManager: ProjectManager
  ): Promise<BookManifest> {
    // Create project
    const manifest = await projectManager.createProject(projectPath, metadata)
    const project = projectManager.project!

    // Write chapter files
    for (let i = 0; i < confirmedChapters.length; i++) {
      const ch = confirmedChapters[i]
      await project.addChapter(ch.title, ch.text)
      
      // Update summary
      const chapterId = project.manifest.chapters[i]?.id
      if (chapterId) {
        await project.updateChapterSummary(chapterId, ch.summary)
      }
    }

    // Copy source file to imports/
    const importsDir = path.join(projectPath, 'imports')
    await fs.mkdir(importsDir, { recursive: true })
    try {
      await fs.copyFile(
        sourceFilePath,
        path.join(importsDir, path.basename(sourceFilePath))
      )
    } catch {
      // Source file might not be accessible
    }

    // Record import
    project.manifest.imports.push({
      date: new Date().toISOString(),
      sourceFile: `imports/${path.basename(sourceFilePath)}`,
      sourceType: path.extname(sourceFilePath).slice(1),
      chaptersCreated: project.manifest.chapters.map(ch => ch.id)
    })
    await project.saveManifest()

    return project.manifest
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '  ') // Tabs to spaces
      .replace(/\n{4,}/g, '\n\n\n') // Max 3 consecutive newlines
      .replace(/[ \t]+$/gm, '') // Trim trailing whitespace on each line
      .trim()
  }
}
