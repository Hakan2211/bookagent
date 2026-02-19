import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// English
import enCommon from './locales/en/common.json'
import enWelcome from './locales/en/welcome.json'
import enEditor from './locales/en/editor.json'
import enChat from './locales/en/chat.json'
import enSettings from './locales/en/settings.json'
import enSidebar from './locales/en/sidebar.json'
import enExport from './locales/en/export.json'
import enImport from './locales/en/import.json'
import enFormatters from './locales/en/formatters.json'

// German
import deCommon from './locales/de/common.json'
import deWelcome from './locales/de/welcome.json'
import deEditor from './locales/de/editor.json'
import deChat from './locales/de/chat.json'
import deSettings from './locales/de/settings.json'
import deSidebar from './locales/de/sidebar.json'
import deExport from './locales/de/export.json'
import deImport from './locales/de/import.json'
import deFormatters from './locales/de/formatters.json'

const resources = {
  en: {
    common: enCommon,
    welcome: enWelcome,
    editor: enEditor,
    chat: enChat,
    settings: enSettings,
    sidebar: enSidebar,
    export: enExport,
    import: enImport,
    formatters: enFormatters
  },
  de: {
    common: deCommon,
    welcome: deWelcome,
    editor: deEditor,
    chat: deChat,
    settings: deSettings,
    sidebar: deSidebar,
    export: deExport,
    import: deImport,
    formatters: deFormatters
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'welcome', 'editor', 'chat', 'settings', 'sidebar', 'export', 'import', 'formatters'],
    interpolation: {
      escapeValue: false // React already safes from XSS
    },
    detection: {
      // Check localStorage first (where we persist the user's choice),
      // then fall back to navigator language
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'chapterforge-language',
      caches: ['localStorage']
    }
  })

export default i18n
