import React from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectTree } from '../sidebar/ProjectTree'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { Settings, Moon, Sun } from 'lucide-react'

export function Sidebar() {
  const { t } = useTranslation(['common', 'sidebar'])
  const isOpen = useProjectStore((s) => s.isOpen)
  const manifest = useProjectStore((s) => s.manifest)
  const openModal = useUIStore((s) => s.openModal)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)

  const totalWords =
    manifest?.chapters.reduce(
      (sum, ch) =>
        sum + (ch.sections?.length ? ch.sections.reduce((s, sec) => s + sec.wordCount, 0) : ch.wordCount),
      0
    ) ?? 0
  const target = manifest?.targets?.totalWords || 0
  const pct = target > 0 ? Math.min(100, (totalWords / target) * 100) : 0

  return (
    <div className="h-full bg-[var(--bg-sidebar)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {isOpen ? (
          <ProjectTree />
        ) : (
          <div className="p-6 text-[14px] text-[var(--text-secondary)]">{t('common:noProjectOpen')}</div>
        )}
      </div>

      {/* Footer — book progress + settings */}
      <div className="shrink-0 border-t border-[var(--border)] px-5 pt-3.5 pb-3">
        {manifest && (
          <div className="mb-3">
            <div className="font-serif text-[13.5px] text-[var(--text-secondary)] tabular">
              {totalWords.toLocaleString()}
              {target > 0 && <> / {target.toLocaleString()}</>} {t('common:words')}
            </div>
            {target > 0 && (
              <div className="mt-2 h-[5px] rounded-full bg-[var(--bg-active)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 -ml-1.5">
          <button
            onClick={() => openModal('settings')}
            className="flex items-center gap-2 px-1.5 py-1 rounded-[var(--radius-sm)] text-[12.5px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <Settings size={14} strokeWidth={1.5} />
            <span>{t('common:settings')}</span>
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'ink' ? t('common:themePaper') : t('common:themeInk')}
            className="ml-auto p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {theme === 'ink' ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </div>
  )
}
