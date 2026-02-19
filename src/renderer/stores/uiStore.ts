import { create } from 'zustand'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo, ExportConfig, ExportFormat, ExportProgress } from '@shared/types'

export type ApiStatusState = 'connected' | 'unavailable' | 'checking' | 'no-key'

interface UIState {
  sidebarCollapsed: boolean
  chatPanelCollapsed: boolean
  activeModal: string | null
  searchQuery: string
  isSearchOpen: boolean
  isImportWizardOpen: boolean

  // Export state
  isExportModalOpen: boolean
  exportFormat: ExportFormat | null
  exportProgress: ExportProgress | null

  // Preview state
  isPreviewMode: boolean
  previewHtml: string | null
  isPreviewLoading: boolean

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

  // Export actions
  openExportModal: (format?: ExportFormat) => void
  closeExportModal: () => void
  setExportProgress: (progress: ExportProgress | null) => void

  // Preview actions
  togglePreviewMode: () => void
  closePreview: () => void
  setPreviewHtml: (html: string | null) => void
  setPreviewLoading: (loading: boolean) => void
  loadPreview: (config: ExportConfig) => Promise<void>

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

  // Export state
  isExportModalOpen: false,
  exportFormat: null,
  exportProgress: null,

  // Preview state
  isPreviewMode: false,
  previewHtml: null,
  isPreviewLoading: false,

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

  // Export actions
  openExportModal: (format?: ExportFormat) =>
    set({ isExportModalOpen: true, exportFormat: format || null, exportProgress: null }),

  closeExportModal: () =>
    set({ isExportModalOpen: false, exportFormat: null, exportProgress: null }),

  setExportProgress: (progress: ExportProgress | null) =>
    set({ exportProgress: progress }),

  // Preview actions
  togglePreviewMode: () =>
    set((state) => ({
      isPreviewMode: !state.isPreviewMode,
      previewHtml: state.isPreviewMode ? null : state.previewHtml
    })),

  closePreview: () =>
    set({ isPreviewMode: false, previewHtml: null, isPreviewLoading: false }),

  setPreviewHtml: (html: string | null) =>
    set({ previewHtml: html }),

  setPreviewLoading: (loading: boolean) =>
    set({ isPreviewLoading: loading }),

  loadPreview: async (config: ExportConfig) => {
    set({ isPreviewLoading: true, previewHtml: null })
    try {
      const html = (await window.api.invoke(IPC.EXPORT_PREVIEW_HTML, { config })) as string
      set({ previewHtml: html, isPreviewLoading: false })
    } catch (err) {
      console.error('Failed to load preview:', err)
      set({ isPreviewLoading: false })
    }
  },

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
