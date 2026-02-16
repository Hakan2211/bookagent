import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  chatPanelCollapsed: boolean
  activeModal: string | null
  searchQuery: string
  isSearchOpen: boolean
  isImportWizardOpen: boolean

  toggleSidebar: () => void
  toggleChatPanel: () => void
  openModal: (modal: string) => void
  closeModal: () => void
  openSearch: () => void
  closeSearch: () => void
  setSearchQuery: (query: string) => void
  openImportWizard: () => void
  closeImportWizard: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  chatPanelCollapsed: false,
  activeModal: null,
  searchQuery: '',
  isSearchOpen: false,
  isImportWizardOpen: false,

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

  closeImportWizard: () => set({ isImportWizardOpen: false })
}))
