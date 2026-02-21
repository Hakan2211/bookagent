import fs from 'fs/promises'
import path from 'path'
import Store from 'electron-store'
import type { BookManifest, BookMetadata, RecentProject } from '@shared/types'
import { BookProject } from './BookProject'

const store = new Store<{ recentProjects: RecentProject[] }>({
  defaults: {
    recentProjects: []
  }
})

export class ProjectManager {
  private currentProject: BookProject | null = null

  get project(): BookProject | null {
    return this.currentProject
  }

  async createProject(
    projectPath: string,
    metadata: BookMetadata
  ): Promise<BookManifest> {
    // Create directory structure
    await fs.mkdir(path.join(projectPath, 'chapters'), { recursive: true })
    await fs.mkdir(path.join(projectPath, 'notes'), { recursive: true })
    await fs.mkdir(path.join(projectPath, 'imports'), { recursive: true })
    await fs.mkdir(path.join(projectPath, '.kitapmi', 'history'), { recursive: true })
    await fs.mkdir(path.join(projectPath, '.kitapmi', 'chat-history'), { recursive: true })

    const now = new Date().toISOString()

    const manifest: BookManifest = {
      version: '1.0',
      title: metadata.title,
      subtitle: '',
      author: metadata.author,
      created: now,
      modified: now,
      targets: {
        totalWords: metadata.targetWords || 0,
        chapterWords: metadata.chapterWords || 0
      },
      chapters: [],
      notes: [
        { id: 'characters', file: 'notes/characters.md', title: 'Characters' },
        { id: 'world', file: 'notes/world.md', title: 'World & Settings' },
        { id: 'style', file: 'notes/style.md', title: 'Style Guide' }
      ],
      style: {
        genre: metadata.detectedGenre || '',
        pov: (metadata.detectedPOV as BookManifest['style']['pov']) || '',
        tense: (metadata.detectedTense as BookManifest['style']['tense']) || '',
        tone: '',
        avoidWords: [],
        customInstructions: ''
      },
      ai: {
        provider: metadata.aiProvider || 'anthropic',
        model: metadata.aiModel || 'claude-sonnet-4-5-20250929',
        keyRef: `kitapmi-${metadata.aiProvider || 'anthropic'}-key`
      },
      imports: []
    }

    // Write book.json
    await fs.writeFile(
      path.join(projectPath, 'book.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    )

    // Write empty note files
    await fs.writeFile(
      path.join(projectPath, 'notes/characters.md'),
      '# Characters\n\n',
      'utf-8'
    )
    await fs.writeFile(
      path.join(projectPath, 'notes/world.md'),
      '# World & Settings\n\n',
      'utf-8'
    )
    await fs.writeFile(
      path.join(projectPath, 'notes/style.md'),
      '# Style Guide\n\n',
      'utf-8'
    )

    // Write empty outline
    await fs.writeFile(
      path.join(projectPath, 'outline.md'),
      '# Outline\n\n',
      'utf-8'
    )

    // Write .gitignore
    await fs.writeFile(
      path.join(projectPath, '.gitignore'),
      `# Kitapmi internal data
.kitapmi/cache.json
.kitapmi/chat-history/

# OS files
.DS_Store
Thumbs.db
`,
      'utf-8'
    )

    // Write initial summaries
    await fs.writeFile(
      path.join(projectPath, '.kitapmi/summaries.json'),
      JSON.stringify({ generatedAt: now, chapters: {} }, null, 2),
      'utf-8'
    )

    this.currentProject = new BookProject(projectPath, manifest)
    this.addToRecents(projectPath, manifest)

    return manifest
  }

  async openProject(projectPath: string): Promise<BookManifest> {
    this.currentProject = await BookProject.open(projectPath)
    this.addToRecents(projectPath, this.currentProject.manifest)
    return this.currentProject.manifest
  }

  closeProject(): void {
    this.currentProject = null
  }

  getRecentProjects(): RecentProject[] {
    return store.get('recentProjects', [])
  }

  /**
   * Update the last-active chapter/section for the currently open project.
   * Called whenever the user switches chapters in the editor.
   */
  updateLastChapter(chapterId: string, sectionId?: string): void {
    if (!this.currentProject) return
    const projectPath = this.currentProject.path

    const recents = store.get('recentProjects', [])
    const entry = recents.find((r) => r.path === projectPath)
    if (entry) {
      entry.lastChapterId = chapterId
      entry.lastSectionId = sectionId || undefined
      store.set('recentProjects', recents)
    }
  }

  /**
   * Get the last-active chapter/section for the currently open project.
   */
  getLastChapter(): { chapterId?: string; sectionId?: string } {
    if (!this.currentProject) return {}
    const projectPath = this.currentProject.path

    const recents = store.get('recentProjects', [])
    const entry = recents.find((r) => r.path === projectPath)
    return {
      chapterId: entry?.lastChapterId,
      sectionId: entry?.lastSectionId
    }
  }

  private addToRecents(projectPath: string, manifest: BookManifest): void {
    const recents = store.get('recentProjects', [])
    
    // Remove existing entry for this path
    const filtered = recents.filter(r => r.path !== projectPath)
    
    // Add to front, preserving lastChapterId/lastSectionId from old entry
    const oldEntry = recents.find(r => r.path === projectPath)
    filtered.unshift({
      path: projectPath,
      title: manifest.title,
      author: manifest.author,
      lastOpened: new Date().toISOString(),
      lastChapterId: oldEntry?.lastChapterId,
      lastSectionId: oldEntry?.lastSectionId
    })
    
    // Keep only last 10
    store.set('recentProjects', filtered.slice(0, 10))
  }
}
