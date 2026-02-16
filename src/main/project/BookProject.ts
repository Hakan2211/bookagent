import fs from 'fs/promises'
import path from 'path'
import type { BookManifest, ChapterMeta, ChapterStatus, SearchResult } from '@shared/types'
import { ChapterFile } from './ChapterFile'

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
    
    const data = await ChapterFile.read(this.projectPath, chapter.file)
    this.chapterCache.set(chapterId, data.content)
    return data.content
  }

  async saveChapter(chapterId: string, content: string): Promise<number> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)

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

  async deleteChapter(chapterId: string): Promise<void> {
    const chapter = this.getChapterMeta(chapterId)
    if (!chapter) throw new Error(`Chapter "${chapterId}" not found`)

    // Delete file
    const fullPath = path.join(this.projectPath, chapter.file)
    try {
      await fs.unlink(fullPath)
    } catch {
      // File might already be gone
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
