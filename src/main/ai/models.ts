import type { ModelInfo, ModelPricing } from '@shared/types'

import { DEFAULT_MODEL, DEFAULT_UTILITY_MODEL } from '@shared/defaultModels'

export { DEFAULT_MODEL, DEFAULT_UTILITY_MODEL }

const m = (
  id: string,
  name: string,
  tier: ModelInfo['tier'],
  strength: ModelInfo['strength'],
  input: number,
  output: number,
  contextWindow: number
): ModelInfo => ({
  id,
  name,
  tier,
  strength,
  pricing: { input, output },
  contextWindow,
  supportsTools: true,
  supportsStreaming: true
})

/**
 * Curated OpenRouter models, ordered best → budget. Prices are list prices at
 * the time of writing (USD / 1M tokens) and are refreshed from OpenRouter at
 * startup — see refreshPricing().
 */
const CATALOG: ModelInfo[] = [
  m('anthropic/claude-fable-5.2', 'Claude Fable 5.2', 'best', 'deepest', 8, 40, 1_000_000),
  m('openai/gpt-6.2-astra', 'GPT-6.2 Astra', 'best', 'reasoning', 8, 40, 1_050_000),
  m('anthropic/claude-opus-5.5', 'Claude Opus 5.5', 'strong', 'prose', 4, 20, 1_000_000),
  m('google/gemini-4-neon', 'Gemini 4 Neon', 'strong', 'balanced', 3, 15, 1_048_576),
  m('google/gemini-4-carbon', 'Gemini 4 Carbon', 'strong', 'reasoning', 2, 10, 1_048_576),
  m('anthropic/claude-sonnet-5.5', 'Claude Sonnet 5.5', 'everyday', 'prose', 2, 10, 1_000_000),
  m('openai/gpt-6.2-sol', 'GPT-6.2 Sol', 'everyday', 'balanced', 2, 10, 1_050_000),
  m('x-ai/grok-4.7', 'Grok 4.7', 'everyday', 'balanced', 2, 6, 500_000),
  m('google/gemini-4-hydrogen', 'Gemini 4 Hydrogen', 'everyday', 'longContext', 1.5, 7.5, 1_048_576),
  m('moonshotai/kimi-k3.1-pro', 'Kimi K3.1 Pro', 'budget', 'prose', 0.25, 8.8, 1_048_576),
  m('google/gemini-3.8-flash', 'Gemini 3.8 Flash', 'budget', 'fast', 0.83, 4.12, 1_048_576),
  m('anthropic/claude-haiku-5.5', 'Claude Haiku 5.5', 'budget', 'fast', 0.1, 0.5, 1_000_000),
  m('deepseek/deepseek-v4.1-flash', 'DeepSeek V4.1 Flash', 'budget', 'cheap', 0.05, 0.2, 1_048_576)
]

const livePricing = new Map<string, ModelPricing>()

export function getModels(): ModelInfo[] {
  return CATALOG.map((model) => {
    const live = livePricing.get(model.id)
    return live ? { ...model, pricing: live } : model
  })
}

export function findModel(id: string): ModelInfo | undefined {
  return getModels().find((model) => model.id === id)
}

/** Keep a stored model choice only if it is still in the catalogue. */
export function resolveModel(id: string | undefined, fallback: string): string {
  return id && CATALOG.some((model) => model.id === id) ? id : fallback
}

/** Estimate the cost of a request from list prices (used when OpenRouter doesn't report it). */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = findModel(modelId)?.pricing
  if (!pricing) return 0
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

/** Apply prices from an OpenRouter /models payload. Returns how many catalogue models were updated. */
export function applyPricing(payload: unknown): number {
  const data = (payload as { data?: unknown })?.data
  if (!Array.isArray(data)) return 0
  let updated = 0
  for (const entry of data as Array<{ id?: string; pricing?: { prompt?: string; completion?: string } }>) {
    if (!entry?.id || !CATALOG.some((model) => model.id === entry.id)) continue
    const input = Number(entry.pricing?.prompt) * 1_000_000
    const output = Number(entry.pricing?.completion) * 1_000_000
    if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) continue
    livePricing.set(entry.id, { input: round(input), output: round(output) })
    updated++
  }
  return updated
}

/** Fetch current prices from OpenRouter (public endpoint, no key needed). Never throws. */
export async function refreshPricing(): Promise<number> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) return 0
    return applyPricing(await response.json())
  } catch {
    return 0
  }
}

const round = (n: number) => Math.round(n * 10_000) / 10_000
