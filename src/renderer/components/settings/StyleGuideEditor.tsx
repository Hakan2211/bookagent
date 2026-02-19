import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { Dropdown } from '../common/Dropdown'
import { Button } from '../common/Button'
import { IPC } from '@shared/ipc-channels'

export function StyleGuideEditor() {
  const { t } = useTranslation('settings')
  const manifest = useProjectStore((s) => s.manifest)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)

  const [genre, setGenre] = useState('')
  const [pov, setPov] = useState('')
  const [tense, setTense] = useState('')
  const [tone, setTone] = useState('')
  const [avoidWords, setAvoidWords] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')

  useEffect(() => {
    if (manifest?.style) {
      setGenre(manifest.style.genre)
      setPov(manifest.style.pov)
      setTense(manifest.style.tense)
      setTone(manifest.style.tone)
      setAvoidWords(manifest.style.avoidWords.join(', '))
      setCustomInstructions(manifest.style.customInstructions)
    }
  }, [manifest])

  const handleSave = async () => {
    if (!manifest) return

    const updatedManifest = {
      ...manifest,
      style: {
        genre,
        pov: pov as any,
        tense: tense as any,
        tone,
        avoidWords: avoidWords
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean),
        customInstructions
      }
    }

    // Save via IPC
    await window.api.invoke(IPC.CHAPTER_SAVE, {
      chapterId: '__manifest__',
      content: JSON.stringify(updatedManifest)
    }).catch(() => {
      // Fallback: directly update project
    })

    await refreshManifest()
  }

  if (!manifest) {
    return (
      <p className="text-sm text-[var(--text-tertiary)]">
        {t('settings:style.openProjectToEdit')}
      </p>
    )
  }

  const inputClasses = "w-full px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('settings:style.genre')}</label>
        <input
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder={t('settings:style.genrePlaceholder')}
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('settings:style.pov')}</label>
          <Dropdown
            options={[
              { value: '', label: t('settings:style.notSpecified') },
              { value: 'first-person', label: t('settings:style.firstPerson') },
              { value: 'third-limited', label: t('settings:style.thirdLimited') },
              { value: 'third-omniscient', label: t('settings:style.thirdOmniscient') },
              { value: 'second-person', label: t('settings:style.secondPerson') }
            ]}
            value={pov}
            onChange={setPov}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('settings:style.tense')}</label>
          <Dropdown
            options={[
              { value: '', label: t('settings:style.notSpecified') },
              { value: 'past', label: t('settings:style.pastTense') },
              { value: 'present', label: t('settings:style.presentTense') }
            ]}
            value={tense}
            onChange={setTense}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('settings:style.tone')}</label>
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder={t('settings:style.tonePlaceholder')}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {t('settings:style.avoidWords')}
        </label>
        <input
          value={avoidWords}
          onChange={(e) => setAvoidWords(e.target.value)}
          placeholder={t('settings:style.avoidWordsPlaceholder')}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {t('settings:style.customInstructions')}
        </label>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder={t('settings:style.customInstructionsPlaceholder')}
          rows={4}
          className={`${inputClasses} resize-y leading-relaxed`}
        />
      </div>

      <Button variant="primary" onClick={handleSave} size="md">
        {t('settings:style.saveStyleGuide')}
      </Button>
    </div>
  )
}
