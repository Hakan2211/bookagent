import type { BookProject } from '../project/BookProject'
import type { SearchResult } from '@shared/types'

export class SearchEngine {
  async search(project: BookProject, query: string): Promise<SearchResult[]> {
    return project.searchAllChapters(query)
  }

  async searchRegex(
    project: BookProject,
    pattern: string
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    let regex: RegExp

    try {
      regex = new RegExp(pattern, 'gi')
    } catch {
      // Invalid regex, fall back to literal search
      return project.searchAllChapters(pattern)
    }

    for (const ch of project.manifest.chapters) {
      let content: string
      try {
        content = await project.readChapter(ch.id)
      } catch {
        continue
      }

      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        let match: RegExpExecArray | null

        regex.lastIndex = 0
        while ((match = regex.exec(line)) !== null) {
          results.push({
            chapterId: ch.id,
            chapterTitle: ch.title,
            lineNumber: i + 1,
            context: line.trim(),
            matchStart: match.index,
            matchEnd: match.index + match[0].length
          })
        }
      }
    }

    return results
  }
}
