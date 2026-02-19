import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n' // Initialize i18n before App renders
import { App } from './App'
import './styles/globals.css'
import './styles/editor.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
