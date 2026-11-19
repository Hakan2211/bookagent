/**
 * Words-written log, kept per local calendar day across all books.
 * Only growth from the writer's own saves is counted (deleting words never
 * subtracts, AI-applied edits are not recorded).
 */
export type DayLog = Record<string, number>

const KEEP_DAYS = 90

/** Local-time YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Monday 00:00 local time of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (start.getDay() + 6) % 7 // Monday = 0
  start.setDate(start.getDate() - offset)
  return start
}

/** Return a new log with `delta` added to today's tally, pruning old days. */
export function recordWords(log: DayLog, delta: number, now: Date = new Date()): DayLog {
  if (!Number.isFinite(delta) || delta <= 0) return log
  const key = dayKey(now)
  const next: DayLog = { ...log, [key]: (log[key] ?? 0) + Math.round(delta) }
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS)
  const cutoffKey = dayKey(cutoff)
  for (const k of Object.keys(next)) if (k < cutoffKey) delete next[k]
  return next
}

/** Words written since Monday (inclusive) of the current week. */
export function wordsThisWeek(log: DayLog, now: Date = new Date()): number {
  const from = dayKey(startOfWeek(now))
  const to = dayKey(now)
  let total = 0
  for (const [k, v] of Object.entries(log)) if (k >= from && k <= to) total += v
  return total
}
