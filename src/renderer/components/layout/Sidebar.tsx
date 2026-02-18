import React from 'react'
import { ProjectTree } from '../sidebar/ProjectTree'
import { useProjectStore } from '../../stores/projectStore'
import { BookOpen } from 'lucide-react'

export function Sidebar() {
  const isOpen = useProjectStore((s) => s.isOpen)

  return (
    <div className="h-full bg-[var(--bg-sidebar)] flex flex-col overflow-hidden border-r border-[var(--border-subtle)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen size={16} className="text-[var(--text-accent)]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Project
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isOpen ? (
          <ProjectTree />
        ) : (
          <div className="p-6 text-[15px] text-[var(--text-secondary)]/80">
            No project open
          </div>
        )}
      </div>
    </div>
  )
}
