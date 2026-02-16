import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface WordCountStorage {
  words: number
  characters: number
}

export const WordCount = Extension.create<{}, WordCountStorage>({
  name: 'wordCount',

  addStorage() {
    return {
      words: 0,
      characters: 0
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: new PluginKey('wordCount'),
        view: () => ({
          update: (view) => {
            const text = view.state.doc.textContent
            extension.storage.characters = text.length
            extension.storage.words = text
              ? text.split(/\s+/).filter(Boolean).length
              : 0
          }
        })
      })
    ]
  }
})
