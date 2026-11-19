import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { FileUpload } from './FileUpload'
import { SplitEditor } from './SplitEditor'
import { buildModel, toChapters, type SplitModel } from './splitModel'
import { Button } from '../common/Button'
import { ProgressBar } from '../common/ProgressBar'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import type { ProposedSplit, BookMetadata } from '@shared/types'
import { ArrowLeft, Check, Download } from 'lucide-react'

type WizardStep = 'upload' | 'parsing' | 'review' | 'confirm'

const WIZARD_STEPS = ['upload', 'review', 'confirm'] as const

/** Upload · Split · Confirm progress dots. */
function WizardSteps({ step }: { step: string }) {
  const { t } = useTranslation('import')
  const current = step === 'upload' ? 0 : step === 'parsing' ? 0 : step === 'review' ? 1 : 2
  return (
    <div className="flex items-start justify-center mb-6 -mt-1">
      {WIZARD_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-1 w-20">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-serif text-[13px] border ${
                i === current
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : i < current
                    ? 'bg-[var(--text-secondary)] border-[var(--text-secondary)] text-[var(--bg-base)]'
                    : 'border-[var(--border-strong)] text-[var(--text-tertiary)]'
              }`}
            >
              {i < current ? <Check size={13} /> : i + 1}
            </div>
            <span className={`font-serif text-[13px] ${i === current ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
              {t(`import:wizardStep.${s}`)}
            </span>
          </div>
          {i < WIZARD_STEPS.length - 1 && <div className="w-24 h-px mt-3.5 bg-[var(--border-strong)]" />}
        </React.Fragment>
      ))}
    </div>
  )
}

export function ImportWizard() {
  const { t } = useTranslation(['import', 'common'])
  const isOpen = useUIStore((s) => s.isImportWizardOpen)
  const closeWizard = useUIStore((s) => s.closeImportWizard)
  const openProject = useProjectStore((s) => s.openProject)

  const [step, setStep] = useState<WizardStep>('upload')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [proposedSplit, setProposedSplit] = useState<ProposedSplit | null>(null)
  const [model, setModel] = useState<SplitModel | null>(null)
  const chapterCount = model?.starts.length ?? 0
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
        config: { targetChapterWords: 5000 }
      })) as ProposedSplit

      setProposedSplit(result)
      setModel(buildModel(result.chapters))
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
    if (!filePath || !proposedSplit || !model) return
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
        title: title || t('import:untitledBook'),
        author: author || t('import:unknownAuthor'),
        aiProvider: 'openrouter',
        aiModel: 'google/gemini-3-flash-preview',
        sourceFile: filePath,
        detectedGenre: proposedSplit.detectedGenre,
        detectedPOV: proposedSplit.detectedPOV,
        detectedTense: proposedSplit.detectedTense
      }

      await window.api.invoke(IPC.IMPORT_CONFIRM, {
        projectPath,
        sourceFilePath: filePath,
        confirmedChapters: toChapters(model).map((ch) => ({
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
    setModel(null)
    setTitle('')
    setAuthor('')
    setError(null)
    setIsProcessing(false)
    closeWizard()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('import:importManuscript')} size="wide">
      <div className="p-6">
        <WizardSteps step={step} />
        {error && (
          <div className="mb-5 p-3 rounded-[var(--radius-md)] border border-[var(--color-error)]/40 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && <FileUpload onFileSelected={handleFileSelected} />}

        {/* Step 2: Parsing */}
        {step === 'parsing' && (
          <div className="text-center py-16">
            <LoadingSpinner size="lg" className="mx-auto mb-5" />
            <p className="font-serif text-[16px] text-[var(--text-primary)] mb-3">{progress.step}</p>
            <ProgressBar value={progress.percent} showPercentage className="max-w-xs mx-auto" />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && proposedSplit && model && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block label-caps mb-1.5">
                  {t('import:bookTitle')}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('import:myNovel')}
                  className="w-full h-10 px-3 font-serif text-[15px] bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[var(--radius-md)] text-[var(--text-primary)] outline-none focus:border-[var(--border-active)]"
                />
              </div>
              <div>
                <label className="block label-caps mb-1.5">
                  {t('import:author')}
                </label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={t('import:janeDoe')}
                  className="w-full h-10 px-3 font-serif text-[15px] bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[var(--radius-md)] text-[var(--text-primary)] outline-none focus:border-[var(--border-active)]"
                />
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="font-serif text-[18px] text-[var(--text-primary)]">
                {t('import:chaptersDetected', { count: chapterCount, words: proposedSplit.totalWords.toLocaleString() })}
              </span>
              {proposedSplit.detectedGenre && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  {proposedSplit.detectedGenre} &middot; {proposedSplit.detectedPOV} &middot; {proposedSplit.detectedTense}
                </span>
              )}
            </div>

            <SplitEditor model={model} onChange={setModel} />

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="secondary" onClick={() => setStep('upload')}>
                <ArrowLeft size={14} />
                {t('common:back')}
              </Button>
              <Button variant="primary" onClick={handleConfirm} isLoading={isProcessing}>
                <Download size={15} />
                {t('import:importChapters', { count: chapterCount })}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm (creating) */}
        {step === 'confirm' && (
          <div className="text-center py-16">
            <LoadingSpinner size="lg" className="mx-auto mb-5" />
            <p className="font-serif text-[16px] text-[var(--text-primary)]">{t('import:creatingProject')}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
