import { create } from 'zustand'
import type { ChangeGroup, TextChange, PendingAction } from '@shared/types'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from './projectStore'
import { computeFullDiff, applyAcceptedChanges } from '../lib/diff'

interface EditorState {
  activeChapterId: string | null
  activeContent: string
  isDirty: boolean
  isLoading: boolean
  isInDiffMode: boolean
  pendingDiff: {
    chapterId: string
    changeGroups: ChangeGroup[]
    allChanges: TextChange[]
    description: string
    oldContent: string
    newContent: string
  } | null
  acceptedGroupIds: Set<string>

  openChapter: (chapterId: string) => Promise<void>
  updateContent: (content: string) => void
  saveChapter: () => Promise<void>
  enterDiffMode: (action: Extract<PendingAction, { type: 'edit' }>) => void
  acceptChange: (groupId: string) => void
  rejectChange: (groupId: string) => void
  acceptAllChanges: () => Promise<void>
  rejectAllChanges: () => void
  exitDiffMode: () => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeChapterId: null,
  activeContent: '',
  isDirty: false,
  isLoading: false,
  isInDiffMode: false,
  pendingDiff: null,
  acceptedGroupIds: new Set(),

  openChapter: async (chapterId: string) => {
    // Auto-save current chapter if dirty
    if (get().isDirty && get().activeChapterId) {
      await get().saveChapter()
    }

    set({ isLoading: true })
    try {
      const content = (await window.api.invoke(IPC.CHAPTER_READ, {
        chapterId
      })) as string
      set({
        activeChapterId: chapterId,
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

  updateContent: (content: string) => {
    set({ activeContent: content, isDirty: true })
  },

  saveChapter: async () => {
    const { activeChapterId, activeContent } = get()
    if (!activeChapterId) return

    try {
      await window.api.invoke(IPC.CHAPTER_SAVE, {
        chapterId: activeChapterId,
        content: activeContent
      })
      set({ isDirty: false })
      useProjectStore.getState().refreshManifest()
    } catch (err) {
      console.error('Failed to save chapter:', err)
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
        newContent: finalContent
      })

      // Reload chapter
      const content = (await window.api.invoke(IPC.CHAPTER_READ, {
        chapterId: pendingDiff.chapterId
      })) as string

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
      chapterId: pendingDiff.chapterId
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
      activeContent: '',
      isDirty: false,
      isLoading: false,
      isInDiffMode: false,
      pendingDiff: null,
      acceptedGroupIds: new Set()
    })
  }
}))
