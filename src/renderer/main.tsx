import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n' // Initialize i18n before App renders
import { App } from './App'
import './styles/globals.css'
import './styles/editor.css'
import { useUIStore } from './stores/uiStore'
import { useEditorStore } from './stores/editorStore'
import { useProjectStore } from './stores/projectStore'
import { useChatStore } from './stores/chatStore'

// Store handles for the dev screenshot hook (KITAPMI_EVAL) and debugging.
;(window as any).__kitapmi = {
  ui: useUIStore,
  editor: useEditorStore,
  project: useProjectStore,
  chat: useChatStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
