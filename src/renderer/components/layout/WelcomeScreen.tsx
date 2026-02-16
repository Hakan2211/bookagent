import React, { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { IPC } from '@shared/ipc-channels'
import { formatDate } from '../../lib/formatters'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'

export function WelcomeScreen() {
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const openProject = useProjectStore((s) => s.openProject)
  const openModal = useUIStore((s) => s.openModal)
  const openImportWizard = useUIStore((s) => s.openImportWizard)

  const [showNewBookModal, setShowNewBookModal] = useState(false)
  const [newBookPath, setNewBookPath] = useState<string | null>(null)
  const [newBookTitle, setNewBookTitle] = useState('My Novel')
  const [newBookAuthor, setNewBookAuthor] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNewBook = async () => {
    const path = (await window.api.invoke(IPC.DIALOG_SAVE_FOLDER)) as string | null
    if (!path) return

    setNewBookPath(path)
    setNewBookTitle('My Novel')
    setNewBookAuthor('')
    setError(null)
    setShowNewBookModal(true)
  }

  const handleCreateProject = async () => {
    if (!newBookPath || !newBookTitle.trim()) return

    setCreating(true)
    setError(null)

    try {
      const createProject = useProjectStore.getState().createProject
      await createProject(newBookPath, {
        title: newBookTitle.trim(),
        author: newBookAuthor.trim(),
        aiProvider: 'anthropic',
        aiModel: 'claude-sonnet-4-5-20250929'
      })
      setShowNewBookModal(false)
    } catch (err) {
      setError(`Failed to create project: ${(err as Error).message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleOpenBook = async () => {
    const path = (await window.api.invoke(IPC.DIALOG_OPEN_FOLDER)) as string | null
    if (path) {
      try {
        await openProject(path)
      } catch (err) {
        setError(`Failed to open project: ${(err as Error).message}`)
      }
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-[var(--bg-base)]">
      <div className="text-center max-w-lg w-full px-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">
          ChapterForge
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-8">
          AI-powered book writing IDE
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={handleNewBook}
            className="p-4 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-active)] transition-colors text-left"
          >
            <div className="text-lg mb-1">+</div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              New Book
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Start fresh
            </div>
          </button>

          <button
            onClick={handleOpenBook}
            className="p-4 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-active)] transition-colors text-left"
          >
            <div className="text-lg mb-1">&#128193;</div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Open Existing
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Open a folder
            </div>
          </button>

          <button
            onClick={openImportWizard}
            className="p-4 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-active)] transition-colors text-left"
          >
            <div className="text-lg mb-1">&#128196;</div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Import File
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              PDF or DOCX
            </div>
          </button>

          <button
            onClick={() => openModal('settings')}
            className="p-4 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-active)] transition-colors text-left"
          >
            <div className="text-lg mb-1">&#9881;</div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Settings
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              API keys
            </div>
          </button>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="text-left">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Recent Projects
            </h3>
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => openProject(project.path)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="text-sm text-[var(--text-primary)]">
                    {project.title}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {project.path} — {formatDate(project.lastOpened)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Book Modal */}
      <Modal
        isOpen={showNewBookModal}
        onClose={() => setShowNewBookModal(false)}
        title="Create New Book"
      >
        <div className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Location
            </label>
            <div className="text-sm text-[var(--text-primary)] bg-[var(--bg-input)] rounded px-3 py-2 border border-[var(--border)]">
              {newBookPath}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Book Title
            </label>
            <input
              type="text"
              value={newBookTitle}
              onChange={(e) => setNewBookTitle(e.target.value)}
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-active)]"
              placeholder="My Novel"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Author Name
            </label>
            <input
              type="text"
              value={newBookAuthor}
              onChange={(e) => setNewBookAuthor(e.target.value)}
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-active)]"
              placeholder="Jane Doe"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowNewBookModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProject}
              disabled={creating || !newBookTitle.trim()}
            >
              {creating ? 'Creating...' : 'Create Book'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
