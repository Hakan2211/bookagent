import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { IPC } from '@shared/ipc-channels'
import { formatDate } from '../../lib/formatters'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Plus, Settings } from 'lucide-react'
import { BookCover } from '../library/BookCover'
import { TitleBar } from './TitleBar'
import type { ProjectPeek } from '@shared/types'

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
  const [peeks, setPeeks] = useState<Record<string, ProjectPeek>>({})

  // Read chapter/word stats for the library shelf.
  useEffect(() => {
    if (recentProjects.length === 0) return
    window.api
      .invoke(IPC.PROJECT_PEEK, recentProjects.map((p) => p.path))
      .then((list) => {
        const map: Record<string, ProjectPeek> = {}
        for (const p of list as ProjectPeek[]) map[p.path] = p
        setPeeks(map)
      })
      .catch(() => {})
  }, [recentProjects])

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

  const greetingKey = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'welcome:greetingNight'
    if (h < 12) return 'welcome:greetingMorning'
    if (h < 18) return 'welcome:greetingAfternoon'
    return 'welcome:greetingEvening'
  })()
  const firstName = recentProjects[0]?.author?.trim().split(/\s+/)[0]
  const lastBook = recentProjects.find((p) => peeks[p.path]?.exists !== false)

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      <TitleBar />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="mx-auto w-full max-w-[920px] px-12 pt-10 pb-16"
          style={{ animation: 'slide-up 500ms var(--ease-out-expo)' }}
        >
          {/* Greeting */}
          <div className="text-center">
            <h1 className="font-serif text-[44px] leading-tight text-[var(--text-primary)] tracking-[-0.01em]">
              {firstName ? t(greetingKey, { name: firstName }) : t(greetingKey + 'Anon')}
            </h1>
            <p className="font-serif text-[17px] text-[var(--text-secondary)] mt-2">
              {lastBook ? (
                <button
                  onClick={() => openProject(lastBook.path)}
                  className="hover:text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--accent-primary)]"
                >
                  {t('welcome:continueWith', { title: lastBook.title })}
                </button>
              ) : (
                t('welcome:subtitleEmpty')
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="relative mt-9 flex items-center justify-center gap-3">
            <Button variant="primary" onClick={handleNewBook} className="min-w-[150px]">
              {t('welcome:newBook')}
            </Button>
            <Button variant="secondary" onClick={handleOpenBook}>
              {t('welcome:openFolder')}
            </Button>
            <Button variant="secondary" onClick={openImportWizard}>
              {t('welcome:importShort')}
            </Button>
            <button
              onClick={() => openModal('settings')}
              title={t('common:settings')}
              className="absolute right-0 p-2 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <Settings size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Library */}
          <div className="mt-14">
            <div className="label-caps pb-2 border-b border-[var(--border)]">
              {t('welcome:yourBooks')}
            </div>

            <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-10 gap-y-12">
              {recentProjects.map((project) => {
                const peek = peeks[project.path]
                const missing = peek && !peek.exists
                const pct =
                  peek && peek.targetWords > 0
                    ? Math.min(100, Math.round((peek.words / peek.targetWords) * 100))
                    : null
                return (
                  <button
                    key={project.path}
                    onClick={() => !missing && openProject(project.path)}
                    title={project.path}
                    className={`group flex flex-col items-center text-center ${missing ? 'opacity-45 cursor-default' : ''}`}
                  >
                    <div className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5">
                      <BookCover
                        title={project.title}
                        author={project.author ? t('welcome:byAuthor', { author: project.author }) : undefined}
                        width={210}
                      />
                    </div>
                    <div className="mt-4 font-serif text-[14.5px] text-[var(--text-secondary)] tabular">
                      {missing ? (
                        t('welcome:missing')
                      ) : peek ? (
                        <>
                          {t('welcome:chapters', { count: peek.chapters })} ·{' '}
                          {peek.words.toLocaleString()} {t('common:words')}{' '}
                          · {formatDate(project.lastOpened)}
                        </>
                      ) : (
                        formatDate(project.lastOpened)
                      )}
                    </div>
                    {pct !== null && !missing && (
                      <div className="mt-2 flex w-full max-w-[230px] items-center gap-3">
                        <div className="h-[5px] flex-1 rounded-full bg-[var(--bg-active)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-serif text-[13px] text-[var(--text-tertiary)] tabular whitespace-nowrap">
                          {t('welcome:percentOf', { pct, target: peek!.targetWords.toLocaleString() })}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}

              {/* New book placeholder */}
              <button
                onClick={handleNewBook}
                className="group flex flex-col items-center"
              >
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-[var(--border-strong)] text-[var(--text-secondary)] group-hover:border-[var(--accent-primary)] group-hover:text-[var(--text-primary)] transition-colors"
                  style={{ width: 210, height: 223 }}
                >
                  <Plus size={30} strokeWidth={1.25} />
                  <span className="font-serif text-[17px]">{t('welcome:startNewBook')}</span>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-8 text-sm text-[var(--color-error)] text-center">{error}</div>
          )}
        </div>
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
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-[15px] outline-none focus:border-[var(--border-active)] transition-all"
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
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-[15px] outline-none focus:border-[var(--border-active)] transition-all"
              placeholder={t('welcome:janeDoe')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('welcome:saveLocation')}
            </label>
            <div className="flex gap-3">
              <div
                className="flex-1 text-[15px] text-[var(--text-primary)] bg-[var(--bg-input)] rounded-[var(--radius-md)] px-4 py-2.5 border border-[var(--border)] truncate"
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
            <div className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-[var(--radius-md)] px-4 py-3">
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
