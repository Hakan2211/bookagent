import React from 'react'
import { ProjectTree } from '../sidebar/ProjectTree'
import { useProjectStore } from '../../stores/projectStore'
import { BookOpen } from 'lucide-react'

export function Sidebar() {
  const isOpen = useProjectStore((s) => s.isOpen)

  return (
    <div className="h-full bg-[var(--bg-sidebar)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={13} className="text-[var(--text-tertiary)]" />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Project
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isOpen ? (
          <ProjectTree />
        ) : (
          <div className="p-5 text-sm text-[var(--text-tertiary)]">
            No project open
          </div>
        )}
      </div>
    </div>
  )
}
