import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { Dropdown } from '../common/Dropdown'
import { Button } from '../common/Button'
import { IPC } from '@shared/ipc-channels'

export function StyleGuideEditor() {
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
        Open a project to edit its style guide.
      </p>
    )
  }

  const inputClasses = "w-full px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Genre</label>
        <input
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="e.g., literary fiction, sci-fi, thriller"
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Point of View</label>
          <Dropdown
            options={[
              { value: '', label: 'Not specified' },
              { value: 'first-person', label: 'First Person' },
              { value: 'third-limited', label: 'Third Limited' },
              { value: 'third-omniscient', label: 'Third Omniscient' },
              { value: 'second-person', label: 'Second Person' }
            ]}
            value={pov}
            onChange={setPov}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tense</label>
          <Dropdown
            options={[
              { value: '', label: 'Not specified' },
              { value: 'past', label: 'Past Tense' },
              { value: 'present', label: 'Present Tense' }
            ]}
            value={tense}
            onChange={setTense}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tone</label>
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="e.g., introspective, lyrical, fast-paced"
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Words to Avoid (comma-separated)
        </label>
        <input
          value={avoidWords}
          onChange={(e) => setAvoidWords(e.target.value)}
          placeholder="e.g., suddenly, very, really, literally"
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Custom AI Instructions
        </label>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="e.g., Short paragraphs. Show don't tell. Hemingway-esque clarity."
          rows={4}
          className={`${inputClasses} resize-y leading-relaxed`}
        />
      </div>

      <Button variant="primary" onClick={handleSave} size="md">
        Save Style Guide
      </Button>
    </div>
  )
}
