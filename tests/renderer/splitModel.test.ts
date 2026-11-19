import { describe, expect, it } from 'vitest'
import type { ProposedChapter } from '../../src/shared/types'
import {
  buildModel,
  mergeWithNext,
  moveBreak,
  splitChapter,
  toChapters
} from '../../src/renderer/components/import/splitModel'

const ch = (title: string, text: string): ProposedChapter => ({
  index: 0,
  title,
  summary: `${title} summary`,
  text,
  startCharIndex: 0,
  endCharIndex: 0,
  wordCount: 0,
  detectedMarker: null
})

const chapters = [
  ch('Prolog', 'Prolog\n\nOne two three.\n\nFour five.'),
  ch('Kapitel 1', 'Kapitel 1\n\nSix seven.\n\n\nEight.'),
  ch('Kapitel 2', 'Kapitel 2\n\nNine ten eleven.')
]

describe('import split model', () => {
  it('round-trips chapters through paragraphs', () => {
    const m = buildModel(chapters)
    expect(m.paragraphs).toHaveLength(8)
    expect(m.starts).toEqual([0, 3, 6])
    const out = toChapters(m)
    expect(out.map((c) => c.title)).toEqual(['Prolog', 'Kapitel 1', 'Kapitel 2'])
    expect(out[1].text).toBe('Kapitel 1\n\nSix seven.\n\nEight.')
    expect(out[1].wordCount).toBe(5)
    expect(out.map((c) => c.index)).toEqual([0, 1, 2])
  })

  it('moves a break and clamps so chapters never go empty', () => {
    const m = buildModel(chapters)
    expect(moveBreak(m, 1, 2).starts).toEqual([0, 2, 6])
    expect(moveBreak(m, 1, 0).starts).toEqual([0, 1, 6])
    expect(moveBreak(m, 1, 99).starts).toEqual([0, 5, 6])
    expect(moveBreak(m, 0, 4)).toBe(m)
    const moved = toChapters(moveBreak(m, 1, 2))
    expect(moved[0].text).toBe('Prolog\n\nOne two three.')
    expect(moved[1].text.startsWith('Four five.')).toBe(true)
  })

  it('merges with the next chapter keeping the first title', () => {
    const m = mergeWithNext(buildModel(chapters), 0)
    expect(m.starts).toEqual([0, 6])
    expect(m.meta[0].title).toBe('Prolog')
    expect(m.meta[0].summary).toBe('Prolog summary Kapitel 1 summary')
    expect(toChapters(m)).toHaveLength(2)
    expect(mergeWithNext(m, 1)).toBe(m) // last chapter has no next
  })

  it('splits a chapter near its word midpoint', () => {
    const m = splitChapter(buildModel(chapters), 0, 'New')
    expect(m.starts).toEqual([0, 2, 3, 6])
    expect(m.meta[1]).toEqual({ title: 'New', summary: '' })
    const single = buildModel([ch('A', 'Only one paragraph.')])
    expect(splitChapter(single, 0, 'New')).toBe(single)
  })

  it('drops empty chapters', () => {
    const m = buildModel([ch('Empty', '  '), ...chapters])
    expect(m.meta.map((x) => x.title)).toEqual(['Prolog', 'Kapitel 1', 'Kapitel 2'])
  })
})
