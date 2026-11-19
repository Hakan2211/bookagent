import { create } from 'zustand'
import type { AICredits, AIUsageEvent } from '@shared/types'
import { IPC } from '@shared/ipc-channels'

interface UsageState {
  /** USD spent on AI since the app started. */
  sessionCost: number
  /** USD left on the OpenRouter account/key, null when unknown. */
  creditsRemaining: number | null
  addUsage: (event: AIUsageEvent) => void
  refreshCredits: () => Promise<void>
}

let creditTimer: ReturnType<typeof setTimeout> | null = null

export const useUsageStore = create<UsageState>((set, get) => ({
  sessionCost: 0,
  creditsRemaining: null,

  addUsage: (event) => {
    set((s) => ({ sessionCost: s.sessionCost + event.cost }))
    // Balance updates lag a little on OpenRouter's side; batch refreshes.
    if (creditTimer) clearTimeout(creditTimer)
    creditTimer = setTimeout(() => void get().refreshCredits(), 4_000)
  },

  refreshCredits: async () => {
    try {
      const result = (await window.api.invoke(IPC.AI_GET_CREDITS)) as AICredits
      set({ creditsRemaining: result.remaining })
    } catch {
      /* keep last known value */
    }
  }
}))
