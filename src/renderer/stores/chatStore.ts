import { create } from 'zustand'
import type { ChatMessage, PendingAction } from '@shared/types'
import { IPC } from '@shared/ipc-channels'
import { useEditorStore } from './editorStore'
import { useProjectStore } from './projectStore'

interface ChatState {
  messages: ChatMessage[]
  isAgentWorking: boolean
  pendingActions: PendingAction[]
  toolActivity: string[]

  sendPrompt: (prompt: string) => Promise<void>
  appendStreamText: (text: string) => void
  addToolActivity: (activity: string) => void
  setAgentDone: (fullResponse: string) => void
  setAgentError: (error: string) => void
  addPendingAction: (action: PendingAction) => void
  removePendingAction: (chapterId: string, sectionId?: string) => void
  clearPendingActions: () => void
  clearHistory: () => void
  initListeners: () => () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isAgentWorking: false,
  pendingActions: [],
  toolActivity: [],

  sendPrompt: async (prompt: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
      status: 'complete'
    }

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'streaming'
    }

    // Clear any stale diff queue from the previous prompt
    useEditorStore.getState().clearDiffQueue()

    set((state) => ({
      messages: [...state.messages, userMsg, assistantMsg],
      isAgentWorking: true,
      pendingActions: [],
      toolActivity: []
    }))

    try {
      const openChapterId = useEditorStore.getState().activeChapterId
      await window.api.invoke(IPC.AGENT_PROMPT, { prompt, openChapterId })
    } catch (err) {
      get().setAgentError((err as Error).message)
    }
  },

  appendStreamText: (text: string) => {
    set((state) => {
      const messages = [...state.messages]
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'streaming') {
        messages[messages.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + text
        }
      }
      return { messages }
    })
  },

  addToolActivity: (activity: string) => {
    set((state) => ({
      toolActivity: [...state.toolActivity, activity]
    }))
  },

  setAgentDone: (fullResponse: string) => {
    set((state) => {
      const messages = [...state.messages]
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMsg,
          // Use fullResponse if available, fallback to streamed content
          content: fullResponse || lastMsg.content,
          status: 'complete'
        }
      }
      return { messages, isAgentWorking: false, toolActivity: [] }
    })
  },

  setAgentError: (error: string) => {
    set((state) => {
      const messages = [...state.messages]
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMsg,
          content: lastMsg.content || `Error: ${error}`,
          status: 'error'
        }
      }
      return { messages, isAgentWorking: false, toolActivity: [] }
    })
  },

  addPendingAction: (action: PendingAction) => {
    set((state) => ({
      pendingActions: [...state.pendingActions, action]
    }))
  },

  removePendingAction: (chapterId: string, sectionId?: string) => {
    set((state) => {
      // Find and remove the first matching pending action
      const idx = state.pendingActions.findIndex((a) => {
        if (sectionId) {
          return a.type === 'edit_section' && a.chapterId === chapterId && a.sectionId === sectionId
        }
        return a.type === 'edit' && a.chapterId === chapterId
      })
      if (idx === -1) return state
      const updated = [...state.pendingActions]
      updated.splice(idx, 1)
      return { pendingActions: updated }
    })
  },

  clearPendingActions: () => {
    set({ pendingActions: [] })
  },

  clearHistory: () => {
    set({ messages: [], pendingActions: [] })
  },

  initListeners: () => {
    const unsubStream = window.api.on(IPC.AGENT_STREAM, (data: any) => {
      get().appendStreamText(data.text)
    })

    const unsubDone = window.api.on(IPC.AGENT_DONE, (data: any) => {
      get().setAgentDone(data.fullResponse)
      // Refresh project manifest in case the agent created/modified files
      useProjectStore.getState().refreshManifest()
    })

    const unsubError = window.api.on(IPC.AGENT_ERROR, (data: any) => {
      get().setAgentError(data.error)
    })

    const unsubPlan = window.api.on(IPC.AGENT_PLAN, (data: any) => {
      get().addToolActivity(data.plan)
    })

    const unsubDiff = window.api.on(IPC.AGENT_DIFF, (action: any) => {
      get().addPendingAction(action)
      // If it's an edit action, enter diff mode in the editor
      if (action.type === 'edit') {
        useEditorStore.getState().enterDiffMode(action)
      } else if (action.type === 'edit_section') {
        useEditorStore.getState().enterSectionDiffMode(action)
      }
    })

    return () => {
      unsubStream()
      unsubDone()
      unsubError()
      unsubPlan()
      unsubDiff()
    }
  }
}))
