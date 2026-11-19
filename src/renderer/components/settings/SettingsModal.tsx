import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { AIProviderConfig } from './AIProviderConfig'
import { StyleGuideEditor } from './StyleGuideEditor'
import { ProjectSettings } from './ProjectSettings'
import { LanguageSettings } from './LanguageSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { AboutSettings } from './AboutSettings'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { Sparkles, BookOpen, FolderCog, Globe, Palette, Info } from 'lucide-react'

type SettingsTab = 'ai' | 'style' | 'project' | 'appearance' | 'language' | 'about'

export function SettingsModal() {
  const { t } = useTranslation('settings')
  const activeModal = useUIStore((s) => s.activeModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const projectOpen = useProjectStore((s) => s.isOpen)
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  const isOpen = activeModal === 'settings'

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType; needsProject?: boolean }[] = [
    { id: 'ai', label: t('settings:tabs.ai'), icon: Sparkles },
    { id: 'style', label: t('settings:tabs.style'), icon: BookOpen, needsProject: true },
    { id: 'project', label: t('settings:tabs.project'), icon: FolderCog, needsProject: true },
    { id: 'appearance', label: t('settings:tabs.appearance'), icon: Palette },
    { id: 'language', label: t('settings:tabs.language'), icon: Globe },
    { id: 'about', label: t('settings:tabs.about'), icon: Info }
  ]
  const visibleTabs = tabs.filter((tab) => !tab.needsProject || projectOpen)
  const current = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : 'ai'

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title={t('settings:title')} size="xl">
      <div className="grid grid-cols-[200px_1fr] min-h-[480px]">
        <nav className="border-r border-[var(--border)] p-3 space-y-0.5">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const active = tab.id === current
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] font-serif text-[15.5px] text-left transition-colors ${
                  active
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={16} strokeWidth={1.5} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="p-7 min-w-0">
          <h3 className="font-serif text-[28px] text-[var(--text-primary)] mb-5">
            {visibleTabs.find((tab) => tab.id === current)?.label}
          </h3>
          {current === 'ai' && <AIProviderConfig />}
          {current === 'style' && <StyleGuideEditor />}
          {current === 'project' && <ProjectSettings />}
          {current === 'appearance' && <AppearanceSettings />}
          {current === 'language' && <LanguageSettings />}
          {current === 'about' && <AboutSettings />}
        </div>
      </div>
    </Modal>
  )
}
