import React from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from './Sidebar'
import { EditorPane } from './EditorPane'
import { ChatPanel } from './ChatPanel'
import { StatusBar } from './StatusBar'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { TitleBar } from './TitleBar'
import { Library, PanelLeft, PanelRight } from 'lucide-react'

function TitleButton({
  onClick,
  title,
  active,
  children
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-7 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ${
        active === false ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </button>
  )
}

export function AppLayout() {
  const { t } = useTranslation('common')
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const chatPanelCollapsed = useUIStore((s) => s.chatPanelCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleChatPanel = useUIStore((s) => s.toggleChatPanel)
  const closeProject = useProjectStore((s) => s.closeProject)

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)]">
      <TitleBar
        right={
          <>
            <TitleButton onClick={closeProject} title={t('common:library')}>
              <Library size={15} strokeWidth={1.5} />
            </TitleButton>
            <TitleButton onClick={toggleSidebar} title={t('common:toggleSidebar')} active={!sidebarCollapsed}>
              <PanelLeft size={15} strokeWidth={1.5} />
            </TitleButton>
            <TitleButton onClick={toggleChatPanel} title={t('common:toggleEditor')} active={!chatPanelCollapsed}>
              <PanelRight size={15} strokeWidth={1.5} />
            </TitleButton>
          </>
        }
      />
      <div className="h-px bg-[var(--border)] shrink-0" />

      {/* Main content area */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="kitapmi-layout">
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
              <PanelResizeHandle className="w-px bg-[var(--border)]" />
            </>
          )}

          {/* Editor */}
          <Panel id="editor" minSize={30} order={2}>
            <EditorPane />
          </Panel>

          {/* Chat Panel */}
          {!chatPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-px bg-[var(--border)]" />
              <Panel
                id="chat"
                defaultSize={27}
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
