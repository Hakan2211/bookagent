import React from 'react'
import { TiptapEditor } from '../editor/TiptapEditor'
import { ChapterHeader } from '../editor/ChapterHeader'
import { ChangeReviewBar } from '../editor/ChangeReviewBar'
import { DiffOverlay } from '../editor/DiffOverlay'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'

export function EditorPane() {
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const isInDiffMode = useEditorStore((s) => s.isInDiffMode)
  const pendingDiff = useEditorStore((s) => s.pendingDiff)
  const acceptedGroupIds = useEditorStore((s) => s.acceptedGroupIds)
  const acceptChange = useEditorStore((s) => s.acceptChange)
  const rejectChange = useEditorStore((s) => s.rejectChange)
  const isOpen = useProjectStore((s) => s.isOpen)

  if (!isOpen || !activeChapterId) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-editor)]">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-20">&#9997;</div>
          <p className="text-[var(--text-secondary)] text-sm">
            {isOpen
              ? 'Select a chapter from the sidebar to begin editing'
              : 'Open or create a project to start writing'}
          </p>
        </div>
      </div>
    )
  }

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
