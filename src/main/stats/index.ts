import Store from 'electron-store'
import { recordWords, wordsThisWeek, type DayLog } from './writingLog'

const store = new Store<{ days: DayLog }>({ name: 'writing-log', defaults: { days: {} } })

export const writingLog = {
  record(delta: number): void {
    const before = store.get('days')
    const after = recordWords(before, delta)
    if (after !== before) store.set('days', after)
  },
  weekTotal(): number {
    return wordsThisWeek(store.get('days'))
  }
}
