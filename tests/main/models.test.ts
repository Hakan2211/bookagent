import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODEL,
  DEFAULT_UTILITY_MODEL,
  applyPricing,
  estimateCost,
  findModel,
  getModels,
  resolveModel
} from '../../src/main/ai/models'

describe('model catalogue', () => {
  it('contains the defaults and Gemini 4 Neon', () => {
    const ids = getModels().map((m) => m.id)
    expect(ids).toContain(DEFAULT_MODEL)
    expect(ids).toContain(DEFAULT_UTILITY_MODEL)
    expect(ids).toContain('google/gemini-4-neon')
    expect(new Set(ids).size).toBe(ids.length)
    expect(getModels().every((m) => m.supportsTools && m.pricing.input >= 0)).toBe(true)
  })

  it('falls back to the default for retired models', () => {
    expect(resolveModel('google/gemini-3-flash-preview', DEFAULT_MODEL)).toBe(DEFAULT_MODEL)
    expect(resolveModel(undefined, DEFAULT_UTILITY_MODEL)).toBe(DEFAULT_UTILITY_MODEL)
    expect(resolveModel('x-ai/grok-4.7', DEFAULT_MODEL)).toBe('x-ai/grok-4.7')
  })

  it('estimates cost from list prices', () => {
    // Sonnet 5.5: $2 in / $10 out per 1M
    expect(estimateCost('anthropic/claude-sonnet-5.5', 15_000, 4_000)).toBeCloseTo(0.07, 6)
    expect(estimateCost('unknown/model', 1000, 1000)).toBe(0)
  })

  it('applies live prices from an OpenRouter /models payload', () => {
    const updated = applyPricing({
      data: [
        { id: 'anthropic/claude-haiku-5.5', pricing: { prompt: '0.0000002', completion: '0.000001' } },
        { id: 'not/in-catalog', pricing: { prompt: '1', completion: '1' } },
        { id: 'x-ai/grok-4.7', pricing: { prompt: 'oops', completion: '0.000006' } }
      ]
    })
    expect(updated).toBe(1)
    expect(findModel('anthropic/claude-haiku-5.5')?.pricing).toEqual({ input: 0.2, output: 1 })
    expect(findModel('x-ai/grok-4.7')?.pricing).toEqual({ input: 2, output: 6 })
    expect(applyPricing({ nope: true })).toBe(0)
  })
})
