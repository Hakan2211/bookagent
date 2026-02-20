import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DiffMatchPatch from 'diff-match-patch'
import type { InlineEditState } from '../../stores/editorStore'

interface InlineDiffViewProps {
  inlineEdit: InlineEditState
  onAccept: () => void
  onReject: () => void
  onCancel: () => void
}

/**
 * Shows a word-level diff between the original selected text and the AI-generated
 * replacement. Appears below the editor toolbar when an inline edit is active.
 */
export function InlineDiffView({ inlineEdit, onAccept, onReject, onCancel }: InlineDiffViewProps) {
  const { t } = useTranslation('editor')

  const diffSegments = useMemo(() => {
    const original = inlineEdit.selectedText
    const revised = inlineEdit.streamedText

    if (!revised) return []

    const dmp = new DiffMatchPatch()
    const diffs = dmp.diff_main(original, revised)
    dmp.diff_cleanupSemantic(diffs)

    return diffs.map(([op, text], i) => ({
      id: i,
      type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
      text
    }))
  }, [inlineEdit.selectedText, inlineEdit.streamedText])

  if (!inlineEdit.isActive) return null

  return (
    <div className="inline-diff-view">
      <div className="inline-diff-header">
        <span className="inline-diff-label">
          {inlineEdit.isStreaming
            ? t('inlineEdit.generating')
            : inlineEdit.error
              ? t('inlineEdit.error')
              : t('inlineEdit.reviewChanges')}
        </span>
        {inlineEdit.action && (
          <span className="inline-diff-action">
            {t(`inlineEdit.${inlineEdit.action === 'change-tone' ? 'changeTone' : inlineEdit.action}`)}
          </span>
        )}
      </div>

      {inlineEdit.error ? (
        <div className="inline-diff-error">
          {inlineEdit.error}
        </div>
      ) : (
        <div className="inline-diff-content">
          {diffSegments.map((seg) => (
            <span
              key={seg.id}
              className={
                seg.type === 'insert'
                  ? 'diff-insert'
                  : seg.type === 'delete'
                    ? 'diff-delete'
                    : ''
              }
            >
              {seg.text}
            </span>
          ))}
          {inlineEdit.isStreaming && (
            <span className="inline-diff-cursor" />
          )}
        </div>
      )}

      <div className="inline-diff-actions">
        {inlineEdit.isStreaming ? (
          <button className="inline-diff-btn cancel" onClick={onCancel}>
            {t('inlineEdit.cancel')}
          </button>
        ) : (
          <>
            {inlineEdit.resultText && (
              <button className="inline-diff-btn accept" onClick={onAccept}>
                {t('inlineEdit.accept')}
              </button>
            )}
            <button className="inline-diff-btn reject" onClick={onReject}>
              {inlineEdit.error ? t('inlineEdit.dismiss') : t('inlineEdit.reject')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
