import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

export interface ChapterFileData {
  id: string
  title: string
  content: string
  wordCount: number
}

export class ChapterFile {
  static async read(projectPath: string, filePath: string): Promise<ChapterFileData> {
    const fullPath = path.join(projectPath, filePath)
    const raw = await fs.readFile(fullPath, 'utf-8')
    const parsed = matter(raw)
    
    const content = parsed.content.trim()
    const wordCount = ChapterFile.countWords(content)
    
    return {
      id: (parsed.data.id as string) || '',
      title: (parsed.data.title as string) || '',
      content,
      wordCount
    }
  }

  static async write(
    projectPath: string,
    filePath: string,
    id: string,
    title: string,
    content: string
  ): Promise<number> {
    const fullPath = path.join(projectPath, filePath)
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    
    const frontmatter = matter.stringify(content, { id, title })
    await fs.writeFile(fullPath, frontmatter, 'utf-8')
    
    return ChapterFile.countWords(content)
  }

  static countWords(text: string): number {
    if (!text || !text.trim()) return 0
    return text.trim().split(/\s+/).length
  }

  static slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
  }

  static formatChapterFilename(index: number, title: string): string {
    const num = String(index).padStart(2, '0')
    const slug = ChapterFile.slugify(title)
    return `${num}-${slug}.md`
  }
}
