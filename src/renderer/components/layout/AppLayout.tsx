import React from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from './Sidebar'
import { EditorPane } from './EditorPane'
import { ChatPanel } from './ChatPanel'
import { StatusBar } from './StatusBar'
import { useUIStore } from '../../stores/uiStore'

export function AppLayout() {
  const { t } = useTranslation('common')
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const chatPanelCollapsed = useUIStore((s) => s.chatPanelCollapsed)

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)]">
      {/* Title bar drag region */}
      <div
        className="h-10 flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)]/85 select-none shrink-0 border-b border-[var(--border-subtle)]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="pl-20 tracking-[0.12em] uppercase">{t('common:appName')}</span>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="chapterforge-layout">
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <>
              <Panel
                id="sidebar"
                defaultSize={18}
                minSize={14}
                maxSize={25}
                order={1}
              >
                <Sidebar />
              </Panel>
              <PanelResizeHandle className="w-px hover:w-[3px] bg-[var(--border-subtle)] hover:bg-[var(--border-active)] transition-all duration-150" />
            </>
          )}

          {/* Editor */}
          <Panel id="editor" minSize={30} order={2}>
            <EditorPane />
          </Panel>

          {/* Chat Panel */}
          {!chatPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-[2px] hover:w-[4px] bg-[var(--border-subtle)] hover:bg-[var(--border-active)] transition-all duration-150" />
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
