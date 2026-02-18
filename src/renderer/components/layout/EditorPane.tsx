import React, { useState } from 'react'
import { TiptapEditor } from '../editor/TiptapEditor'
import { ChapterHeader } from '../editor/ChapterHeader'
import { ChangeReviewBar } from '../editor/ChangeReviewBar'
import { DiffOverlay } from '../editor/DiffOverlay'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { useChatStore } from '../../stores/chatStore'
import { IPC } from '@shared/ipc-channels'
import { PenLine, Upload, Sparkles, BookOpen } from 'lucide-react'

export function EditorPane() {
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const openChapter = useEditorStore((s) => s.openChapter)
  const isInDiffMode = useEditorStore((s) => s.isInDiffMode)
  const pendingDiff = useEditorStore((s) => s.pendingDiff)
  const acceptedGroupIds = useEditorStore((s) => s.acceptedGroupIds)
  const acceptChange = useEditorStore((s) => s.acceptChange)
  const rejectChange = useEditorStore((s) => s.rejectChange)
  const isOpen = useProjectStore((s) => s.isOpen)
  const manifest = useProjectStore((s) => s.manifest)
  const openImportWizard = useUIStore((s) => s.openImportWizard)
  const sendPrompt = useChatStore((s) => s.sendPrompt)

  const [creatingChapter, setCreatingChapter] = useState(false)

  const hasChapters = (manifest?.chapters.length || 0) > 0

  const handleCreateFirstChapter = async () => {
    setCreatingChapter(true)
    try {
      const result = (await window.api.invoke(IPC.CHAPTER_CREATE, {
        title: 'Chapter 1',
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
      'Help me start writing my book. Ask me about the genre, setting, main characters, and the opening scene before creating the first chapter.'
    )
  }

  // State: No project open
  if (!isOpen) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-editor)]">
        <div className="text-center" style={{ animation: 'fade-in 400ms ease-out' }}>
          <PenLine size={48} className="mx-auto mb-5 text-[var(--text-tertiary)] opacity-30" strokeWidth={1.5} />
          <p className="text-[var(--text-tertiary)] text-base">
            Open or create a project to start writing
          </p>
        </div>
      </div>
    )
  }

  // State: Project open but no chapters exist -- Getting Started
  if (!hasChapters && !activeChapterId) {
    return (
      <div
        className="h-full flex items-center justify-center bg-[var(--bg-editor)]"
        style={{ backgroundImage: 'var(--gradient-subtle)' }}
      >
        <div
          className="w-full max-w-lg px-8"
          style={{ animation: 'slide-up 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-3 tracking-tight">
              Welcome to &ldquo;{manifest?.title || 'Your Book'}&rdquo;
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Choose how you'd like to begin
            </p>
          </div>

          <div className="space-y-4">
            {/* Create First Chapter */}
            <button
              onClick={handleCreateFirstChapter}
              disabled={creatingChapter}
              className="w-full flex items-center gap-5 p-6 rounded-2xl bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-active)] hover:bg-[var(--bg-hover)] transition-all text-left disabled:opacity-50 group"
              style={{ boxShadow: 'var(--elevation-1)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center shrink-0 group-hover:bg-[var(--bg-active)] transition-colors">
                <PenLine size={20} className="text-[var(--text-accent)]" />
              </div>
              <div>
                <div className="text-[15px] font-medium text-[var(--text-primary)]">
                  {creatingChapter ? 'Creating...' : 'Create First Chapter'}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  Start writing with a blank chapter
                </div>
              </div>
            </button>

            {/* Import Manuscript */}
            <button
              onClick={openImportWizard}
              className="w-full flex items-center gap-5 p-6 rounded-2xl bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-active)] hover:bg-[var(--bg-hover)] transition-all text-left group"
              style={{ boxShadow: 'var(--elevation-1)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center shrink-0 group-hover:bg-[var(--bg-active)] transition-colors">
                <Upload size={20} className="text-[var(--color-success)]" />
              </div>
              <div>
                <div className="text-[15px] font-medium text-[var(--text-primary)]">
                  Import a Manuscript
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  Bring in a PDF, DOCX, or text file
                </div>
              </div>
            </button>

            {/* Let AI Help */}
            <button
              onClick={handleAIStart}
              className="w-full flex items-center gap-5 p-6 rounded-2xl bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-active)] hover:bg-[var(--bg-hover)] transition-all text-left group"
              style={{ boxShadow: 'var(--elevation-1)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center shrink-0 group-hover:bg-[var(--bg-active)] transition-colors">
                <Sparkles size={20} className="text-[var(--accent-secondary)]" />
              </div>
              <div>
                <div className="text-[15px] font-medium text-[var(--text-primary)]">
                  Let AI Help You Start
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  Describe your book idea and get AI-guided writing
                </div>
              </div>
            </button>
          </div>

          <p className="text-sm text-[var(--text-tertiary)] text-center mt-10">
            Tip: Use the Agent panel on the right to collaborate with AI at any time.
          </p>
        </div>
      </div>
    )
  }

  // State: Project open, chapters exist but none selected
  if (!activeChapterId) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-editor)]">
        <div className="text-center" style={{ animation: 'fade-in 400ms ease-out' }}>
          <BookOpen size={48} className="mx-auto mb-5 text-[var(--text-tertiary)] opacity-30" strokeWidth={1.5} />
          <p className="text-[var(--text-secondary)] text-base">
            Select a chapter from the sidebar to begin editing
          </p>
        </div>
      </div>
    )
  }

  // State: Chapter is open -- normal editor
  return (
    <div className="h-full flex flex-col bg-[var(--bg-editor)]">
      {isInDiffMode && <ChangeReviewBar />}
      <ChapterHeader />
      <div className="flex-1 min-h-0 overflow-hidden">
        {isInDiffMode && pendingDiff ? (
          <div className="h-full overflow-y-auto">
            <DiffOverlay
              changeGroups={pendingDiff.changeGroups}
              acceptedGroupIds={acceptedGroupIds}
              onAccept={acceptChange}
              onReject={rejectChange}
            />
          </div>
        ) : (
          <TiptapEditor />
        )}
      </div>
    </div>
  )
}
