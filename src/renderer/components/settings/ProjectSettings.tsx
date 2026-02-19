import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { Button } from '../common/Button'
import { IPC } from '@shared/ipc-channels'
import type { BookManifest } from '@shared/types'

export function ProjectSettings() {
  const { t } = useTranslation('settings')
  const manifest = useProjectStore((s) => s.manifest)
  const updateManifest = useProjectStore((s) => s.updateManifest)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [totalWords, setTotalWords] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (manifest) {
      setTitle(manifest.title)
      setAuthor(manifest.author)
      setTotalWords(manifest.targets.totalWords)
    }
  }, [manifest])

  if (!manifest) {
    return (
      <p className="text-sm text-[var(--text-tertiary)]">
        {t('settings:project.openProjectToEdit')}
      </p>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaved(false)
    try {
      const updated = (await window.api.invoke(IPC.PROJECT_UPDATE_SETTINGS, {
        title: title.trim(),
        author: author.trim(),
        totalWords
      })) as BookManifest
      updateManifest(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save project settings:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all'

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {t('settings:project.bookTitle')}
        </label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {t('settings:project.author')}
        </label>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {t('settings:project.totalWordTarget')}
        </label>
        <input
          type="number"
          value={totalWords}
          onChange={(e) => setTotalWords(Number(e.target.value))}
          className={inputClasses}
        />
        <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">
          {t('settings:project.wordTargetDesc')}
        </p>
      </div>

      <Button variant="primary" size="md" onClick={handleSave} isLoading={isSaving}>
        {saved ? t('settings:project.saved') : t('settings:project.saveProjectSettings')}
      </Button>
    </div>
  )
}
