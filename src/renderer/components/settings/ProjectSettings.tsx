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

  const inputClasses = "w-full px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Book Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Author</label>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
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
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
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

      <Button variant="primary">
        Save Project Settings
      </Button>
    </div>
  )
}
