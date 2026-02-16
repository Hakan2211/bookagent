// This hook is a thin wrapper — react-resizable-panels handles most logic
// We just persist panel sizes to settings

import { useCallback } from 'react'
import { IPC } from '@shared/ipc-channels'

export function useResizablePanels() {
  const onSidebarResize = useCallback((sizes: number[]) => {
    if (sizes[0]) {
      window.api.invoke(IPC.SETTINGS_SET, { sidebarWidth: sizes[0] })
    }
  }, [])

  const onChatResize = useCallback((sizes: number[]) => {
    if (sizes[2]) {
      window.api.invoke(IPC.SETTINGS_SET, { chatPanelWidth: sizes[2] })
    }
  }, [])

  return { onSidebarResize, onChatResize }
}
