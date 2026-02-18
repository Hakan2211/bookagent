import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { Button } from '../common/Button'

export function ProjectSettings() {
  const manifest = useProjectStore((s) => s.manifest)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [totalWords, setTotalWords] = useState(80000)
  const [chapterWords, setChapterWords] = useState(3000)

  useEffect(() => {
    if (manifest) {
      setTitle(manifest.title)
      setAuthor(manifest.author)
      setTotalWords(manifest.targets.totalWords)
      setChapterWords(manifest.targets.chapterWords)
    }
  }, [manifest])

  if (!manifest) {
    return (
      <p className="text-sm text-[var(--text-tertiary)]">
        Open a project to edit its settings.
      </p>
    )
  }

  const inputClasses = "w-full px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Book Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Author</label>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Total Word Target
          </label>
          <input
            type="number"
            value={totalWords}
            onChange={(e) => setTotalWords(Number(e.target.value))}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Chapter Word Target
          </label>
          <input
            type="number"
            value={chapterWords}
            onChange={(e) => setChapterWords(Number(e.target.value))}
            className={inputClasses}
          />
        </div>
      </div>

      <Button variant="primary" size="md">
        Save Project Settings
      </Button>
    </div>
  )
}
