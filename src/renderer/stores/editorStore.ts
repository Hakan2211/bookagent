import { create } from 'zustand'
import type { ChangeGroup, TextChange, PendingAction } from '@shared/types'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from './projectStore'
import { computeFullDiff, applyAcceptedChanges } from '../lib/diff'

interface PendingDiffItem {
  chapterId: string
  sectionId?: string
  changeGroups: ChangeGroup[]
  allChanges: TextChange[]
  description: string
  oldContent: string
  newContent: string
}

export type InlineEditAction =
  | 'rewrite'
  | 'change-tone'
  | 'expand'
  | 'shorten'
  | 'continue'
  | 'custom'

export interface InlineEditState {
  /** Whether an inline edit is actively running or showing results */
  isActive: boolean
  /** The action being performed */
  action: InlineEditAction | null
  /** Original selected text */
  selectedText: string
  /** Accumulated streamed replacement text */
  streamedText: string
  /** Final replacement text (set when done) */
  resultText: string | null
  /** Whether the LLM is still streaming */
  isStreaming: boolean
  /** Error message if the edit failed */
  error: string | null
  /** Selection range in the editor (ProseMirror positions) */
  selectionFrom: number
  selectionTo: number
}

interface EditorState {
  activeChapterId: string | null
  activeSectionId: string | null
  activeContent: string
  isDirty: boolean
  isLoading: boolean
  isInDiffMode: boolean
  pendingDiff: PendingDiffItem | null
  pendingDiffQueue: PendingDiffItem[]
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
  rejectAllChanges: () => Promise<void>
  exitDiffMode: () => void
  clearDiffQueue: () => void
  reset: () => void

  // ── Inline Edit ───────────────────────────
  inlineEdit: InlineEditState
  startInlineEdit: (action: InlineEditAction, selectedText: string, from: number, to: number) => void
  appendInlineEditText: (text: string) => void
  completeInlineEdit: (fullText: string) => void
  setInlineEditError: (error: string) => void
  acceptInlineEdit: () => void
  rejectInlineEdit: () => void
  clearInlineEdit: () => void
}

