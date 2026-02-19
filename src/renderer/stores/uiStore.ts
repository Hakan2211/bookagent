import { create } from 'zustand'
import { IPC } from '@shared/ipc-channels'

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
}

export const useUIStore = create<UIState>((set) => ({
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

  checkApiStatus: async () => {
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
    } catch {
      set({ apiStatus: 'unavailable', apiProvider: '', apiModel: '', apiModelName: '' })
    }
  }
}))
