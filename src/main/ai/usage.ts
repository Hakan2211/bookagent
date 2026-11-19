import type { AIUsageEvent } from '@shared/types'

type Listener = (event: AIUsageEvent) => void
const listeners = new Set<Listener>()

/** Subscribe to every billed AI request. Returns an unsubscribe function. */
export function onAIUsage(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function reportAIUsage(event: AIUsageEvent): void {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (err) {
      console.warn('[usage] listener failed:', err)
    }
  }
}

let utilityModel = ''
/** Model used for import analysis and intent classification. */
export function getUtilityModel(): string {
  return utilityModel
}
export function setUtilityModel(model: string): void {
  utilityModel = model
}
