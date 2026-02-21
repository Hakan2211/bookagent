import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { IPC } from '@shared/ipc-channels'
import { formatDate } from '../../lib/formatters'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Plus, FolderOpen, FileUp, Settings, BookOpen, Clock } from 'lucide-react'

export function WelcomeScreen() {
  const { t } = useTranslation(['welcome', 'common'])
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const openProject = useProjectStore((s) => s.openProject)
  const openModal = useUIStore((s) => s.openModal)
  const openImportWizard = useUIStore((s) => s.openImportWizard)

  const [showNewBookModal, setShowNewBookModal] = useState(false)
  const [defaultBasePath, setDefaultBasePath] = useState('')
  const [newBookPath, setNewBookPath] = useState<string | null>(null)
  const [newBookTitle, setNewBookTitle] = useState(t('welcome:myNovel'))
  const [newBookAuthor, setNewBookAuthor] = useState('')
  const [manualPath, setManualPath] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNewBook = async () => {
    const basePath = (await window.api.invoke(IPC.APP_GET_DOCUMENTS_PATH)) as string
    setDefaultBasePath(basePath)
    setNewBookPath(basePath + '\\' + t('welcome:myNovel'))
    setNewBookTitle(t('welcome:myNovel'))
    setNewBookAuthor('')
    setManualPath(false)
    setError(null)
    setShowNewBookModal(true)
  }

  const handleTitleChange = (title: string) => {
    setNewBookTitle(title)
    if (defaultBasePath && !manualPath) {
      const safeName = title.trim() || t('welcome:myNovel')
      setNewBookPath(defaultBasePath + '\\' + safeName)
    }
  }

  const handleBrowseLocation = async () => {
    const picked = (await window.api.invoke(IPC.DIALOG_SAVE_FOLDER, {
      defaultPath: newBookPath || defaultBasePath || undefined
    })) as string | null
    if (picked) {
      setNewBookPath(picked)
      setManualPath(true)
    }
  }

  const handleCreateProject = async () => {
    if (!newBookPath || !newBookTitle.trim()) return

    setCreating(true)
    setError(null)

    try {
      const settings = (await window.api.invoke(IPC.SETTINGS_GET)) as Record<string, any>

      const aiProvider = 'openrouter' as const
      const aiModel = settings.openrouterModel || 'google/gemini-3-flash-preview'

      const createProject = useProjectStore.getState().createProject
      await createProject(newBookPath, {
        title: newBookTitle.trim(),
        author: newBookAuthor.trim(),
        aiProvider,
        aiModel
      })
      setShowNewBookModal(false)
    } catch (err) {
      setError(t('welcome:failedToCreate', { message: (err as Error).message }))
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
        setError(t('welcome:failedToOpen', { message: (err as Error).message }))
      }
    }
  }

  return (
    <div
      className="h-full flex items-center justify-center bg-[var(--bg-base)]"
      style={{ backgroundImage: 'var(--gradient-hero)' }}
    >
      <div
        className="text-center max-w-2xl w-full px-12"
        style={{ animation: 'slide-up 500ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Brand */}
        <div className="mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-3">
            <span className="text-gradient">{t('common:appName')}</span>
          </h1>
          <p className="text-base text-[var(--text-secondary)] font-medium">
            {t('common:appTagline')}
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 gap-5 mb-14">
          <button
            onClick={handleNewBook}
            className="group p-7 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-all text-left hover:shadow-[var(--elevation-2)]"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center mb-4 group-hover:bg-[var(--bg-active)] transition-colors">
              <Plus size={22} className="text-[var(--text-accent)]" />
            </div>
            <div className="text-base font-medium text-[var(--text-primary)]">
              {t('welcome:newBook')}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {t('welcome:newBookDesc')}
            </div>
          </button>

          <button
            onClick={handleOpenBook}
            className="group p-7 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-all text-left hover:shadow-[var(--elevation-2)]"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center mb-4 group-hover:bg-[var(--bg-active)] transition-colors">
              <FolderOpen size={22} className="text-[var(--color-success)]" />
            </div>
            <div className="text-base font-medium text-[var(--text-primary)]">
              {t('welcome:openExisting')}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {t('welcome:openExistingDesc')}
            </div>
          </button>

          <button
            onClick={openImportWizard}
            className="group p-7 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-all text-left hover:shadow-[var(--elevation-2)]"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center mb-4 group-hover:bg-[var(--bg-active)] transition-colors">
              <FileUp size={22} className="text-[var(--color-warning)]" />
            </div>
            <div className="text-base font-medium text-[var(--text-primary)]">
              {t('welcome:importFile')}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {t('welcome:importFileDesc')}
            </div>
          </button>

          <button
            onClick={() => openModal('settings')}
            className="group p-7 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-all text-left hover:shadow-[var(--elevation-2)]"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center mb-4 group-hover:bg-[var(--bg-active)] transition-colors">
              <Settings size={22} className="text-[var(--text-secondary)]" />
            </div>
            <div className="text-base font-medium text-[var(--text-primary)]">
              {t('common:settings')}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {t('welcome:settingsDesc')}
            </div>
          </button>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="text-left">
            <div className="flex items-center gap-2.5 mb-4">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                {t('welcome:recentProjects')}
              </h3>
            </div>
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => openProject(project.path)}
                  className="w-full text-left px-4 py-4 rounded-xl hover:bg-[var(--bg-hover)] transition-all group flex items-center gap-4"
                >
                  <BookOpen size={16} className="text-[var(--text-tertiary)] shrink-0 group-hover:text-[var(--text-accent)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] text-[var(--text-primary)] font-medium truncate">
                      {project.title}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                      {project.path} — {formatDate(project.lastOpened)}
                    </div>
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
        title={t('welcome:createNewBook')}
      >
        <div className="space-y-6 p-8">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('welcome:bookTitle')}
            </label>
            <input
              type="text"
              value={newBookTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
              placeholder={t('welcome:myNovel')}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('welcome:authorName')}
            </label>
            <input
              type="text"
              value={newBookAuthor}
              onChange={(e) => setNewBookAuthor(e.target.value)}
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
              placeholder={t('welcome:janeDoe')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('welcome:saveLocation')}
            </label>
            <div className="flex gap-3">
              <div
                className="flex-1 text-[15px] text-[var(--text-primary)] bg-[var(--bg-input)] rounded-xl px-4 py-3 border border-[var(--border)] truncate"
                title={newBookPath || ''}
              >
                {newBookPath}
              </div>
              <Button variant="secondary" onClick={handleBrowseLocation}>
                {t('common:browse')}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowNewBookModal(false)}
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProject}
              disabled={creating || !newBookTitle.trim()}
            >
              {creating ? t('common:creating') : t('welcome:createBook')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
