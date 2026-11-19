import { describe, expect, it } from 'vitest'
import { formatCost, formatPricing, priceSigns } from '../../src/renderer/lib/cost'

describe('cost formatting', () => {
  it('formats small and large amounts', () => {
    expect(formatCost(0)).toBe('$0.00')
    expect(formatCost(0.004)).toBe('<$0.01')
    expect(formatCost(0.0712, 'en')).toBe('$0.07')
    expect(formatCost(12.3, 'en')).toBe('$12.30')
    expect(formatCost(150.4, 'en')).toBe('$150')
  })

  it('formats per-million pricing', () => {
    expect(formatPricing({ pricing: { input: 2, output: 10 } })).toBe('$2 / $10')
    expect(formatPricing({ pricing: { input: 0.1, output: 0.5 } })).toBe('$0.1 / $0.5')
    expect(formatPricing({ pricing: { input: 0.83, output: 4.12 } })).toBe('$0.83 / $4.12')
  })

  it('maps typical request cost to price signs', () => {
    expect(priceSigns({ pricing: { input: 8, output: 40 } })).toBe('$$$$')
    expect(priceSigns({ pricing: { input: 4, output: 20 } })).toBe('$$$')
    expect(priceSigns({ pricing: { input: 2, output: 10 } })).toBe('$$')
    expect(priceSigns({ pricing: { input: 0.05, output: 0.2 } })).toBe('$')
  })
})
