import { Extension } from '@tiptap/core'

export const DiffHighlight = Extension.create({
  name: 'diffHighlight'
  // Full ProseMirror plugin implementation will be added post-MVP
  // For MVP, diffs are shown via the ChangeReviewBar + DiffOverlay
})
