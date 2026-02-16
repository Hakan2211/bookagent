import DiffMatchPatch from 'diff-match-patch'
import type { TextChange, ChangeGroup } from '@shared/types'

export interface FullDiff {
  /** All raw diff segments including equals */
  allChanges: TextChange[]
  /** Non-equal segments grouped together */
  changeGroups: ChangeGroup[]
}

export function computeDiff(original: string, revised: string): ChangeGroup[] {
  return computeFullDiff(original, revised).changeGroups
}

export function computeFullDiff(original: string, revised: string): FullDiff {
  const dmp = new DiffMatchPatch()
  const rawDiffs = dmp.diff_main(original, revised)
  dmp.diff_cleanupSemantic(rawDiffs)

  const allChanges: TextChange[] = []
  let originalOffset = 0
  let revisedOffset = 0
  let changeCounter = 0

  for (const [op, text] of rawDiffs) {
    allChanges.push({
      id: `change-${changeCounter++}`,
      type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
      text,
      originalOffset,
      revisedOffset
    })

    if (op === 0 || op === -1) originalOffset += text.length
    if (op === 0 || op === 1) revisedOffset += text.length
  }

  return {
    allChanges,
    changeGroups: groupChanges(allChanges)
  }
}

function groupChanges(changes: TextChange[]): ChangeGroup[] {
  const groups: ChangeGroup[] = []
  let currentGroup: TextChange[] = []
  let groupId = 0

  for (const change of changes) {
    if (change.type === 'equal') {
      if (currentGroup.length > 0) {
        groups.push({ id: `group-${groupId++}`, changes: [...currentGroup] })
        currentGroup = []
      }
    } else {
      currentGroup.push(change)
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ id: `group-${groupId++}`, changes: [...currentGroup] })
  }

  return groups
}

/**
 * Build a map of changeId -> groupId for fast lookup.
 */
function buildChangeToGroupMap(changeGroups: ChangeGroup[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const group of changeGroups) {
    for (const change of group.changes) {
      map.set(change.id, group.id)
    }
  }
  return map
}

/**
 * Apply only accepted change groups to produce final text.
 * 
 * Walks through the full diff sequence (including equals).
 * - Equal segments are always kept.
 * - For insert/delete segments:
 *   - If their group is accepted: apply the change (include inserts, exclude deletes).
 *   - If their group is rejected: revert the change (exclude inserts, include deletes).
 */
export function applyAcceptedChanges(
  allChanges: TextChange[],
  changeGroups: ChangeGroup[],
  acceptedGroupIds: Set<string>
): string {
  const changeToGroup = buildChangeToGroupMap(changeGroups)
  const result: string[] = []

  for (const segment of allChanges) {
    if (segment.type === 'equal') {
      result.push(segment.text)
    } else {
      const groupId = changeToGroup.get(segment.id)
      const isAccepted = groupId ? acceptedGroupIds.has(groupId) : false

      if (segment.type === 'insert') {
        if (isAccepted) {
          result.push(segment.text) // Apply the insertion
        }
        // If rejected, skip the insertion (keep original)
      } else if (segment.type === 'delete') {
        if (!isAccepted) {
          result.push(segment.text) // Rejected delete = keep original text
        }
        // If accepted, skip the deleted text
      }
    }
  }

  return result.join('')
}
