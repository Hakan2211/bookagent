import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const key = new PluginKey('focusParagraph')

/**
 * Marks the top-level block containing the cursor with `is-current`.
 * Focus mode dims every other block. When the editor sits inside
 * `.focus-mode`, the caret line is also kept vertically centred
 * (typewriter scrolling).
 */
export const FocusParagraph = Extension.create({
  name: 'focusParagraph',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const { $from } = state.selection
            if ($from.depth < 1) return DecorationSet.empty
            const start = $from.before(1)
            const node = state.doc.nodeAt(start)
            if (!node) return DecorationSet.empty
            return DecorationSet.create(state.doc, [
              Decoration.node(start, start + node.nodeSize, { class: 'is-current' })
            ])
          }
        },
        view() {
          return {
            update(view, prev) {
              if (prev && prev.selection.eq(view.state.selection) && prev.doc.eq(view.state.doc)) return
              const scroller = view.dom.closest('.focus-mode .tiptap-editor') as HTMLElement | null
              if (!scroller || !view.hasFocus()) return
              const coords = view.coordsAtPos(view.state.selection.head)
              const box = scroller.getBoundingClientRect()
              const target = box.top + box.height / 2
              scroller.scrollTop += coords.top - target
            }
          }
        }
      })
    ]
  }
})
