import { useCallback, useEffect } from 'react'

export function useIPC() {
  const invoke = useCallback(
    async <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
      return (await window.api.invoke(channel, ...args)) as T
    },
    []
  )

  return { invoke }
}

export function useIPCEvent(
  channel: string,
  callback: (...args: any[]) => void
): void {
  useEffect(() => {
    const unsubscribe = window.api.on(channel, callback)
    return unsubscribe
  }, [channel, callback])
}
