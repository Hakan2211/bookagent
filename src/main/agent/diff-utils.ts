import DiffMatchPatch from 'diff-match-patch'
import type { TextChange, ChangeGroup } from '@shared/types'

export function computeDiff(original: string, revised: string): ChangeGroup[] {
  const dmp = new DiffMatchPatch()
  const rawDiffs = dmp.diff_main(original, revised)
  dmp.diff_cleanupSemantic(rawDiffs)

  const changes: TextChange[] = []
  let originalOffset = 0
  let revisedOffset = 0
  let changeCounter = 0

  for (const [op, text] of rawDiffs) {
    const change: TextChange = {
      id: `change-${changeCounter++}`,
      type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
      text,
      originalOffset,
      revisedOffset
    }

    changes.push(change)

    if (op === 0 || op === -1) originalOffset += text.length
    if (op === 0 || op === 1) revisedOffset += text.length
  }

  return groupChanges(changes)
}

function groupChanges(changes: TextChange[]): ChangeGroup[] {
  const groups: ChangeGroup[] = []
  let currentGroup: TextChange[] = []
  let groupId = 0

  for (const change of changes) {
    if (change.type === 'equal') {
      if (currentGroup.length > 0) {
        groups.push({
          id: `group-${groupId++}`,
          changes: [...currentGroup]
        })
        currentGroup = []
      }
    } else {
      currentGroup.push(change)
    }
  }

  if (currentGroup.length > 0) {
    groups.push({
      id: `group-${groupId++}`,
      changes: [...currentGroup]
    })
  }

  return groups
}

export function applyAcceptedChanges(
  original: string,
  changeGroups: ChangeGroup[],
  acceptedGroupIds: Set<string>
): string {
  // Collect all changes in order
  const allChanges: Array<{ groupId: string; change: TextChange }> = []
  for (const group of changeGroups) {
    for (const change of group.changes) {
      allChanges.push({ groupId: group.id, change })
    }
  }

  // Rebuild text
  let result = ''
  let origIdx = 0

  // We need to replay the original diff to reconstruct
  // For accepted groups: apply insertions, skip deletions
  // For rejected groups: keep original text (skip insertions, keep deletions)

  const dmp = new DiffMatchPatch()
  // Reconstruct the full diff from change groups
  // This is simpler: we iterate through all changes (including 'equal' parts from original diff)
  // But we only have non-equal groups... so we need to reconstruct

  // Alternative approach: build revised text from original + accepted changes
  // Go through changeGroups and for each:
  //   - If accepted: apply the changes (remove deletions, add insertions)
  //   - If rejected: keep original (keep deletions, skip insertions)

  // Since we don't have the equal parts here, let's work with the original text
  // and apply/reject groups based on their original offsets

  // Simpler approach: construct the full text by replaying
  // We'll need to sort groups by their position in the original text
  const sortedGroups = [...changeGroups].sort((a, b) => {
    const aOffset = a.changes[0]?.originalOffset ?? 0
    const bOffset = b.changes[0]?.originalOffset ?? 0
    return aOffset - bOffset
  })

  for (const group of sortedGroups) {
    const accepted = acceptedGroupIds.has(group.id)

    for (const change of group.changes) {
      if (change.type === 'delete') {
        if (accepted) {
          // Accepted deletion: skip the original text (advance past it)
          // Add any original text before this deletion
          if (change.originalOffset > origIdx) {
            result += original.slice(origIdx, change.originalOffset)
          }
          origIdx = change.originalOffset + change.text.length
        } else {
          // Rejected deletion: keep the original text
          if (change.originalOffset > origIdx) {
            result += original.slice(origIdx, change.originalOffset)
          }
          result += change.text
          origIdx = change.originalOffset + change.text.length
        }
      } else if (change.type === 'insert') {
        if (accepted) {
          // Accepted insertion: add the new text
          if (change.originalOffset > origIdx) {
            result += original.slice(origIdx, change.originalOffset)
            origIdx = change.originalOffset
          }
          result += change.text
        }
        // Rejected insertion: skip it (don't add the text)
      }
    }
  }

  // Append remaining original text
  if (origIdx < original.length) {
    result += original.slice(origIdx)
  }

  return result
}
