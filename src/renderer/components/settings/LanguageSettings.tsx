import React from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'
import { Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'de', label: 'Deutsch', flag: 'DE' }
]

export function LanguageSettings() {
  const { t } = useTranslation('settings')
  const language = useUIStore((s) => s.language)
  const setLanguage = useUIStore((s) => s.setLanguage)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          {t('settings:language.title')}
        </h3>
        <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
          {t('settings:language.description')}
        </p>
      </div>

      <div className="space-y-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
              language === lang.code
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-[var(--shadow-glow-sm)]'
                : 'border-[var(--border)] bg-[var(--bg-input)] hover:border-[var(--border-active)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold tracking-wide ${
                language === lang.code
                  ? 'bg-[var(--accent-primary)]/20 text-[var(--text-accent)]'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              }`}
            >
              {lang.flag}
            </div>
            <div className="flex-1">
              <div
                className={`text-[15px] font-medium ${
                  language === lang.code
                    ? 'text-[var(--text-accent)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {lang.label}
              </div>
            </div>
            {language === lang.code && (
              <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
            )}
          </button>
        ))}
      </div>

      <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
        {t('settings:language.switchNote')}
      </p>
    </div>
  )
}
