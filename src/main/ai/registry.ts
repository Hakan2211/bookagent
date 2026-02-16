import type { AIProvider, AIProviderName } from '@shared/types'
import { BookProject } from '../project/BookProject'

export class AIRegistry {
  private providers = new Map<string, AIProvider>()

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider)
  }

  get(name: string): AIProvider {
    const provider = this.providers.get(name)
    if (!provider) throw new Error(`AI provider "${name}" not registered`)
    return provider
  }

  getActive(project: BookProject): AIProvider {
    return this.get(project.manifest.ai.provider)
  }

  has(name: string): boolean {
    return this.providers.has(name)
  }

  listProviders(): AIProviderName[] {
    return Array.from(this.providers.keys()) as AIProviderName[]
  }

  unregister(name: string): void {
    this.providers.delete(name)
  }
}
