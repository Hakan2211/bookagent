import i18n from '../i18n'

export function formatWordCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  const t = i18n.t.bind(i18n)

  if (diffMins < 1) return t('formatters:justNow')
  if (diffMins < 60) return t('formatters:minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('formatters:hoursAgo', { count: diffHours })
  if (diffDays < 7) return t('formatters:daysAgo', { count: diffDays })
  
  return date.toLocaleDateString(i18n.language)
}

export function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
}
