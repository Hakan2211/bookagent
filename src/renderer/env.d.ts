/// <reference types="vite/client" />

interface Window {
  api: {
    invoke(channel: string, ...args: unknown[]): Promise<any>
    on(channel: string, callback: (...args: any[]) => void): () => void
    once(channel: string, callback: (...args: any[]) => void): void
  }
}