/** Build a PendingDiffItem from raw action content */
function buildDiffItem(
  chapterId: string,
  oldContent: string,
  newContent: string,
  description: string,
  sectionId?: string
): PendingDiffItem {
  const fullDiff = computeFullDiff(oldContent, newContent)
  return {
    chapterId,
    sectionId,
    changeGroups: fullDiff.changeGroups,
    allChanges: fullDiff.allChanges,
    description,
    oldContent,
    newContent
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeChapterId: null,
  activeSectionId: null,
  activeContent: '',
  isDirty: false,
  isLoading: false,
  isInDiffMode: false,
  pendingDiff: null,
  pendingDiffQueue: [],
  acceptedGroupIds: new Set(),

  openChapter: async (chapterId: string) => {
    // Auto-save current content if dirty
    if (get().isDirty && (get().activeChapterId || get().activeSectionId)) {
      await get().saveChapter()
    }

    // If the chapter is sectioned (directory-based), redirect to its first section
    const manifest = useProjectStore.getState().manifest
    const chapterMeta = manifest?.chapters.find((ch) => ch.id === chapterId)
    if (chapterMeta?.sections && chapterMeta.sections.length > 0) {
      return get().openSection(chapterId, chapterMeta.sections[0].id)
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

      // Persist last active chapter (fire-and-forget)
      window.api.invoke(IPC.PROJECT_SAVE_LAST_CHAPTER, { chapterId }).catch(() => {})
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

      // Persist last active chapter+section (fire-and-forget)
      window.api.invoke(IPC.PROJECT_SAVE_LAST_CHAPTER, { chapterId, sectionId }).catch(() => {})
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
    const item = buildDiffItem(
      action.chapterId,
      action.oldContent,
      action.newContent,
      action.description
    )

    if (get().isInDiffMode) {
      // Already reviewing a diff — queue this one for later
      set((state) => ({
        pendingDiffQueue: [...state.pendingDiffQueue, item]
      }))
    } else {
      // No diff active — show this one immediately
      const allGroupIds = new Set(item.changeGroups.map((g) => g.id))
      set({
        isInDiffMode: true,
        pendingDiff: item,
        acceptedGroupIds: allGroupIds
      })
    }
  },

  enterSectionDiffMode: (action) => {
    const item = buildDiffItem(
      action.chapterId,
      action.oldContent,
      action.newContent,
      action.description,
      action.sectionId
    )

    if (get().isInDiffMode) {
      // Already reviewing a diff — queue this one for later
      set((state) => ({
        pendingDiffQueue: [...state.pendingDiffQueue, item]
      }))
    } else {
      // No diff active — show this one immediately
      const allGroupIds = new Set(item.changeGroups.map((g) => g.id))
      set({
        isInDiffMode: true,
        pendingDiff: item,
        acceptedGroupIds: allGroupIds
      })
    }
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

      // Reload content for the current diff's chapter/section
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
        isDirty: false
      })

      useProjectStore.getState().refreshManifest()

      // Remove the accepted action from chatStore's pendingActions (clears sidebar indicator)
      const { useChatStore } = await import('./chatStore')
      useChatStore.getState().removePendingAction(pendingDiff.chapterId, pendingDiff.sectionId)

      // Advance to next queued diff (or exit diff mode)
      await advanceToNextDiff(get, set)
    } catch (err) {
      console.error('Failed to accept changes:', err)
    }
  },

  rejectAllChanges: async () => {
    const { pendingDiff } = get()
    if (!pendingDiff) return

    window.api.invoke(IPC.AGENT_REJECT_CHANGES, {
      chapterId: pendingDiff.chapterId,
      sectionId: pendingDiff.sectionId
    }).catch((err: unknown) => {
      console.error('Failed to reject changes:', err)
    })

    // Remove the rejected action from chatStore's pendingActions (clears sidebar indicator)
    const { useChatStore } = await import('./chatStore')
    useChatStore.getState().removePendingAction(pendingDiff.chapterId, pendingDiff.sectionId)

    // Advance to next queued diff (or exit diff mode)
    await advanceToNextDiff(get, set)
  },

  exitDiffMode: () => {
    get().rejectAllChanges()
  },

  clearDiffQueue: () => {
    set({
      pendingDiffQueue: [],
      isInDiffMode: false,
      pendingDiff: null,
      acceptedGroupIds: new Set()
    })
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
      pendingDiffQueue: [],
      acceptedGroupIds: new Set(),
      inlineEdit: {
        isActive: false,
        action: null,
        selectedText: '',
        streamedText: '',
        resultText: null,
        isStreaming: false,
        error: null,
        selectionFrom: 0,
        selectionTo: 0
      }
    })
  },

  // ── Inline Edit Implementation ────────────

  inlineEdit: {
    isActive: false,
    action: null,
    selectedText: '',
    streamedText: '',
    resultText: null,
    isStreaming: false,
    error: null,
    selectionFrom: 0,
    selectionTo: 0
  },

  startInlineEdit: (action, selectedText, from, to) => {
    set({
      inlineEdit: {
        isActive: true,
        action,
        selectedText,
        streamedText: '',
        resultText: null,
        isStreaming: true,
        error: null,
        selectionFrom: from,
        selectionTo: to
      }
    })
  },

  appendInlineEditText: (text) => {
    set((state) => ({
      inlineEdit: {
        ...state.inlineEdit,
        streamedText: state.inlineEdit.streamedText + text
      }
    }))
  },

  completeInlineEdit: (fullText) => {
    set((state) => ({
      inlineEdit: {
        ...state.inlineEdit,
        isStreaming: false,
        resultText: fullText,
        streamedText: fullText
      }
    }))
  },

  setInlineEditError: (error) => {
    set((state) => ({
      inlineEdit: {
        ...state.inlineEdit,
        isStreaming: false,
        error
      }
    }))
  },

  acceptInlineEdit: () => {
    // The actual text replacement is handled by the hook/component
    // that calls this — it uses editor.commands to replace the selection
    set({
      inlineEdit: {
        isActive: false,
        action: null,
        selectedText: '',
        streamedText: '',
        resultText: null,
        isStreaming: false,
        error: null,
        selectionFrom: 0,
        selectionTo: 0
      }
    })
  },

  rejectInlineEdit: () => {
    // Cancel any ongoing stream
    window.api.invoke(IPC.INLINE_EDIT_CANCEL).catch(() => {})
    set({
      inlineEdit: {
        isActive: false,
        action: null,
        selectedText: '',
        streamedText: '',
        resultText: null,
        isStreaming: false,
        error: null,
        selectionFrom: 0,
        selectionTo: 0
      }
    })
  },

  clearInlineEdit: () => {
    window.api.invoke(IPC.INLINE_EDIT_CANCEL).catch(() => {})
    set({
      inlineEdit: {
        isActive: false,
        action: null,
        selectedText: '',
        streamedText: '',
        resultText: null,
        isStreaming: false,
        error: null,
        selectionFrom: 0,
        selectionTo: 0
      }
    })
  }
}))

