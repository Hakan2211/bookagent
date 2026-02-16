import { useEffect, useRef } from 'react'

export function useAutoSave(
  content: string,
  isDirty: boolean,
  saveFunction: () => Promise<void>,
  delay: number = 1000
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isDirty) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFunction()
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [content, isDirty, delay]) // eslint-disable-line react-hooks/exhaustive-deps
}
