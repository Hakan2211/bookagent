import type { ModelInfo, ModelTier } from '@shared/types'

/** "$0.04", "<$0.01", "$1.20", "$12" — for small per-request amounts and balances. */
export function formatCost(usd: number, locale?: string): string {
  if (!Number.isFinite(usd) || usd <= 0) return '$0.00'
  if (usd < 0.01) return '<$0.01'
  const digits = usd >= 100 ? 0 : 2
  return (
    '$' +
    usd.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })
  )
}

/** "$2 / $10" per million tokens, trimming trailing zeros. */
export function formatPricing(model: Pick<ModelInfo, 'pricing'>): string {
  const fmt = (n: number) => '$' + (n < 1 ? n.toFixed(2).replace(/0$/, '') : String(+n.toFixed(2)))
  return `${fmt(model.pricing.input)} / ${fmt(model.pricing.output)}`
}

/** Price signs from what a typical request (≈15k in, 4k out) costs. */
export function priceSigns(model: Pick<ModelInfo, 'pricing'>): string {
  const typical = (15_000 * model.pricing.input + 4_000 * model.pricing.output) / 1_000_000
  if (typical >= 0.2) return '$$$$'
  if (typical >= 0.09) return '$$$'
  if (typical >= 0.04) return '$$'
  return '$'
}

export const TIER_ORDER: ModelTier[] = ['best', 'strong', 'everyday', 'budget']
