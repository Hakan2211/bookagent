import { create } from 'zustand'
import type { ChangeGroup, TextChange, PendingAction } from '@shared/types'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from './projectStore'
import { computeFullDiff, applyAcceptedChanges } from '../lib/diff'

interface EditorState {
  activeChapterId: string | null
  activeSectionId: string | null
  activeContent: string
  isDirty: boolean
  isLoading: boolean
  isInDiffMode: boolean
  pendingDiff: {
    chapterId: string
    sectionId?: string
    changeGroups: ChangeGroup[]
    allChanges: TextChange[]
    description: string
    oldContent: string
    newContent: string
  } | null
  acceptedGroupIds: Set<string>

  openChapter: (chapterId: string) => Promise<void>
  openSection: (chapterId: string, sectionId: string) => Promise<void>
  updateContent: (content: string) => void
  saveChapter: () => Promise<void>
  enterDiffMode: (action: Extract<PendingAction, { type: 'edit' }>) => void
  enterSectionDiffMode: (action: Extract<PendingAction, { type: 'edit_section' }>) => void
  acceptChange: (groupId: string) => void
  rejectChange: (groupId: string) => void
  acceptAllChanges: () => Promise<void>
  rejectAllChanges: () => void
  exitDiffMode: () => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeChapterId: null,
  activeSectionId: null,
  activeContent: '',
  isDirty: false,
  isLoading: false,
  isInDiffMode: false,
  pendingDiff: null,
  acceptedGroupIds: new Set(),

  openChapter: async (chapterId: string) => {
    // Auto-save current content if dirty
    if (get().isDirty && (get().activeChapterId || get().activeSectionId)) {
      await get().saveChapter()
    }

    set({ isLoading: true })
    try {
      const content = (await window.api.invoke(IPC.CHAPTER_READ, {
        chapterId
      })) as string
      set({
        activeChapterId: chapterId,
        activeSectionId: null,
        activeContent: content,
        isDirty: false,
        isLoading: false,
        isInDiffMode: false,
        pendingDiff: null
      })
    } catch (err) {
      console.error('Failed to open chapter:', err)
      set({ isLoading: false })
    }
  },

  openSection: async (chapterId: string, sectionId: string) => {
    // Auto-save current content if dirty
    if (get().isDirty && (get().activeChapterId || get().activeSectionId)) {
      await get().saveChapter()
    }

    set({ isLoading: true })
    try {
      const content = (await window.api.invoke(IPC.SECTION_READ, {
        chapterId,
        sectionId
      })) as string
      set({
        activeChapterId: chapterId,
        activeSectionId: sectionId,
        activeContent: content,
        isDirty: false,
        isLoading: false,
        isInDiffMode: false,
        pendingDiff: null
      })
    } catch (err) {
      console.error('Failed to open section:', err)
      set({ isLoading: false })
    }
  },

  updateContent: (content: string) => {
    set({ activeContent: content, isDirty: true })
  },

  saveChapter: async () => {
    const { activeChapterId, activeSectionId, activeContent } = get()
    if (!activeChapterId) return

    try {
      if (activeSectionId) {
        // Save section content
        await window.api.invoke(IPC.SECTION_SAVE, {
          chapterId: activeChapterId,
          sectionId: activeSectionId,
          content: activeContent
        })
      } else {
        // Save chapter content
        await window.api.invoke(IPC.CHAPTER_SAVE, {
          chapterId: activeChapterId,
          content: activeContent
        })
      }
      set({ isDirty: false })
      useProjectStore.getState().refreshManifest()
    } catch (err) {
      console.error('Failed to save:', err)
    }
  },

  enterDiffMode: (action) => {
    // Compute full diff including equal segments for selective apply
    const fullDiff = computeFullDiff(action.oldContent, action.newContent)
    // Pre-accept all groups by default
    const allGroupIds = new Set(fullDiff.changeGroups.map((g) => g.id))

    set({
      isInDiffMode: true,
      pendingDiff: {
        chapterId: action.chapterId,
        changeGroups: fullDiff.changeGroups,
        allChanges: fullDiff.allChanges,
        description: action.description,
        oldContent: action.oldContent,
        newContent: action.newContent
      },
      acceptedGroupIds: allGroupIds
    })
  },

  enterSectionDiffMode: (action) => {
    const fullDiff = computeFullDiff(action.oldContent, action.newContent)
    const allGroupIds = new Set(fullDiff.changeGroups.map((g) => g.id))

    set({
      isInDiffMode: true,
      pendingDiff: {
        chapterId: action.chapterId,
        sectionId: action.sectionId,
        changeGroups: fullDiff.changeGroups,
        allChanges: fullDiff.allChanges,
        description: action.description,
        oldContent: action.oldContent,
        newContent: action.newContent
      },
      acceptedGroupIds: allGroupIds
    })
  },

  acceptChange: (groupId: string) => {
    set((state) => {
      const newSet = new Set(state.acceptedGroupIds)
      newSet.add(groupId)
      return { acceptedGroupIds: newSet }
    })
  },

  rejectChange: (groupId: string) => {
    set((state) => {
      const newSet = new Set(state.acceptedGroupIds)
      newSet.delete(groupId)
      return { acceptedGroupIds: newSet }
    })
  },

  acceptAllChanges: async () => {
    const { pendingDiff, acceptedGroupIds } = get()
    if (!pendingDiff) return

    try {
      // Build final content by applying only accepted change groups
      const finalContent = applyAcceptedChanges(
        pendingDiff.allChanges,
        pendingDiff.changeGroups,
        acceptedGroupIds
      )

      await window.api.invoke(IPC.AGENT_ACCEPT_CHANGES, {
        chapterId: pendingDiff.chapterId,
        sectionId: pendingDiff.sectionId,
        newContent: finalContent
      })

      // Reload content
      let content: string
      if (pendingDiff.sectionId) {
        content = (await window.api.invoke(IPC.SECTION_READ, {
          chapterId: pendingDiff.chapterId,
          sectionId: pendingDiff.sectionId
        })) as string
      } else {
        content = (await window.api.invoke(IPC.CHAPTER_READ, {
          chapterId: pendingDiff.chapterId
        })) as string
      }

      set({
        activeContent: content,
        isInDiffMode: false,
        pendingDiff: null,
        acceptedGroupIds: new Set(),
        isDirty: false
      })

      useProjectStore.getState().refreshManifest()
    } catch (err) {
      console.error('Failed to accept changes:', err)
    }
  },

  rejectAllChanges: () => {
    const { pendingDiff } = get()
    if (!pendingDiff) return

    window.api.invoke(IPC.AGENT_REJECT_CHANGES, {
      chapterId: pendingDiff.chapterId,
      sectionId: pendingDiff.sectionId
    }).catch((err: unknown) => {
      console.error('Failed to reject changes:', err)
    })

    set({
      isInDiffMode: false,
      pendingDiff: null,
      acceptedGroupIds: new Set()
    })
  },

  exitDiffMode: () => {
    get().rejectAllChanges()
  },

  reset: () => {
    set({
      activeChapterId: null,
      activeSectionId: null,
      activeContent: '',
      isDirty: false,
      isLoading: false,
      isInDiffMode: false,
      pendingDiff: null,
      acceptedGroupIds: new Set()
    })
  }
}))
