import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { FileUpload } from './FileUpload'
import { ChapterPreview } from './ChapterPreview'
import { Button } from '../common/Button'
import { ProgressBar } from '../common/ProgressBar'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import type { ProposedSplit, ProposedChapter, BookMetadata } from '@shared/types'

type WizardStep = 'upload' | 'parsing' | 'review' | 'confirm'

export function ImportWizard() {
  const isOpen = useUIStore((s) => s.isImportWizardOpen)
  const closeWizard = useUIStore((s) => s.closeImportWizard)
  const openProject = useProjectStore((s) => s.openProject)

  const [step, setStep] = useState<WizardStep>('upload')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [proposedSplit, setProposedSplit] = useState<ProposedSplit | null>(null)
  const [chapters, setChapters] = useState<ProposedChapter[]>([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelected = async (path: string) => {
    setFilePath(path)
    setStep('parsing')
    setError(null)
    setIsProcessing(true)

    // Listen for progress events
    const unsub = window.api.on(IPC.IMPORT_PROGRESS, (data: any) => {
      setProgress({ step: data.step, percent: data.percent })
    })

    try {
      const result = (await window.api.invoke(IPC.IMPORT_START, {
        filePath: path,
        config: { targetChapterWords: 3000 }
      })) as ProposedSplit

      setProposedSplit(result)
      setChapters(result.chapters)
      setStep('review')
    } catch (err) {
      setError((err as Error).message)
      setStep('upload')
    } finally {
      unsub()
      setIsProcessing(false)
    }
  }

  const handleConfirm = async () => {
    if (!filePath || !proposedSplit) return
    setStep('confirm')
    setIsProcessing(true)

    try {
      const projectPath = (await window.api.invoke(IPC.DIALOG_SAVE_FOLDER)) as string | null
      if (!projectPath) {
        setStep('review')
        setIsProcessing(false)
        return
      }

      const metadata: BookMetadata = {
        title: title || 'Untitled Book',
        author: author || 'Unknown Author',
        aiProvider: 'anthropic',
        aiModel: 'claude-sonnet-4-5-20250929',
        sourceFile: filePath,
        detectedGenre: proposedSplit.detectedGenre,
        detectedPOV: proposedSplit.detectedPOV,
        detectedTense: proposedSplit.detectedTense
      }

      await window.api.invoke(IPC.IMPORT_CONFIRM, {
        projectPath,
        sourceFilePath: filePath,
        confirmedChapters: chapters.map((ch) => ({
          title: ch.title,
          text: ch.text,
          summary: ch.summary
        })),
        metadata
      })

      await openProject(projectPath)
      handleClose()
    } catch (err) {
      setError((err as Error).message)
      setStep('review')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep('upload')
    setFilePath(null)
    setProposedSplit(null)
    setChapters([])
    setTitle('')
    setAuthor('')
    setError(null)
    setIsProcessing(false)
    closeWizard()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Manuscript" size="xl">
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-600/15 border border-red-600/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && <FileUpload onFileSelected={handleFileSelected} />}

        {/* Step 2: Parsing */}
        {step === 'parsing' && (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-[var(--text-primary)] mb-2">{progress.step}</p>
            <ProgressBar value={progress.percent} showPercentage className="max-w-xs mx-auto" />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && proposedSplit && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Book Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Novel"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--border-active)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Author
                </label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--border-active)]"
                />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[var(--text-primary)]">
                {chapters.length} chapters detected ({proposedSplit.totalWords.toLocaleString()} words)
              </span>
              {proposedSplit.detectedGenre && (
                <span className="text-xs text-[var(--text-secondary)]">
                  Genre: {proposedSplit.detectedGenre} | POV: {proposedSplit.detectedPOV} | Tense: {proposedSplit.detectedTense}
                </span>
              )}
            </div>

            <ChapterPreview
              chapters={chapters}
              onUpdateChapter={(index, updates) => {
                const updated = [...chapters]
                updated[index] = { ...updated[index], ...updates }
                setChapters(updated)
              }}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button variant="primary" onClick={handleConfirm} isLoading={isProcessing}>
                Create Project
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm (creating) */}
        {step === 'confirm' && (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-[var(--text-primary)]">Creating project...</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
