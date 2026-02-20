import { create } from 'zustand'
import type {
  ChatMessage,
  PendingAction,
  AgentPhase,
  AgentQuestion,
  AgentQuestionResponse,
  AgentPlan,
  PlanStep
} from '@shared/types'
import { IPC } from '@shared/ipc-channels'
import { useEditorStore } from './editorStore'
import { useProjectStore } from './projectStore'

interface ChatState {
  messages: ChatMessage[]
  isAgentWorking: boolean
  pendingActions: PendingAction[]
  toolActivity: string[]

  // ── Multi-phase workflow state ──────────────
  agentPhase: AgentPhase
  currentQuestions: AgentQuestion[] | null
  currentPlan: AgentPlan | null

  // ── Actions ────────────────────────────────
  sendPrompt: (prompt: string) => Promise<void>
  appendStreamText: (text: string) => void
  addToolActivity: (activity: string) => void
  setAgentDone: (fullResponse: string) => void
  setAgentError: (error: string) => void
  addPendingAction: (action: PendingAction) => void
  removePendingAction: (chapterId: string, sectionId?: string) => void
  clearPendingActions: () => void
  clearHistory: () => void

  // ── Multi-phase actions ────────────────────
  setAgentPhase: (phase: AgentPhase) => void
  setQuestions: (questions: AgentQuestion[]) => void
  submitQuestionAnswers: (answers: AgentQuestionResponse[]) => Promise<void>
  setPlanProposal: (plan: AgentPlan) => void
  submitPlanDecision: (decision: 'execute' | 'adjust' | 'cancel', adjustment?: string) => Promise<void>
  updateStepProgress: (stepId: string, status: PlanStep['status']) => void

  initListeners: () => () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isAgentWorking: false,
  pendingActions: [],
  toolActivity: [],

  // Multi-phase state
  agentPhase: 'done',
  currentQuestions: null,
  currentPlan: null,

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
      toolActivity: [],
      agentPhase: 'classifying',
      currentQuestions: null,
      currentPlan: null
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
          content: fullResponse || lastMsg.content,
          status: 'complete'
        }
      }
      return {
        messages,
        isAgentWorking: false,
        toolActivity: [],
        agentPhase: 'done' as AgentPhase,
        currentQuestions: null
      }
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
      return {
        messages,
        isAgentWorking: false,
        toolActivity: [],
        agentPhase: 'error' as AgentPhase,
        currentQuestions: null,
        currentPlan: null
      }
    })
  },

  addPendingAction: (action: PendingAction) => {
    set((state) => ({
      pendingActions: [...state.pendingActions, action]
    }))
  },

  removePendingAction: (chapterId: string, sectionId?: string) => {
    set((state) => {
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
    set({
      messages: [],
      pendingActions: [],
      agentPhase: 'done',
      currentQuestions: null,
      currentPlan: null
    })
    // Also clear the session on the main process
    window.api.invoke(IPC.AGENT_CLEAR_SESSION).catch(() => {})
  },

  // ── Multi-phase actions ────────────────────

  setAgentPhase: (phase: AgentPhase) => {
    set({ agentPhase: phase })
  },

  setQuestions: (questions: AgentQuestion[]) => {
    set({ currentQuestions: questions })
  },

  submitQuestionAnswers: async (answers: AgentQuestionResponse[]) => {
    set({ currentQuestions: null, agentPhase: 'planning' })
    await window.api.invoke(IPC.AGENT_QUESTIONS_RESPONSE, { answers })
  },

  setPlanProposal: (plan: AgentPlan) => {
    set({ currentPlan: plan })
  },

  submitPlanDecision: async (
    decision: 'execute' | 'adjust' | 'cancel',
    adjustment?: string
  ) => {
    if (decision === 'cancel') {
      set({ currentPlan: null, agentPhase: 'done', isAgentWorking: false })
    } else if (decision === 'execute') {
      set({ agentPhase: 'executing' })
    } else if (decision === 'adjust') {
      set({ agentPhase: 'planning' })
    }
    await window.api.invoke(IPC.AGENT_PLAN_RESPONSE, { decision, adjustment })
  },

  updateStepProgress: (stepId: string, status: PlanStep['status']) => {
    set((state) => {
      if (!state.currentPlan) return state
      const updatedSteps = state.currentPlan.steps.map((s) =>
        s.id === stepId ? { ...s, status } : s
      )
      return {
        currentPlan: { ...state.currentPlan, steps: updatedSteps }
      }
    })
  },

  initListeners: () => {
    const unsubStream = window.api.on(IPC.AGENT_STREAM, (data: any) => {
      get().appendStreamText(data.text)
    })

    const unsubDone = window.api.on(IPC.AGENT_DONE, (data: any) => {
      get().setAgentDone(data.fullResponse)
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
      if (action.type === 'edit') {
        useEditorStore.getState().enterDiffMode(action)
      } else if (action.type === 'edit_section') {
        useEditorStore.getState().enterSectionDiffMode(action)
      }
    })

    // ── Multi-phase listeners ──────────────────

    const unsubPhaseChange = window.api.on(IPC.AGENT_PHASE_CHANGE, (data: any) => {
      get().setAgentPhase(data.phase)
    })

    const unsubQuestions = window.api.on(IPC.AGENT_QUESTIONS, (data: any) => {
      get().setQuestions(data.questions)
    })

    const unsubPlanProposal = window.api.on(IPC.AGENT_PLAN_PROPOSAL, (data: any) => {
      get().setPlanProposal(data.plan)
    })

    const unsubStepProgress = window.api.on(IPC.AGENT_STEP_PROGRESS, (data: any) => {
      get().updateStepProgress(data.stepId, data.status)
    })

    return () => {
      unsubStream()
      unsubDone()
      unsubError()
      unsubPlan()
      unsubDiff()
      unsubPhaseChange()
      unsubQuestions()
      unsubPlanProposal()
      unsubStepProgress()
    }
  }
}))
