import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TiptapEditor } from '../editor/TiptapEditor'
import { ChapterHeader } from '../editor/ChapterHeader'
import { ChangeReviewBar } from '../editor/ChangeReviewBar'
import { DiffOverlay } from '../editor/DiffOverlay'
import { BookPreview } from '../export/BookPreview'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { useChatStore } from '../../stores/chatStore'
import { IPC } from '@shared/ipc-channels'
import { PenLine, Upload, Sparkles, BookOpen, ChevronRight } from 'lucide-react'

/** Line drawing of an open notebook with a fountain pen and a sprig. */
function OpenBookIllustration() {
  return (
    <svg width="300" height="170" viewBox="0 0 300 170" fill="none" aria-hidden className="text-[var(--text-secondary)]">
      {/* sprig */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.55">
        <path d="M70 120 C 66 90, 72 60, 92 30" />
        {[[72,98,-1],[71,84,1],[74,70,-1],[79,56,1],[85,44,-1]].map(([x,y,d],i)=>(
          <ellipse key={i} cx={x + d * 7} cy={y} rx="7" ry="2.6" transform={`rotate(${d * -35} ${x + d * 7} ${y})`} />
        ))}
      </g>
      {/* pages */}
      <path d="M150 58 C 128 48, 98 46, 72 52 L 72 142 C 98 136, 128 138, 150 148 Z" fill="var(--bg-page)" stroke="currentColor" strokeWidth="1.2" />
      <path d="M150 58 C 172 48, 202 46, 228 52 L 228 142 C 202 136, 172 138, 150 148 Z" fill="var(--bg-page)" stroke="currentColor" strokeWidth="1.2" />
      <path d="M150 58 L 150 148" stroke="currentColor" strokeWidth="1" />
      {[0,1,2,3].map((i)=>(<path key={i} d={`M66 ${146 + i * 2.2} C 98 ${140 + i * 2.2}, 128 ${142 + i * 2.2}, 150 ${152 + i * 2.2} C 172 ${142 + i * 2.2}, 202 ${140 + i * 2.2}, 234 ${146 + i * 2.2}`} stroke="currentColor" strokeWidth="0.6" opacity={0.5 - i * 0.1} />))}
      {/* ribbon */}
      <path d="M156 148 L 156 166 L 160 161 L 164 166 L 164 149" fill="var(--accent-primary)" />
      {/* pen */}
      <g transform="rotate(-32 205 95)">
        <rect x="160" y="91" width="78" height="9" rx="4.5" fill="currentColor" opacity="0.85" />
        <rect x="198" y="91" width="6" height="9" fill="#C9A35E" />
        <path d="M160 91 L 146 95.5 L 160 100 Z" fill="#C9A35E" />
      </g>
    </svg>
  )
}

export function EditorPane() {
  const { t } = useTranslation(['editor', 'common', 'chat'])
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const openChapter = useEditorStore((s) => s.openChapter)
  const isInDiffMode = useEditorStore((s) => s.isInDiffMode)
  const pendingDiff = useEditorStore((s) => s.pendingDiff)
  const acceptedGroupIds = useEditorStore((s) => s.acceptedGroupIds)
  const acceptChange = useEditorStore((s) => s.acceptChange)
  const rejectChange = useEditorStore((s) => s.rejectChange)
  const isOpen = useProjectStore((s) => s.isOpen)
  const manifest = useProjectStore((s) => s.manifest)
  const openImportWizard = useUIStore((s) => s.openImportWizard)
  const isPreviewMode = useUIStore((s) => s.isPreviewMode)
  const sendPrompt = useChatStore((s) => s.sendPrompt)

  const [creatingChapter, setCreatingChapter] = useState(false)

  const hasChapters = (manifest?.chapters.length || 0) > 0

  const handleCreateFirstChapter = async () => {
    setCreatingChapter(true)
    try {
      const result = (await window.api.invoke(IPC.CHAPTER_CREATE, {
        title: t('common:chapterNum', { num: 1 }),
        content: ''
      })) as { id: string }
      await useProjectStore.getState().refreshManifest()
      await openChapter(result.id)
    } catch (err) {
      console.error('Failed to create chapter:', err)
    } finally {
      setCreatingChapter(false)
    }
  }

  const handleAIStart = () => {
    sendPrompt(
      t('chat:aiStartPrompt')
    )
  }

  // State: No project open
  if (!isOpen) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-editor)]">
        <div className="text-center" style={{ animation: 'fade-in 400ms ease-out' }}>
          <PenLine size={40} className="mx-auto mb-4 text-[var(--text-tertiary)]" strokeWidth={1} />
          <p className="font-serif italic text-[var(--text-tertiary)] text-[17px]">
            {t('editor:openOrCreate')}
          </p>
        </div>
      </div>
    )
  }

  // State: Project open but no chapters exist -- Getting Started
  if (!hasChapters && !activeChapterId) {
    const options = [
      {
        key: 'write',
        icon: <PenLine size={19} strokeWidth={1.5} />,
        primary: true,
        label: t('editor:emptyStartWriting'),
        onClick: handleCreateFirstChapter,
        disabled: creatingChapter
      },
      {
        key: 'outline',
        icon: <Sparkles size={19} strokeWidth={1.5} />,
        label: t('editor:emptyOutlineAI'),
        onClick: handleAIStart
      },
      {
        key: 'import',
        icon: <Upload size={19} strokeWidth={1.5} />,
        label: t('editor:emptyImport'),
        hint: '(PDF, DOCX, TXT)',
        onClick: openImportWizard
      }
    ]
    return (
      <div className="h-full overflow-y-auto bg-[var(--bg-editor)]">
        <div
          className="min-h-full flex flex-col items-center justify-center px-8 py-10"
          style={{ animation: 'slide-up 500ms var(--ease-out-expo)' }}
        >
          <OpenBookIllustration />
          <h2 className="mt-4 font-serif text-[40px] leading-tight text-center text-[var(--text-primary)]">
            {t('editor:emptyHeadline')}
          </h2>
          <p className="mt-2 font-serif italic text-[17px] text-center text-[var(--text-secondary)]">
            {t('editor:emptySub')}
          </p>

          <div className="mt-8 w-full max-w-[500px] space-y-3">
            {options.map((o) => (
              <button
                key={o.key}
                onClick={o.onClick}
                disabled={o.disabled}
                className={`group w-full flex items-center gap-4 p-2.5 pr-4 rounded-[var(--radius-lg)] border text-left transition-colors disabled:opacity-50 ${
                  o.primary
                    ? 'border-[var(--accent-primary)]/60 hover:bg-[var(--accent-tint)]'
                    : 'border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span
                  className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-[var(--radius-md)] ${
                    o.primary
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                      : 'bg-[var(--bg-active)] text-[var(--text-secondary)]'
                  }`}
                >
                  {o.icon}
                </span>
                <span className="flex-1 font-serif text-[17px] text-[var(--text-primary)]">
                  {o.label}
                  {o.hint && <span className="ml-1.5 text-[13px] text-[var(--text-tertiary)]">{o.hint}</span>}
                </span>
                <ChevronRight size={17} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // State: Project open, chapters exist but none selected (or stale reference to deleted chapter)
  const chapterExists = manifest?.chapters.some((ch) => ch.id === activeChapterId)
  if (!activeChapterId || !chapterExists) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-editor)]">
        <div className="text-center" style={{ animation: 'fade-in 400ms ease-out' }}>
          <BookOpen size={40} className="mx-auto mb-4 text-[var(--text-tertiary)]" strokeWidth={1} />
          <p className="font-serif italic text-[var(--text-secondary)] text-[17px]">
            {t('editor:selectChapter')}
          </p>
        </div>
      </div>
    )
  }

  // State: Preview mode active
  if (isPreviewMode) {
    return <BookPreview />
  }

  // State: Chapter (or section) is open -- normal editor
  return (
    <div className="h-full flex flex-col bg-[var(--bg-editor)]">
      {isInDiffMode && <ChangeReviewBar />}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isInDiffMode && pendingDiff ? (
          <div className="h-full overflow-y-auto px-10">
            <div className="max-w-[1000px] mx-auto">
              <div className="max-w-[680px]">
                <ChapterHeader />
              </div>
            </div>
            <DiffOverlay
              allChanges={pendingDiff.allChanges}
              changeGroups={pendingDiff.changeGroups}
              acceptedGroupIds={acceptedGroupIds}
              onAccept={acceptChange}
              onReject={rejectChange}
            />
          </div>
        ) : (
          <TiptapEditor header={<ChapterHeader />} />
        )}
      </div>
    </div>
  )
}
