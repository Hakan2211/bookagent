import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { Dropdown } from '../common/Dropdown'
import { Button } from '../common/Button'
import { LoadingSpinner } from '../common/LoadingSpinner'
import type { ExportConfig, ExportScope, PageSize } from '@shared/types'
import { DEFAULT_EXPORT_CONFIG, PAGE_SIZE_OPTIONS, FONT_OPTIONS } from './exportDefaults'
import {
  X,
  FileDown,
  BookOpen,
  FileText,
  RefreshCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

export function BookPreview() {
  const previewHtml = useUIStore((s) => s.previewHtml)
  const isPreviewLoading = useUIStore((s) => s.isPreviewLoading)
  const loadPreview = useUIStore((s) => s.loadPreview)
  const closePreview = useUIStore((s) => s.closePreview)
  const openExportModal = useUIStore((s) => s.openExportModal)
  const manifest = useProjectStore((s) => s.manifest)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [zoom, setZoom] = useState(0.75)

  const [config, setConfig] = useState<ExportConfig>({
    ...DEFAULT_EXPORT_CONFIG,
    headerText: manifest?.title || '',
    footerText: manifest?.author || ''
  })

  const loadCurrentPreview = useCallback(() => {
    const previewConfig: ExportConfig = {
      ...config,
      chapterId: config.scope === 'chapter' ? activeChapterId || undefined : undefined
    }
    loadPreview(previewConfig)
  }, [config, activeChapterId, loadPreview])

  // Load preview on mount and when config changes
  useEffect(() => {
    loadCurrentPreview()
  }, [loadCurrentPreview])

  // Write HTML to iframe when it changes
  useEffect(() => {
    if (previewHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(previewHtml)
        doc.close()
      }
    }
  }, [previewHtml])

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 1.5))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3))

  const activeChapterTitle = manifest?.chapters.find(
    (ch) => ch.id === activeChapterId
  )?.title

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-editor)] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Preview
          </span>

          {/* Scope toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-input)] rounded-lg p-0.5 border border-[var(--border)]">
            <button
              onClick={() => setConfig((prev) => ({ ...prev, scope: 'book' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                config.scope === 'book'
                  ? 'bg-[var(--bg-active)] text-[var(--text-accent)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <BookOpen size={12} />
              Full Book
            </button>
            <button
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  scope: 'chapter',
                  chapterId: activeChapterId || undefined
                }))
              }
              disabled={!activeChapterId}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-40 ${
                config.scope === 'chapter'
                  ? 'bg-[var(--bg-active)] text-[var(--text-accent)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <FileText size={12} />
              {activeChapterTitle
                ? activeChapterTitle.length > 18
                  ? activeChapterTitle.slice(0, 18) + '...'
                  : activeChapterTitle
                : 'Chapter'}
            </button>
          </div>

          <div className="w-px h-5 bg-[var(--border)]" />

          {/* Page size */}
          <Dropdown
            options={PAGE_SIZE_OPTIONS}
            value={config.pageSize}
            onChange={(v) => setConfig((prev) => ({ ...prev, pageSize: v as PageSize }))}
            className="w-40"
          />

          {/* Font */}
          <Dropdown
            options={FONT_OPTIONS}
            value={config.fontFamily}
            onChange={(v) =>
              setConfig((prev) => ({
                ...prev,
                fontFamily: v as 'serif' | 'sans-serif' | 'monospace'
              }))
            }
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              title="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-xs text-[var(--text-secondary)] min-w-[3em] text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              title="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          <div className="w-px h-5 bg-[var(--border)]" />

          {/* Refresh */}
          <button
            onClick={loadCurrentPreview}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
            title="Refresh preview"
          >
            <RefreshCw size={15} />
          </button>

          {/* Export buttons */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openExportModal('pdf')}
          >
            <FileDown size={14} />
            Export
          </Button>

          {/* Close */}
          <button
            onClick={closePreview}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
            title="Close preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 min-h-0 overflow-auto bg-[#e0e0e0]">
        {isPreviewLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner />
              <p className="text-sm text-[var(--text-secondary)] mt-3">
                Rendering preview...
              </p>
            </div>
          </div>
        ) : previewHtml ? (
          <div
            className="flex justify-center py-6"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              minHeight: `${100 / zoom}%`
            }}
          >
            <iframe
              ref={iframeRef}
              title="Book Preview"
              sandbox="allow-same-origin"
              className="bg-white border-0 shadow-2xl"
              style={{
                width: '210mm',
                minHeight: '297mm',
                border: 'none'
              }}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BookOpen size={40} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-40" />
              <p className="text-sm text-[var(--text-secondary)]">
                No preview available
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={loadCurrentPreview}
              >
                <RefreshCw size={14} />
                Generate Preview
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
