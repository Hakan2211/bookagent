import fs from 'fs/promises'
import path from 'path'
import type { BookManifest, ChapterMeta, ChapterStatus, SectionMeta, SearchResult } from '@shared/types'
import { ChapterFile } from './ChapterFile'
import { SectionFile } from './SectionFile'

export class BookProject {
  public manifest: BookManifest
  private projectPath: string
  private chapterCache: Map<string, string> = new Map()

  constructor(projectPath: string, manifest: BookManifest) {
    this.projectPath = projectPath
    this.manifest = manifest
  }

  get path(): string {
    return this.projectPath
  }

  // ─── Manifest Operations ──────────────────

  async saveManifest(): Promise<void> {
    this.manifest.modified = new Date().toISOString()
    const manifestPath = path.join(this.projectPath, 'book.json')
    await fs.writeFile(manifestPath, JSON.stringify(this.manifest, null, 2), 'utf-8')
  }

  // ─── Chapter Operations ───────────────────

  async readChapter(chapterId: string): Promise<string> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)

    // Sectioned chapters are directories, not files — cannot be read directly
    if (chapter.sections && chapter.sections.length > 0) {
      const err = new Error(
        `Chapter "${chapterId}" is sectioned. Use readSection() for individual sections.`
      )
      ;(err as Error & { code: string }).code = 'CHAPTER_IS_SECTIONED'
      ;(err as Error & { firstSectionId: string }).firstSectionId = chapter.sections[0].id
      throw err
    }
    
    const data = await ChapterFile.read(this.projectPath, chapter.file)
    this.chapterCache.set(chapterId, data.content)
    return data.content
  }

  async saveChapter(chapterId: string, content: string): Promise<number> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)
    if (chapter.sections && chapter.sections.length > 0) {
      throw new Error(`Chapter "${chapterId}" is sectioned into multiple files. Use saveSection() to edit individual sections.`)
    }

    const wordCount = await ChapterFile.write(
      this.projectPath,
      chapter.file,
      chapterId,
      chapter.title,
      content
    )

    // Update manifest
    chapter.wordCount = wordCount
    this.chapterCache.set(chapterId, content)
    await this.saveManifest()

    return wordCount
  }

  async addChapter(
    title: string,
    content: string,
    afterChapterId?: string
  ): Promise<ChapterMeta> {
    // Generate next ID using a monotonic counter to avoid reuse after deletions
    // Look at all chapter IDs (not just current chapters) to find the maximum ever used
    const maxNum = this.manifest.chapters.reduce((max, ch) => {
      const num = parseInt(ch.id.replace('ch-', ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, this.manifest._nextChapterNum ?? 0)
    const nextNum = maxNum + 1
    // Store the counter in the manifest for persistence
    this.manifest._nextChapterNum = nextNum
    const id = `ch-${String(nextNum).padStart(2, '0')}`

    // Generate filename
    const fileIndex = afterChapterId
      ? this.manifest.chapters.findIndex(ch => ch.id === afterChapterId) + 2
      : this.manifest.chapters.length + 1
    const filename = ChapterFile.formatChapterFilename(fileIndex, title)
    const filePath = `chapters/${filename}`

    // Write file
    const wordCount = await ChapterFile.write(
      this.projectPath,
      filePath,
      id,
      title,
      content
    )

    const chapterMeta: ChapterMeta = {
      id,
      file: filePath,
      title,
      status: 'draft',
      wordCount,
      summary: ''
    }

    // Insert into manifest at correct position
    if (afterChapterId) {
      const idx = this.manifest.chapters.findIndex(ch => ch.id === afterChapterId)
      if (idx >= 0) {
        this.manifest.chapters.splice(idx + 1, 0, chapterMeta)
      } else {
        this.manifest.chapters.push(chapterMeta)
      }
    } else {
      this.manifest.chapters.push(chapterMeta)
    }

    await this.saveManifest()
    return chapterMeta
  }

  /**
   * Create a new chapter that is immediately sectioned (folder-based) with
   * multiple section files. Use this when the user wants subchapters/sections.
   *
   * On disk this creates:
   *   chapters/NN-slug/
   *     01-section-one.md
   *     02-section-two.md
   *     ...
   */
  async addSectionedChapter(
    title: string,
    sections: { title: string; content: string }[],
    afterChapterId?: string
  ): Promise<ChapterMeta> {
    if (!sections || sections.length === 0) {
      throw new Error('At least one section is required for a sectioned chapter')
    }

    // Generate chapter ID using monotonic counter
    const maxNum = this.manifest.chapters.reduce((max, ch) => {
      const num = parseInt(ch.id.replace('ch-', ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, this.manifest._nextChapterNum ?? 0)
    const nextNum = maxNum + 1
    this.manifest._nextChapterNum = nextNum
    const chapterId = `ch-${String(nextNum).padStart(2, '0')}`

    // Generate folder name (no .md extension — this IS the folder)
    const fileIndex = afterChapterId
      ? this.manifest.chapters.findIndex(ch => ch.id === afterChapterId) + 2
      : this.manifest.chapters.length + 1
    const folderName = SectionFile.formatChapterFolderName(fileIndex, title)
    const folderPath = `chapters/${folderName}`

    // Create the chapter folder
    await fs.mkdir(path.join(this.projectPath, folderPath), { recursive: true })

    // Write each section file into the folder
    const sectionMetas: SectionMeta[] = []
    let totalWordCount = 0

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]
      const sectionNum = i + 1
      const sectionId = `sec-${String(sectionNum).padStart(2, '0')}`
      const sectionFilename = SectionFile.formatSectionFilename(sectionNum, sec.title)
      const sectionFilePath = `${folderPath}/${sectionFilename}`

      const wordCount = await SectionFile.write(
        this.projectPath,
        sectionFilePath,
        sectionId,
        sec.title,
        sec.content
      )

      sectionMetas.push({
        id: sectionId,
        file: sectionFilePath,
        title: sec.title,
        status: 'draft',
        wordCount,
        summary: ''
      })

      totalWordCount += wordCount
    }

    // Build chapter metadata — file points to folder, sections are populated
    const chapterMeta: ChapterMeta = {
      id: chapterId,
      file: folderPath,
      title,
      status: 'draft',
      wordCount: totalWordCount,
      summary: '',
      sections: sectionMetas,
      _nextSectionNum: sections.length
    }

    // Insert into manifest at correct position
    if (afterChapterId) {
      const idx = this.manifest.chapters.findIndex(ch => ch.id === afterChapterId)
      if (idx >= 0) {
        this.manifest.chapters.splice(idx + 1, 0, chapterMeta)
      } else {
        this.manifest.chapters.push(chapterMeta)
      }
    } else {
      this.manifest.chapters.push(chapterMeta)
    }

    await this.saveManifest()
    return chapterMeta
  }

  async deleteChapter(chapterId: string): Promise<void> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)

    const fullPath = path.join(this.projectPath, chapter.file)

    if (chapter.sections && chapter.sections.length > 0) {
      // Sectioned chapter: delete the entire folder
      try {
        await fs.rm(fullPath, { recursive: true, force: true })
      } catch {
        // Folder might already be gone
      }
    } else {
      // Flat chapter: delete single file
      try {
        await fs.unlink(fullPath)
      } catch {
        // File might already be gone
      }
    }

    // Remove from manifest
    this.manifest.chapters = this.manifest.chapters.filter(ch => ch.id !== chapterId)
    this.chapterCache.delete(chapterId)
    await this.saveManifest()
  }

  async renameChapter(chapterId: string, newTitle: string): Promise<void> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)

    chapter.title = newTitle

    // Re-write file with new frontmatter
    const content = await this.readChapter(chapterId)
    await ChapterFile.write(this.projectPath, chapter.file, chapterId, newTitle, content)
    await this.saveManifest()
  }

  async reorderChapters(chapterIds: string[]): Promise<void> {
    // Validate that the input is a permutation of existing chapter IDs
    const existingIds = new Set(this.manifest.chapters.map(ch => ch.id))
    const inputIds = new Set(chapterIds)

    if (existingIds.size !== inputIds.size) {
      throw new Error('Chapter ID list must contain exactly the same chapters')
    }
    for (const id of existingIds) {
      if (!inputIds.has(id)) {
        throw new Error(`Missing chapter "${id}" in reorder list`)
      }
    }

    const reordered: ChapterMeta[] = []
    for (const id of chapterIds) {
      const ch = this.getChapterMeta(id)
      if (ch) reordered.push(ch)
    }
    this.manifest.chapters = reordered
    await this.saveManifest()
  }

  async updateChapterStatus(chapterId: string, status: ChapterStatus): Promise<void> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)
    chapter.status = status
    await this.saveManifest()
  }

  async updateChapterSummary(chapterId: string, summary: string): Promise<void> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)
    chapter.summary = summary
    await this.saveManifest()
  }

  // ─── Section Operations ──────────────────

  /** Check if a chapter has sections (is a folder-based chapter) */
  isSectioned(chapterId: string): boolean {
    const ch = this.getChapterMeta(chapterId)
    return !!ch?.sections && ch.sections.length > 0
  }

  getSectionMeta(chapterId: string, sectionId: string): SectionMeta | undefined {
    const ch = this.getChapterMeta(chapterId)
    return ch?.sections?.find((s) => s.id === sectionId)
  }

  async readSection(chapterId: string, sectionId: string): Promise<string> {
    const section = this.getSectionMeta(chapterId, sectionId)
    if (!section) throw new Error(`Section "${sectionId}" not found in chapter "${chapterId}"`)

    const data = await SectionFile.read(this.projectPath, section.file)
    return data.content
  }

  async saveSection(chapterId: string, sectionId: string, content: string): Promise<number> {
    const ch = this.getChapterMeta(chapterId)
    if (!ch) throw new Error(`Chapter "${chapterId}" not found`)
    const section = ch.sections?.find((s) => s.id === sectionId)
    if (!section) throw new Error(`Section "${sectionId}" not found`)

    const wordCount = await SectionFile.write(
      this.projectPath,
      section.file,
      sectionId,
      section.title,
      content
    )

    section.wordCount = wordCount
    // Recalculate chapter total word count from all sections
    ch.wordCount = (ch.sections || []).reduce((sum, s) => sum + s.wordCount, 0)
    await this.saveManifest()
    return wordCount
  }

  async addSection(
    chapterId: string,
    title: string,
    content: string,
    afterSectionId?: string
  ): Promise<SectionMeta> {
    const ch = this.getChapterMeta(chapterId)
    if (!ch) throw new Error(`Chapter "${chapterId}" not found`)
    if (!ch.sections) ch.sections = []

    // Generate section ID using monotonic counter
    const maxNum = ch.sections.reduce((max, s) => {
      const num = parseInt(s.id.replace('sec-', ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, ch._nextSectionNum ?? 0)
    const nextNum = maxNum + 1
    ch._nextSectionNum = nextNum
    const sectionId = `sec-${String(nextNum).padStart(2, '0')}`

    // Get the chapter folder path
    const chapterFolder = ch.file.replace(/\.md$/, '')
    const fileIndex = afterSectionId
      ? (ch.sections.findIndex((s) => s.id === afterSectionId) + 2)
      : ch.sections.length + 1
    const filename = SectionFile.formatSectionFilename(fileIndex, title)
    const filePath = `${chapterFolder}/${filename}`

    const wordCount = await SectionFile.write(
      this.projectPath,
      filePath,
      sectionId,
      title,
      content
    )

    const sectionMeta: SectionMeta = {
      id: sectionId,
      file: filePath,
      title,
      status: 'draft',
      wordCount,
      summary: ''
    }

    if (afterSectionId) {
      const idx = ch.sections.findIndex((s) => s.id === afterSectionId)
      if (idx >= 0) {
        ch.sections.splice(idx + 1, 0, sectionMeta)
      } else {
        ch.sections.push(sectionMeta)
      }
    } else {
      ch.sections.push(sectionMeta)
    }

    // Update chapter word count
    ch.wordCount = ch.sections.reduce((sum, s) => sum + s.wordCount, 0)
    await this.saveManifest()
    return sectionMeta
  }

  async deleteSection(chapterId: string, sectionId: string): Promise<void> {
    const ch = this.getChapterMeta(chapterId)
    if (!ch) throw new Error(`Chapter "${chapterId}" not found`)
    const section = ch.sections?.find((s) => s.id === sectionId)
    if (!section) throw new Error(`Section "${sectionId}" not found`)

    const fullPath = path.join(this.projectPath, section.file)
    try {
      await fs.unlink(fullPath)
    } catch {
      // File might already be gone
    }

    ch.sections = (ch.sections || []).filter((s) => s.id !== sectionId)
    ch.wordCount = ch.sections.reduce((sum, s) => sum + s.wordCount, 0)
    await this.saveManifest()
  }

  async renameSection(chapterId: string, sectionId: string, newTitle: string): Promise<void> {
    const section = this.getSectionMeta(chapterId, sectionId)
    if (!section) throw new Error(`Section "${sectionId}" not found`)

    section.title = newTitle
    const content = await this.readSection(chapterId, sectionId)
    await SectionFile.write(this.projectPath, section.file, sectionId, newTitle, content)
    await this.saveManifest()
  }

  async reorderSections(chapterId: string, sectionIds: string[]): Promise<void> {
    const ch = this.getChapterMeta(chapterId)
    if (!ch || !ch.sections) throw new Error(`Chapter "${chapterId}" not found or has no sections`)

    const existingIds = new Set(ch.sections.map((s) => s.id))
    const inputIds = new Set(sectionIds)
    if (existingIds.size !== inputIds.size) {
      throw new Error('Section ID list must contain exactly the same sections')
    }
    for (const id of existingIds) {
      if (!inputIds.has(id)) throw new Error(`Missing section "${id}" in reorder list`)
    }

    const reordered: SectionMeta[] = []
    for (const id of sectionIds) {
      const s = ch.sections.find((sec) => sec.id === id)
      if (s) reordered.push(s)
    }
    ch.sections = reordered
    await this.saveManifest()
  }

  async updateSectionStatus(chapterId: string, sectionId: string, status: ChapterStatus): Promise<void> {
    const section = this.getSectionMeta(chapterId, sectionId)
    if (!section) throw new Error(`Section "${sectionId}" not found`)
    section.status = status
    await this.saveManifest()
  }

  /**
   * Convert a flat chapter (single .md file) into a folder-based sectioned chapter.
   * The existing content becomes the first section.
   */
  async convertToSectioned(chapterId: string, firstSectionTitle: string): Promise<ChapterMeta> {
    const ch = this.getChapterMeta(chapterId)
    if (!ch) throw new Error(`Chapter "${chapterId}" not found`)
    if (ch.sections && ch.sections.length > 0) {
      throw new Error(`Chapter "${chapterId}" is already sectioned`)
    }

    // Read existing content
    const content = await this.readChapter(chapterId)

    // Create chapter folder
    const oldFilePath = ch.file
    const folderName = oldFilePath.replace(/\.md$/, '')
    const folderFullPath = path.join(this.projectPath, folderName)
    await fs.mkdir(folderFullPath, { recursive: true })

    // Write section file
    const sectionId = 'sec-01'
    const sectionFilename = SectionFile.formatSectionFilename(1, firstSectionTitle)
    const sectionFilePath = `${folderName}/${sectionFilename}`

    const wordCount = await SectionFile.write(
      this.projectPath,
      sectionFilePath,
      sectionId,
      firstSectionTitle,
      content
    )

    // Update manifest: change file to folder path, add sections array
    ch.file = folderName
    ch.sections = [
      {
        id: sectionId,
        file: sectionFilePath,
        title: firstSectionTitle,
        status: ch.status,
        wordCount,
        summary: ch.summary
      }
    ]
    ch._nextSectionNum = 1

    // Delete old flat file
    try {
      await fs.unlink(path.join(this.projectPath, oldFilePath))
    } catch {
      // Might not exist
    }

    this.chapterCache.delete(chapterId)
    await this.saveManifest()
    return ch
  }

  // ─── Notes Operations ────────────────────

  async readNote(noteId: string): Promise<string> {
    const note = this.manifest.notes.find(n => n.id === noteId)
    if (!note) throw new Error(`Note "${noteId}" not found`)
    const fullPath = path.join(this.projectPath, note.file)
    try {
      return await fs.readFile(fullPath, 'utf-8')
    } catch {
      return ''
    }
  }

  async saveNote(noteId: string, content: string): Promise<void> {
    const note = this.manifest.notes.find(n => n.id === noteId)
    if (!note) throw new Error(`Note "${noteId}" not found`)
    const fullPath = path.join(this.projectPath, note.file)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  // ─── Outline Operations ──────────────────

  async readOutline(): Promise<string> {
    const outlinePath = path.join(this.projectPath, 'outline.md')
    try {
      return await fs.readFile(outlinePath, 'utf-8')
    } catch {
      return ''
    }
  }

  async saveOutline(content: string): Promise<void> {
    const outlinePath = path.join(this.projectPath, 'outline.md')
    await fs.writeFile(outlinePath, content, 'utf-8')
  }

  // ─── Query Methods ───────────────────────

  getChapterMeta(chapterId: string): ChapterMeta | undefined {
    return this.manifest.chapters.find(ch => ch.id === chapterId)
  }

  getChapterTitle(chapterId: string): string {
    return this.getChapterMeta(chapterId)?.title || 'Unknown'
  }

  getPreviousChapter(chapterId: string): ChapterMeta | undefined {
    const idx = this.manifest.chapters.findIndex(ch => ch.id === chapterId)
    return idx > 0 ? this.manifest.chapters[idx - 1] : undefined
  }

  getNextChapter(chapterId: string): ChapterMeta | undefined {
    const idx = this.manifest.chapters.findIndex(ch => ch.id === chapterId)
    return idx >= 0 && idx < this.manifest.chapters.length - 1
      ? this.manifest.chapters[idx + 1]
      : undefined
  }

  getTotalWordCount(): number {
    return this.manifest.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
  }

  getAllWordCounts(): { chapterId: string; title: string; wordCount: number; status: ChapterStatus }[] {
    return this.manifest.chapters.map(ch => ({
      chapterId: ch.id,
      title: ch.title,
      wordCount: ch.wordCount,
      status: ch.status
    }))
  }

  // ─── Search ──────────────────────────────

  async searchAllChapters(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const queryLower = query.toLowerCase()

    for (const ch of this.manifest.chapters) {
      let content: string
      if (this.chapterCache.has(ch.id)) {
        content = this.chapterCache.get(ch.id)!
      } else {
        try {
          content = await this.readChapter(ch.id)
        } catch {
          continue
        }
      }

      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineLower = line.toLowerCase()
        // Calculate leading whitespace to adjust offsets for trimmed context
        const leadingWhitespace = line.length - line.trimStart().length
        let searchStart = 0

        while (true) {
          const matchIdx = lineLower.indexOf(queryLower, searchStart)
          if (matchIdx === -1) break

          // Get context: the trimmed line, with offsets adjusted
          results.push({
            chapterId: ch.id,
            chapterTitle: ch.title,
            lineNumber: i + 1,
            context: line.trim(),
            matchStart: matchIdx - leadingWhitespace,
            matchEnd: matchIdx - leadingWhitespace + query.length
          })

          searchStart = matchIdx + 1
        }
      }
    }

    return results
  }

  // ─── Static Factory ──────────────────────

  static async open(projectPath: string): Promise<BookProject> {
    const manifestPath = path.join(projectPath, 'book.json')
    const raw = await fs.readFile(manifestPath, 'utf-8')
    const manifest: BookManifest = JSON.parse(raw)
    return new BookProject(projectPath, manifest)
  }
}
