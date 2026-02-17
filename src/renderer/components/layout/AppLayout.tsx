import React from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from './Sidebar'
import { EditorPane } from './EditorPane'
import { ChatPanel } from './ChatPanel'
import { StatusBar } from './StatusBar'
import { useUIStore } from '../../stores/uiStore'

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const chatPanelCollapsed = useUIStore((s) => s.chatPanelCollapsed)

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)]">
      {/* Title bar drag region */}
      <div
        className="h-9 flex items-center justify-center text-[11px] font-medium text-[var(--text-tertiary)] select-none shrink-0 border-b border-[var(--border-subtle)]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="pl-20 tracking-wide uppercase">ChapterForge</span>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="chapterforge-layout">
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <>
              <Panel
                id="sidebar"
                defaultSize={15}
                minSize={12}
                maxSize={25}
                order={1}
              >
                <Sidebar />
              </Panel>
              <PanelResizeHandle className="w-px hover:w-[3px] bg-[var(--border)] hover:bg-[var(--border-active)] transition-all duration-150" />
            </>
          )}

          {/* Editor */}
          <Panel id="editor" minSize={30} order={2}>
            <EditorPane />
          </Panel>

          {/* Chat Panel */}
          {!chatPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-px hover:w-[3px] bg-[var(--border)] hover:bg-[var(--border-active)] transition-all duration-150" />
              <Panel
                id="chat"
                defaultSize={25}
                minSize={18}
                maxSize={40}
                order={3}
              >
                <ChatPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
