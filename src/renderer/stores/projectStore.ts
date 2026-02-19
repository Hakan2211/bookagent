import { create } from 'zustand'
import type { BookManifest, BookMetadata, RecentProject } from '@shared/types'
import { IPC } from '@shared/ipc-channels'

interface ProjectState {
  isOpen: boolean
  manifest: BookManifest | null
  recentProjects: RecentProject[]
  isLoading: boolean
  error: string | null

  openProject: (path: string) => Promise<void>
  createProject: (path: string, metadata: BookMetadata) => Promise<void>
  closeProject: () => void
  updateManifest: (partial: Partial<BookManifest>) => void
  refreshManifest: () => Promise<void>
  loadRecents: () => Promise<void>
  setError: (error: string | null) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  isOpen: false,
  manifest: null,
  recentProjects: [],
  isLoading: false,
  error: null,

  openProject: async (path: string) => {
    set({ isLoading: true, error: null })
    try {
      const manifest = (await window.api.invoke(IPC.PROJECT_OPEN, { path })) as BookManifest
      set({ isOpen: true, manifest, isLoading: false })

      // Restore last active chapter/section
      try {
        const last = (await window.api.invoke(IPC.PROJECT_GET_LAST_CHAPTER)) as {
          chapterId?: string
          sectionId?: string
        }

        if (last.chapterId) {
          const chapter = manifest.chapters.find((ch) => ch.id === last.chapterId)
          if (chapter) {
            // Dynamically import to avoid circular dependency
            const { useEditorStore } = await import('./editorStore')

            if (last.sectionId && chapter.sections?.find((s) => s.id === last.sectionId)) {
              useEditorStore.getState().openSection(last.chapterId, last.sectionId)
            } else {
              useEditorStore.getState().openChapter(last.chapterId)
            }
          }
        }
      } catch {
        // Non-critical: if restoring fails, user just sees empty editor
      }
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      throw err
    }
  },

  createProject: async (path: string, metadata: BookMetadata) => {
    set({ isLoading: true, error: null })
    try {
      const manifest = (await window.api.invoke(IPC.PROJECT_CREATE, {
        path,
        metadata
      })) as BookManifest
      set({ isOpen: true, manifest, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      throw err
    }
  },

  closeProject: () => {
    window.api.invoke(IPC.PROJECT_CLOSE).catch((err: unknown) => {
      console.error('Failed to close project:', err)
    })
    set({ isOpen: false, manifest: null })
  },

  updateManifest: (partial: Partial<BookManifest>) => {
    set((state) => ({
      manifest: state.manifest ? { ...state.manifest, ...partial } : null
    }))
  },

  refreshManifest: async () => {
    if (get().isOpen) {
      try {
        const manifest = (await window.api.invoke(IPC.PROJECT_GET_STATE)) as BookManifest | null
        if (manifest) {
          set({ manifest })
        }
      } catch {
        // Ignore refresh errors
      }
    }
  },

  loadRecents: async () => {
    try {
      const recents = (await window.api.invoke(IPC.PROJECT_GET_RECENTS)) as RecentProject[]
      set({ recentProjects: recents })
    } catch {
      // Ignore
    }
  },

  setError: (error: string | null) => set({ error })
}))
