import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { AIProviderConfig } from './AIProviderConfig'
import { StyleGuideEditor } from './StyleGuideEditor'
import { ProjectSettings } from './ProjectSettings'
import { LanguageSettings } from './LanguageSettings'
import { useUIStore } from '../../stores/uiStore'

type SettingsTab = 'ai' | 'style' | 'project' | 'language'

export function SettingsModal() {
  const { t } = useTranslation('settings')
  const activeModal = useUIStore((s) => s.activeModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  const isOpen = activeModal === 'settings'

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'ai', label: t('settings:tabs.ai') },
    { id: 'style', label: t('settings:tabs.style') },
    { id: 'project', label: t('settings:tabs.project') },
    { id: 'language', label: t('settings:tabs.language') }
  ]

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title={t('settings:title')} size="lg">
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3.5 text-[15px] font-medium transition-all relative ${
              activeTab === tab.id
                ? 'text-[var(--text-accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'ai' && <AIProviderConfig />}
        {activeTab === 'style' && <StyleGuideEditor />}
        {activeTab === 'project' && <ProjectSettings />}
        {activeTab === 'language' && <LanguageSettings />}
      </div>
    </Modal>
  )
}
