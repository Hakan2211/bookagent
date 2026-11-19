import React from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore, type Theme } from '../../stores/uiStore'

const SWATCH: Record<Theme, { bg: string; page: string; ink: string }> = {
  ink: { bg: '#121110', page: '#1A1917', ink: '#ECE6DA' },
  paper: { bg: '#F6F1E7', page: '#FFFDF8', ink: '#2A2622' }
}

export function AppearanceSettings() {
  const { t } = useTranslation('settings')
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  return (
    <div>
      <p className="font-serif text-[15px] text-[var(--text-secondary)] mb-4">{t('settings:appearance.desc')}</p>
      <div className="grid grid-cols-2 gap-4 max-w-[460px]">
        {(['ink', 'paper'] as Theme[]).map((id) => {
          const sw = SWATCH[id]
          const active = theme === id
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`rounded-[var(--radius-lg)] border p-2 text-left transition-colors ${
                active ? 'border-[var(--accent-primary)]' : 'border-[var(--border-strong)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              <div className="h-24 rounded-[var(--radius-md)] p-3 flex gap-2" style={{ background: sw.bg }}>
                <div className="w-1/4 rounded-sm" style={{ background: sw.page, opacity: 0.7 }} />
                <div className="flex-1 rounded-sm p-2 space-y-1.5" style={{ background: sw.page }}>
                  {[90, 100, 80, 95].map((w, i) => (
                    <div key={i} className="h-[3px] rounded-full" style={{ width: `${w}%`, background: sw.ink, opacity: 0.5 }} />
                  ))}
                  <div className="h-[3px] w-1/3 rounded-full bg-[#A4473A]" />
                </div>
              </div>
              <div className="mt-2 px-1 flex items-center justify-between">
                <span className="font-serif text-[15px] text-[var(--text-primary)]">{t(`settings:appearance.${id}`)}</span>
                <span
                  className={`w-3.5 h-3.5 rounded-full border ${
                    active ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--border-strong)]'
                  }`}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