/**
 * Advance to the next queued diff, or exit diff mode if the queue is empty.
 * If the next diff targets a different chapter/section, navigate there first.
 */
async function advanceToNextDiff(
  get: () => EditorState,
  set: (partial: Partial<EditorState> | ((state: EditorState) => Partial<EditorState>)) => void
): Promise<void> {
  const queue = get().pendingDiffQueue
  if (queue.length === 0) {
    // No more diffs — exit diff mode
    set({
      isInDiffMode: false,
      pendingDiff: null,
      acceptedGroupIds: new Set()
    })
    return
  }

  // Pop the first item from the queue
  const [nextDiff, ...remaining] = queue
  const allGroupIds = new Set(nextDiff.changeGroups.map((g) => g.id))

  // Check if we need to navigate to a different chapter/section
  const { activeChapterId, activeSectionId } = get()
  const needsNavigation =
    nextDiff.chapterId !== activeChapterId ||
    (nextDiff.sectionId || null) !== (activeSectionId || null)

  if (needsNavigation) {
    // Navigate to the target chapter/section first (without clearing diff state)
    try {
      if (nextDiff.sectionId) {
        const content = (await window.api.invoke(IPC.SECTION_READ, {
          chapterId: nextDiff.chapterId,
          sectionId: nextDiff.sectionId
        })) as string
        set({
          activeChapterId: nextDiff.chapterId,
          activeSectionId: nextDiff.sectionId,
          activeContent: content,
          isDirty: false,
          isLoading: false
        })
        window.api.invoke(IPC.PROJECT_SAVE_LAST_CHAPTER, {
          chapterId: nextDiff.chapterId,
          sectionId: nextDiff.sectionId
        }).catch(() => {})
      } else {
        const content = (await window.api.invoke(IPC.CHAPTER_READ, {
          chapterId: nextDiff.chapterId
        })) as string
        set({
          activeChapterId: nextDiff.chapterId,
          activeSectionId: null,
          activeContent: content,
          isDirty: false,
          isLoading: false
        })
        window.api.invoke(IPC.PROJECT_SAVE_LAST_CHAPTER, {
          chapterId: nextDiff.chapterId
        }).catch(() => {})
      }
    } catch (err) {
      console.error('Failed to navigate to next diff target:', err)
      // Skip this diff and try the next one
      set({ pendingDiffQueue: remaining })
      await advanceToNextDiff(get, set)
      return
    }
  }

  // Show the next diff
  set({
    isInDiffMode: true,
    pendingDiff: nextDiff,
    pendingDiffQueue: remaining,
    acceptedGroupIds: allGroupIds
  })
}
