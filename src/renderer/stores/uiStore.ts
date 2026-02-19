import { create } from 'zustand'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'

export type ApiStatusState = 'connected' | 'unavailable' | 'checking' | 'no-key'

interface UIState {
  sidebarCollapsed: boolean
  chatPanelCollapsed: boolean
  activeModal: string | null
  searchQuery: string
  isSearchOpen: boolean
  isImportWizardOpen: boolean

  apiStatus: ApiStatusState
  apiProvider: string
  apiModel: string
  apiModelName: string

  /** Cached model lists keyed by provider, for instant model name lookup */
  _modelCache: Record<string, ModelInfo[]>

  toggleSidebar: () => void
  toggleChatPanel: () => void
  openModal: (modal: string) => void
  closeModal: () => void
  openSearch: () => void
  closeSearch: () => void
  setSearchQuery: (query: string) => void
  openImportWizard: () => void
  closeImportWizard: () => void
  checkApiStatus: () => Promise<void>
  /** Instantly update the displayed model name from manifest config (no network) */
  refreshModelName: (provider: string, modelId: string) => Promise<void>
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  chatPanelCollapsed: false,
  activeModal: null,
  searchQuery: '',
  isSearchOpen: false,
  isImportWizardOpen: false,

  apiStatus: 'checking',
  apiProvider: '',
  apiModel: '',
  apiModelName: '',

  _modelCache: {},

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  toggleChatPanel: () =>
    set((state) => ({ chatPanelCollapsed: !state.chatPanelCollapsed })),

  openModal: (modal: string) => set({ activeModal: modal }),

  closeModal: () => set({ activeModal: null }),

  openSearch: () => set({ isSearchOpen: true }),

  closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  openImportWizard: () => set({ isImportWizardOpen: true }),

  closeImportWizard: () => set({ isImportWizardOpen: false }),

  refreshModelName: async (provider: string, modelId: string) => {
    if (!provider || !modelId) return

    // Set provider/model immediately so UI doesn't show stale data
    set({ apiProvider: provider, apiModel: modelId })

    // Look up friendly name from cache, or fetch the model list once
    let models = get()._modelCache[provider]
    if (!models) {
      try {
        models = (await window.api.invoke(IPC.SETTINGS_GET_MODELS, {
          provider
        })) as ModelInfo[]
        set((state) => ({
          _modelCache: { ...state._modelCache, [provider]: models! }
        }))
      } catch {
        models = []
      }
    }

    const found = models.find((m) => m.id === modelId)
    set({ apiModelName: found ? found.name : modelId })
  },

  checkApiStatus: async () => {
    // Don't overwrite the model name with 'Checking...' — keep it visible
    const prev = get()
    set({ apiStatus: 'checking' })
    try {
      const result = (await window.api.invoke(IPC.SETTINGS_CHECK_API_STATUS)) as {
        status: 'connected' | 'unavailable' | 'no-key'
        provider: string
        model: string
        modelName: string
      }
      set({
        apiStatus: result.status,
        apiProvider: result.provider,
        apiModel: result.model,
        apiModelName: result.modelName
      })
      // Cache the model list for this provider if we don't already have it
      if (result.provider && !get()._modelCache[result.provider]) {
        try {
          const models = (await window.api.invoke(IPC.SETTINGS_GET_MODELS, {
            provider: result.provider
          })) as ModelInfo[]
          set((state) => ({
            _modelCache: { ...state._modelCache, [result.provider]: models }
          }))
        } catch {
          // non-critical
        }
      }
    } catch {
      set({ apiStatus: 'unavailable', apiProvider: '', apiModel: '', apiModelName: '' })
    }
  }
}))
