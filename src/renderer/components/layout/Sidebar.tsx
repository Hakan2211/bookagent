import React from 'react'
import { ProjectTree } from '../sidebar/ProjectTree'
import { useProjectStore } from '../../stores/projectStore'

export function Sidebar() {
  const isOpen = useProjectStore((s) => s.isOpen)

  return (
    <div className="h-full bg-[var(--bg-sidebar)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border)] shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Project
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isOpen ? (
          <ProjectTree />
        ) : (
          <div className="p-4 text-sm text-[var(--text-secondary)]">
            No project open
          </div>
        )}
      </div>
    </div>
  )
}
