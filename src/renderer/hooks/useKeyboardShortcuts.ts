import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'

export function useKeyboardShortcuts(): void {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleChatPanel = useUIStore((s) => s.toggleChatPanel)
  const openSearch = useUIStore((s) => s.openSearch)
  const openExportModal = useUIStore((s) => s.openExportModal)
  const togglePreviewMode = useUIStore((s) => s.togglePreviewMode)
  const isPreviewMode = useUIStore((s) => s.isPreviewMode)
  const closePreview = useUIStore((s) => s.closePreview)
  const saveChapter = useEditorStore((s) => s.saveChapter)
  const exitDiffMode = useEditorStore((s) => s.exitDiffMode)
  const isInDiffMode = useEditorStore((s) => s.isInDiffMode)
  const manifest = useProjectStore((s) => s.manifest)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const openChapter = useEditorStore((s) => s.openChapter)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl + B: Toggle sidebar
      if (isMod && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }

      // Cmd/Ctrl + J: Toggle chat panel
      if (isMod && e.key === 'j') {
        e.preventDefault()
        toggleChatPanel()
      }

      // Cmd/Ctrl + S: Save
      if (isMod && e.key === 's') {
        e.preventDefault()
        saveChapter()
      }

      // Cmd/Ctrl + Shift + F: Search
      if (isMod && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        openSearch()
      }

      // Cmd/Ctrl + Shift + E: Export
      if (isMod && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        openExportModal()
      }

      // Cmd/Ctrl + Shift + P: Toggle preview
      if (isMod && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        togglePreviewMode()
      }

      // Escape: Exit diff mode or preview
      if (e.key === 'Escape' && isPreviewMode) {
        e.preventDefault()
        closePreview()
      } else if (e.key === 'Escape' && isInDiffMode) {
        e.preventDefault()
        exitDiffMode()
      }

      // Cmd/Ctrl + Up/Down: Navigate chapters
      if (isMod && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && manifest) {
        e.preventDefault()
        const chapters = manifest.chapters
        const currentIdx = chapters.findIndex((ch) => ch.id === activeChapterId)

        if (e.key === 'ArrowUp' && currentIdx > 0) {
          openChapter(chapters[currentIdx - 1].id)
        } else if (e.key === 'ArrowDown' && currentIdx < chapters.length - 1) {
          openChapter(chapters[currentIdx + 1].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    toggleSidebar,
    toggleChatPanel,
    saveChapter,
    openSearch,
    openExportModal,
    togglePreviewMode,
    isPreviewMode,
    closePreview,
    exitDiffMode,
    isInDiffMode,
    manifest,
    activeChapterId,
    openChapter
  ])
}
