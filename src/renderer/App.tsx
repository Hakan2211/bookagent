import React, { useEffect, useCallback } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { WelcomeScreen } from './components/layout/WelcomeScreen'
import { ImportWizard } from './components/import/ImportWizard'
import { SettingsModal } from './components/settings/SettingsModal'
import { useProjectStore } from './stores/projectStore'
import { useUIStore } from './stores/uiStore'
import { useEditorStore } from './stores/editorStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export function App() {
  const isOpen = useProjectStore((s) => s.isOpen)
  const loadRecents = useProjectStore((s) => s.loadRecents)
  const openProject = useProjectStore((s) => s.openProject)
  const openModal = useUIStore((s) => s.openModal)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleChatPanel = useUIStore((s) => s.toggleChatPanel)
  const openImportWizard = useUIStore((s) => s.openImportWizard)
  const saveChapter = useEditorStore((s) => s.saveChapter)

  // Keyboard shortcuts
  useKeyboardShortcuts()

  // Load recents on mount
  useEffect(() => {
    loadRecents()
  }, [loadRecents])

  // Listen for menu events from main process
  const handleMenuEvent = useCallback(
    (channel: string, handler: (...args: any[]) => void) => {
      return window.api.on(channel, handler)
    },
    []
  )

  useEffect(() => {
    const unsubs = [
      handleMenuEvent('menu:settings', () => openModal('settings')),
      handleMenuEvent('menu:new-project', () => {
        // Trigger new project flow
      }),
      handleMenuEvent('menu:open-project', (path: string) => {
        openProject(path)
      }),
      handleMenuEvent('menu:import', () => openImportWizard()),
      handleMenuEvent('menu:save', () => saveChapter()),
      handleMenuEvent('menu:toggle-sidebar', () => toggleSidebar()),
      handleMenuEvent('menu:toggle-chat', () => toggleChatPanel()),
      handleMenuEvent('menu:search', () => {
        useUIStore.getState().openSearch()
      })
    ]

    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [
    handleMenuEvent,
    openModal,
    openProject,
    openImportWizard,
    saveChapter,
    toggleSidebar,
    toggleChatPanel
  ])

  return (
    <>
      {isOpen ? <AppLayout /> : <WelcomeScreen />}
      <ImportWizard />
      <SettingsModal />
    </>
  )
}
