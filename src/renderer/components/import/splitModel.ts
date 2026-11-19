import type { ProposedChapter } from '@shared/types'

/**
 * The manuscript as a flat list of paragraphs plus chapter break positions.
 * `starts[i]` is the paragraph index where chapter i begins; starts[0] is
 * always 0 and the list is strictly increasing.
 */
export interface SplitModel {
  paragraphs: string[]
  starts: number[]
  meta: { title: string; summary: string }[]
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function buildModel(chapters: ProposedChapter[]): SplitModel {
  const paragraphs: string[] = []
  const starts: number[] = []
  const meta: SplitModel['meta'] = []
  for (const ch of chapters) {
    const paras = splitParagraphs(ch.text)
    if (paras.length === 0) continue // empty chapters cannot hold a break
    starts.push(paragraphs.length)
    meta.push({ title: ch.title, summary: ch.summary })
    paragraphs.push(...paras)
  }
  if (starts.length === 0) {
    return { paragraphs: [], starts: [0], meta: [{ title: chapters[0]?.title ?? '', summary: '' }] }
  }
  return { paragraphs, starts, meta }
}

export function chapterRange(model: SplitModel, i: number): [number, number] {
  return [model.starts[i], model.starts[i + 1] ?? model.paragraphs.length]
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export function toChapters(model: SplitModel): ProposedChapter[] {
  let offset = 0
  return model.starts.map((_, i) => {
    const [a, b] = chapterRange(model, i)
    const text = model.paragraphs.slice(a, b).join('\n\n')
    const ch: ProposedChapter = {
      index: i,
      title: model.meta[i].title,
      summary: model.meta[i].summary,
      text,
      startCharIndex: offset,
      endCharIndex: offset + text.length,
      wordCount: countWords(text),
      detectedMarker: null
    }
    offset += text.length + 2
    return ch
  })
}

/** Lowest / highest paragraph index break `i` (i ≥ 1) may move to. */
export function breakBounds(model: SplitModel, i: number): [number, number] {
  const lo = model.starts[i - 1] + 1
  const hi = (model.starts[i + 1] ?? model.paragraphs.length) - 1
  return [lo, hi]
}

/** Move the start of chapter `i` (i ≥ 1) to paragraph `to`, clamped so no chapter becomes empty. */
export function moveBreak(model: SplitModel, i: number, to: number): SplitModel {
  if (i < 1 || i >= model.starts.length) return model
  const [lo, hi] = breakBounds(model, i)
  const clamped = Math.min(hi, Math.max(lo, Math.round(to)))
  if (clamped === model.starts[i]) return model
  const starts = [...model.starts]
  starts[i] = clamped
  return { ...model, starts }
}

/** Merge chapter `i` with the next one; the merged chapter keeps chapter i's title. */
export function mergeWithNext(model: SplitModel, i: number): SplitModel {
  if (i < 0 || i >= model.starts.length - 1) return model
  const starts = model.starts.filter((_, k) => k !== i + 1)
  const meta = model.meta.filter((_, k) => k !== i + 1)
  const a = model.meta[i].summary
  const b = model.meta[i + 1].summary
  meta[i] = { ...meta[i], summary: [a, b].filter(Boolean).join(' ') }
  return { ...model, starts, meta }
}

/** Split chapter `i` in two at its middle paragraph (by words). No-op for one-paragraph chapters. */
export function splitChapter(model: SplitModel, i: number, newTitle: string): SplitModel {
  const [a, b] = chapterRange(model, i)
  if (b - a < 2) return model
  const total = model.paragraphs.slice(a, b).reduce((s, p) => s + countWords(p), 0)
  let acc = 0
  let at = a + 1
  for (let k = a; k < b - 1; k++) {
    acc += countWords(model.paragraphs[k])
    at = k + 1
    if (acc >= total / 2) break
  }
  const starts = [...model.starts]
  starts.splice(i + 1, 0, at)
  const meta = [...model.meta]
  meta.splice(i + 1, 0, { title: newTitle, summary: '' })
  return { ...model, starts, meta }
}

export function renameChapter(model: SplitModel, i: number, title: string): SplitModel {
  const meta = [...model.meta]
  meta[i] = { ...meta[i], title }
  return { ...model, meta }
}
