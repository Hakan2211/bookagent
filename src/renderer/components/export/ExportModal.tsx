import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Dropdown } from '../common/Dropdown'
import { ProgressBar } from '../common/ProgressBar'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { IPC } from '@shared/ipc-channels'
import type { ExportConfig, ExportFormat, ExportScope, ExportProgress, PageSize } from '@shared/types'
import {
  DEFAULT_EXPORT_CONFIG,
  EXPORT_PRESETS,
  PAGE_SIZE_OPTIONS,
  FONT_OPTIONS
} from './exportDefaults'
import {
  FileDown,
  BookOpen,
  FileText,
  Type,
  Layout,
  Bookmark,
  Hash,
  ChevronRight,
  Zap
} from 'lucide-react'

export function ExportModal() {
  const isOpen = useUIStore((s) => s.isExportModalOpen)
  const initialFormat = useUIStore((s) => s.exportFormat)
  const exportProgress = useUIStore((s) => s.exportProgress)
  const closeExportModal = useUIStore((s) => s.closeExportModal)
  const setExportProgress = useUIStore((s) => s.setExportProgress)
  const manifest = useProjectStore((s) => s.manifest)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)

  const [config, setConfig] = useState<ExportConfig>({
    ...DEFAULT_EXPORT_CONFIG,
    headerText: manifest?.title || '',
    footerText: manifest?.author || ''
  })

  const [isExporting, setIsExporting] = useState(false)

  // Update format when modal opens with a pre-selected format
  useEffect(() => {
    if (isOpen && initialFormat) {
      setConfig((prev) => ({ ...prev, format: initialFormat }))
    }
  }, [isOpen, initialFormat])

  // Update header/footer defaults when manifest changes
  useEffect(() => {
    if (manifest) {
      setConfig((prev) => ({
        ...prev,
        headerText: prev.headerText || manifest.title,
        footerText: prev.footerText || manifest.author
      }))
    }
  }, [manifest])

  // Listen for export progress from main process
  useEffect(() => {
    if (!isOpen) return
    const unsub = window.api.on(IPC.EXPORT_PROGRESS, (progress: unknown) => {
      const p = progress as ExportProgress
      setExportProgress(p)
      if (p.stage === 'done' || p.stage === 'error') {
        setIsExporting(false)
      }
    })
    return unsub
  }, [isOpen, setExportProgress])

  const updateConfig = useCallback(
    <K extends keyof ExportConfig>(key: K, value: ExportConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const updateMargin = useCallback(
    (side: 'top' | 'bottom' | 'left' | 'right', value: number) => {
      setConfig((prev) => ({
        ...prev,
        margins: { ...prev.margins, [side]: value }
      }))
    },
    []
  )

  const applyPreset = useCallback(
    (presetIndex: number) => {
      const preset = EXPORT_PRESETS[presetIndex]
      if (!preset) return
      setConfig((prev) => ({
        ...prev,
        ...preset.config,
        format: prev.format,
        scope: prev.scope,
        chapterId: prev.chapterId,
        headerText: prev.headerText,
        footerText: prev.footerText
      }))
    },
    []
  )

  const handleExport = async () => {
    if (!manifest) return

    // Determine file name
    const scopeLabel =
      config.scope === 'chapter' && config.chapterId
        ? manifest.chapters.find((ch) => ch.id === config.chapterId)?.title || 'Chapter'
        : manifest.title

    const extension = config.format === 'pdf' ? '.pdf' : '.epub'
    const safeName = scopeLabel.replace(/[<>:"/\\|?*]/g, '_')
    const defaultName = `${safeName}${extension}`

    const filters =
      config.format === 'pdf'
        ? [{ name: 'PDF Files', extensions: ['pdf'] }]
        : [{ name: 'EPUB Files', extensions: ['epub'] }]

    // Show save dialog
    const outputPath = (await window.api.invoke(IPC.DIALOG_SAVE_FILE, {
      defaultName,
      filters
    })) as string | null

    if (!outputPath) return

    setIsExporting(true)
    setExportProgress({ stage: 'preparing', percent: 0, message: 'Starting export...' })

    try {
      const ipcChannel = config.format === 'pdf' ? IPC.EXPORT_PDF : IPC.EXPORT_EPUB
      await window.api.invoke(ipcChannel, { config, outputPath })
    } catch (err) {
      console.error('Export failed:', err)
      setExportProgress({
        stage: 'error',
        percent: 0,
        message: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      })
      setIsExporting(false)
    }
  }

  const activeChapterTitle = manifest?.chapters.find(
    (ch) => ch.id === activeChapterId
  )?.title

  const isEpub = config.format === 'epub'

  return (
    <Modal isOpen={isOpen} onClose={closeExportModal} title="Export Book" size="xl">
      <div className="px-8 py-6">
        {/* Format & Scope row */}
        <div className="flex gap-4 mb-6">
          {/* Format selection */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateConfig('format', 'pdf')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium ${
                  config.format === 'pdf'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-active)]'
                }`}
              >
                <FileDown size={16} />
                PDF
              </button>
              <button
                onClick={() => updateConfig('format', 'epub')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium ${
                  config.format === 'epub'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-active)]'
                }`}
              >
                <BookOpen size={16} />
                EPUB
              </button>
            </div>
          </div>

          {/* Scope selection */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Scope
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateConfig('scope', 'book')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium ${
                  config.scope === 'book'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-active)]'
                }`}
              >
                <BookOpen size={16} />
                Full Book
              </button>
              <button
                onClick={() => {
                  updateConfig('scope', 'chapter')
                  if (activeChapterId) updateConfig('chapterId', activeChapterId)
                }}
                disabled={!activeChapterId}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
                  config.scope === 'chapter'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-active)]'
                }`}
              >
                <FileText size={16} />
                Chapter
              </button>
            </div>
            {config.scope === 'chapter' && activeChapterTitle && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1.5 truncate">
                Exporting: {activeChapterTitle}
              </p>
            )}
          </div>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
            Quick Presets
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {EXPORT_PRESETS.map((preset, i) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(i)}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] transition-all text-sm group"
              >
                <Zap size={13} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-secondary)]" />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Settings grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {/* Page Size */}
          {!isEpub && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                <Layout size={12} />
                Page Size
              </label>
              <Dropdown
                options={PAGE_SIZE_OPTIONS}
                value={config.pageSize}
                onChange={(v) => updateConfig('pageSize', v as PageSize)}
              />
            </div>
          )}

          {/* Font Family */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              <Type size={12} />
              Font
            </label>
            <Dropdown
              options={FONT_OPTIONS}
              value={config.fontFamily}
              onChange={(v) =>
                updateConfig('fontFamily', v as 'serif' | 'sans-serif' | 'monospace')
              }
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Font Size ({config.fontSize}pt)
            </label>
            <input
              type="range"
              min={8}
              max={18}
              step={1}
              value={config.fontSize}
              onChange={(e) => updateConfig('fontSize', Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[var(--accent-primary)] bg-[var(--bg-active)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
              <span>8pt</span>
              <span>18pt</span>
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Line Spacing ({config.lineSpacing.toFixed(1)})
            </label>
            <input
              type="range"
              min={1.0}
              max={2.5}
              step={0.1}
              value={config.lineSpacing}
              onChange={(e) => updateConfig('lineSpacing', Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[var(--accent-primary)] bg-[var(--bg-active)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
              <span>Single</span>
              <span>2.5x</span>
            </div>
          </div>

          {/* Margins (PDF only) */}
          {!isEpub && (
            <div className="col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                Margins (mm)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <div key={side}>
                    <label className="block text-[10px] text-[var(--text-tertiary)] mb-1 capitalize">
                      {side}
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={config.margins[side]}
                      onChange={(e) => updateMargin(side, Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content options */}
          <div className="col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
              <Bookmark size={12} />
              Content Options
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeTitlePage}
                  onChange={(e) => updateConfig('includeTitlePage', e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent-primary)]"
                />
                Title page
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeTableOfContents}
                  onChange={(e) =>
                    updateConfig('includeTableOfContents', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent-primary)]"
                />
                Table of contents
              </label>
              {!isEpub && (
                <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showPageNumbers}
                    onChange={(e) =>
                      updateConfig('showPageNumbers', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent-primary)]"
                  />
                  Page numbers
                </label>
              )}
            </div>
          </div>

          {/* Header / Footer (PDF only) */}
          {!isEpub && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                  <Hash size={12} />
                  Header Text
                </label>
                <input
                  type="text"
                  value={config.headerText}
                  onChange={(e) => updateConfig('headerText', e.target.value)}
                  placeholder="e.g. Book title"
                  className="w-full px-4 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-active)] focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={config.footerText}
                  onChange={(e) => updateConfig('footerText', e.target.value)}
                  placeholder="e.g. Author name"
                  className="w-full px-4 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-active)] focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Progress bar */}
        {exportProgress && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
            <ProgressBar
              value={exportProgress.percent}
              showPercentage
              color={
                exportProgress.stage === 'error'
                  ? 'yellow'
                  : exportProgress.stage === 'done'
                    ? 'green'
                    : 'accent'
              }
              label={exportProgress.message}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={closeExportModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleExport}
            isLoading={isExporting}
            disabled={isExporting || exportProgress?.stage === 'done'}
          >
            {exportProgress?.stage === 'done' ? (
              'Exported!'
            ) : (
              <>
                <FileDown size={16} />
                Export as {config.format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
