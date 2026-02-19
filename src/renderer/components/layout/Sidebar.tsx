import React from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectTree } from '../sidebar/ProjectTree'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { BookOpen, Settings } from 'lucide-react'

export function Sidebar() {
  const { t } = useTranslation('common')
  const isOpen = useProjectStore((s) => s.isOpen)
  const openModal = useUIStore((s) => s.openModal)

  return (
    <div className="h-full bg-[var(--bg-sidebar)] flex flex-col overflow-hidden border-r border-[var(--border-subtle)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen size={16} className="text-[var(--text-accent)]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {t('common:project')}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isOpen ? (
          <ProjectTree />
        ) : (
          <div className="p-6 text-[15px] text-[var(--text-secondary)]/80">
            {t('common:noProjectOpen')}
          </div>
        )}
      </div>

      {/* Footer — Settings button */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] px-4 py-3">
        <button
          onClick={() => openModal('settings')}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
        >
          <Settings size={15} />
          <span>{t('common:settings')}</span>
        </button>
      </div>
    </div>
  )
}
