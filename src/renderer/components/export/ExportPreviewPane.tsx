import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, Loader2 } from 'lucide-react'
import { IPC } from '@shared/ipc-channels'
import type { ExportConfig } from '@shared/types'

/**
 * Live typeset preview beside the export settings. Re-renders (debounced)
 * whenever the config changes, so presets and fonts are judged by eye.
 */
export function ExportPreviewPane({ config }: { config: ExportConfig }) {
  const { t } = useTranslation('export')
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [zoom, setZoom] = useState(0.6)
  const reqId = useRef(0)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [frameHeight, setFrameHeight] = useState(1123)

  // Write the document directly and grow the frame to fit, so the outer pane scrolls.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument
    if (!html || !doc) return
    doc.open()
    doc.write(html)
    doc.close()
    const fit = () => setFrameHeight(Math.max(1123, doc.documentElement.scrollHeight))
    fit()
    const t = setTimeout(fit, 300)
    return () => clearTimeout(t)
  }, [html])

  useEffect(() => {
    const id = ++reqId.current
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const out = (await window.api.invoke(IPC.EXPORT_PREVIEW_HTML, { config })) as string
        if (id === reqId.current) setHtml(out)
      } catch {
        if (id === reqId.current) setHtml(null)
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [config])

  return (
    <div className="relative min-w-0 flex flex-col bg-[var(--bg-active)]">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-0.5">
        <button
          onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
          title={t('export:preview.zoomOut')}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <Minus size={13} />
        </button>
        <span className="w-11 text-center text-[12px] tabular text-[var(--text-secondary)]">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
          title={t('export:preview.zoomIn')}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <Plus size={13} />
        </button>
      </div>

      {loading && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
          <Loader2 size={12} className="animate-spin" />
          {t('export:preview.renderingPreview')}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {html ? (
          <div style={{ zoom }} className="py-10">
            <iframe
              ref={frameRef}
              title="preview"
              sandbox="allow-same-origin"
              className="block mx-auto bg-white border-0 shadow-[var(--shadow-lg)]"
              style={{ width: 794, height: frameHeight }}
            />
          </div>
        ) : (
          !loading && (
            <div className="h-full flex items-center justify-center font-serif italic text-[var(--text-tertiary)]">
              {t('export:preview.noPreviewAvailable')}
            </div>
          )
        )}
      </div>
    </div>
  )
}
