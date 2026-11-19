import { describe, expect, it } from 'vitest'
import { dayKey, recordWords, startOfWeek, wordsThisWeek } from '../../src/main/stats/writingLog'

describe('writingLog', () => {
  // Thursday 2026-11-19, 14:00 local
  const thu = new Date(2026, 10, 19, 14)

  it('weeks start on Monday', () => {
    expect(dayKey(startOfWeek(thu))).toBe('2026-11-16')
    expect(dayKey(startOfWeek(new Date(2026, 10, 22)))).toBe('2026-11-16') // Sunday
    expect(dayKey(startOfWeek(new Date(2026, 10, 16)))).toBe('2026-11-16') // Monday
  })

  it('records only positive deltas', () => {
    let log = recordWords({}, 120, thu)
    log = recordWords(log, -500, thu)
    log = recordWords(log, 0, thu)
    log = recordWords(log, 30, thu)
    expect(log).toEqual({ '2026-11-19': 150 })
  })

  it('sums the current week only', () => {
    const log = {
      '2026-11-15': 999, // previous Sunday
      '2026-11-16': 400,
      '2026-11-18': 600,
      '2026-11-19': 240
    }
    expect(wordsThisWeek(log, thu)).toBe(1240)
  })

  it('prunes days older than 90 days', () => {
    const log = recordWords({ '2026-01-01': 10, '2026-11-01': 5 }, 1, thu)
    expect(log['2026-01-01']).toBeUndefined()
    expect(log['2026-11-01']).toBe(5)
  })
})
