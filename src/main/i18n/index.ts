import enMenu from './locales/en/menu.json'
import deMenu from './locales/de/menu.json'

const translations: Record<string, Record<string, string>> = {
  en: enMenu,
  de: deMenu
}

let currentLanguage = 'en'

export function setMainProcessLanguage(lang: string): void {
  if (translations[lang]) {
    currentLanguage = lang
  }
}

export function getMainProcessLanguage(): string {
  return currentLanguage
}

export function t(key: string): string {
  return translations[currentLanguage]?.[key] || translations.en[key] || key
}
