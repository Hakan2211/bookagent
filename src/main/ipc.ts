import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type {
  BookMetadata,
  ChapterStatus,
  ImportConfig,
  ConfirmedChapter,
  AppSettings
} from '@shared/types'
import { ProjectManager } from './project/ProjectManager'
import { FileWatcher } from './project/FileWatcher'
import { AIRegistry } from './ai/registry'
import { keychain } from './ai/keychain'
import { AnthropicProvider } from './ai/providers/AnthropicProvider'
import { OpenAIProvider } from './ai/providers/OpenAIProvider'
import { ImportPipeline } from './import/ImportPipeline'
import { Agent } from './agent/Agent'
import { SnapshotManager } from './history/SnapshotManager'
import { SearchEngine } from './search/SearchEngine'
import { ParserFactory } from './import/parsers'
import Store from 'electron-store'

const settingsStore = new Store<AppSettings>({
  defaults: {
    anthropicModel: 'claude-sonnet-4-5-20250929',
    openaiModel: 'gpt-4o',
    theme: 'dark',
    sidebarWidth: 220,
    chatPanelWidth: 350,
    sidebarCollapsed: false,
    chatPanelCollapsed: false
  }
})

export function registerIPC(
  projectManager: ProjectManager,
  fileWatcher: FileWatcher,
  aiRegistry: AIRegistry,
  snapshotManager: SnapshotManager,
  searchEngine: SearchEngine
): void {
  let currentAgent: Agent | null = null

  // ── Project Handlers ──────────────────────

  ipcMain.handle(IPC.PROJECT_CREATE, async (_event, args: { path: string; metadata: BookMetadata }) => {
    const manifest = await projectManager.createProject(args.path, args.metadata)
    if (projectManager.project) {
      fileWatcher.watch(args.path, (change) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.send('file:changed', change)
      })
    }
    return manifest
  })

  ipcMain.handle(IPC.PROJECT_OPEN, async (_event, args: { path: string }) => {
    const manifest = await projectManager.openProject(args.path)
    fileWatcher.watch(args.path, (change) => {
      const win = BrowserWindow.getFocusedWindow()
      if (win) win.webContents.send('file:changed', change)
    })
    return manifest
  })

  ipcMain.handle(IPC.PROJECT_CLOSE, async () => {
    fileWatcher.stop()
    projectManager.closeProject()
  })

  ipcMain.handle(IPC.PROJECT_GET_RECENTS, async () => {
    return projectManager.getRecentProjects()
  })

  ipcMain.handle(IPC.PROJECT_GET_STATE, async () => {
    return projectManager.project?.manifest || null
  })

  // ── Chapter Handlers ──────────────────────

  ipcMain.handle(IPC.CHAPTER_READ, async (_event, args: { chapterId: string }) => {
    if (!projectManager.project) throw new Error('No project open')
    return projectManager.project.readChapter(args.chapterId)
  })

  ipcMain.handle(
    IPC.CHAPTER_SAVE,
    async (_event, args: { chapterId: string; content: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      const wordCount = await projectManager.project.saveChapter(
        args.chapterId,
        args.content
      )
      return { wordCount }
    }
  )

  ipcMain.handle(
    IPC.CHAPTER_CREATE,
    async (_event, args: { title: string; content: string; afterId?: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      return projectManager.project.addChapter(args.title, args.content, args.afterId)
    }
  )

  ipcMain.handle(IPC.CHAPTER_DELETE, async (_event, args: { chapterId: string }) => {
    if (!projectManager.project) throw new Error('No project open')
    await snapshotManager.createSnapshot(
      projectManager.project.path,
      `Before deleting ${args.chapterId}`
    )
    await projectManager.project.deleteChapter(args.chapterId)
  })

  ipcMain.handle(
    IPC.CHAPTER_RENAME,
    async (_event, args: { chapterId: string; newTitle: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.renameChapter(args.chapterId, args.newTitle)
    }
  )

  ipcMain.handle(
    IPC.CHAPTER_REORDER,
    async (_event, args: { chapterIds: string[] }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.reorderChapters(args.chapterIds)
    }
  )

  ipcMain.handle(
    IPC.CHAPTER_UPDATE_STATUS,
    async (_event, args: { chapterId: string; status: ChapterStatus }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.updateChapterStatus(args.chapterId, args.status)
    }
  )

  // ── Note Handlers ─────────────────────────

  ipcMain.handle(IPC.NOTE_READ, async (_event, args: { noteId: string }) => {
    if (!projectManager.project) throw new Error('No project open')
    return projectManager.project.readNote(args.noteId)
  })

  ipcMain.handle(
    IPC.NOTE_SAVE,
    async (_event, args: { noteId: string; content: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.saveNote(args.noteId, args.content)
    }
  )

  // ── Import Handlers ───────────────────────

  ipcMain.handle(
    IPC.IMPORT_START,
    async (_event, args: { filePath: string; config: ImportConfig }) => {
      const provider = aiRegistry.listProviders()[0]
      if (!provider) throw new Error('No AI provider configured. Please add an API key in settings.')
      
      const ai = aiRegistry.get(provider)
      const pipeline = new ImportPipeline(ai)
      
      const win = BrowserWindow.getFocusedWindow()
      const result = await pipeline.execute(args.filePath, args.config, (step, percent) => {
        if (win) win.webContents.send(IPC.IMPORT_PROGRESS, { step, percent })
      })
      
      return result
    }
  )

  ipcMain.handle(
    IPC.IMPORT_CONFIRM,
    async (
      _event,
      args: {
        projectPath: string
        sourceFilePath: string
        confirmedChapters: ConfirmedChapter[]
        metadata: BookMetadata
      }
    ) => {
      const provider = aiRegistry.listProviders()[0]
      if (!provider) throw new Error('No AI provider configured')
      
      const ai = aiRegistry.get(provider)
      const pipeline = new ImportPipeline(ai)
      
      const manifest = await pipeline.confirmAndCreate(
        args.projectPath,
        args.sourceFilePath,
        args.confirmedChapters,
        args.metadata,
        projectManager
      )

      fileWatcher.watch(args.projectPath, (change) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.send('file:changed', change)
      })

      return manifest
    }
  )

  // ── Agent Handlers ────────────────────────

  ipcMain.handle(
    IPC.AGENT_PROMPT,
    async (_event, args: { prompt: string; openChapterId: string | null }) => {
      if (!projectManager.project) throw new Error('No project open')

      const provider = projectManager.project.manifest.ai.provider
      if (!aiRegistry.has(provider)) {
        throw new Error(`AI provider "${provider}" not configured. Please add an API key in settings.`)
      }

      const ai = aiRegistry.get(provider)
      const win = BrowserWindow.getFocusedWindow()

      // Create snapshot before agent edit
      await snapshotManager.createSnapshot(
        projectManager.project.path,
        `Before agent edit: ${args.prompt.slice(0, 50)}...`
      )

      currentAgent = new Agent(ai, projectManager.project)

      for await (const event of currentAgent.handlePrompt(
        args.prompt,
        args.openChapterId
      )) {
        if (win) {
          switch (event.type) {
            case 'stream':
              win.webContents.send(IPC.AGENT_STREAM, { text: event.text })
              break
            case 'tool_call':
              win.webContents.send(IPC.AGENT_PLAN, {
                plan: `Calling tool: ${event.toolCall.name}`
              })
              break
            case 'tool_result':
              if (event.result.pendingAction) {
                win.webContents.send(IPC.AGENT_DIFF, event.result.pendingAction)
              }
              break
            case 'done':
              win.webContents.send(IPC.AGENT_DONE, {
                fullResponse: event.fullResponse
              })
              break
            case 'error':
              win.webContents.send(IPC.AGENT_ERROR, { error: event.error })
              break
          }
        }
      }

      currentAgent = null
    }
  )

  ipcMain.handle(
    IPC.AGENT_ACCEPT_CHANGES,
    async (
      _event,
      args: { chapterId: string; newContent: string }
    ) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.saveChapter(args.chapterId, args.newContent)
    }
  )

  ipcMain.handle(
    IPC.AGENT_REJECT_CHANGES,
    async (_event, _args: { chapterId: string }) => {
      // Nothing to do — changes were never written
    }
  )

  ipcMain.handle(IPC.AGENT_CANCEL, async () => {
    if (currentAgent) {
      currentAgent.cancel()
      currentAgent = null
    }
  })

  // ── Settings Handlers ─────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return settingsStore.store
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, args: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(args)) {
      settingsStore.set(key as keyof AppSettings, value as any)
    }
  })

  ipcMain.handle(
    IPC.SETTINGS_SET_API_KEY,
    async (_event, args: { provider: string; key: string }) => {
      // Validate key first
      let valid = false
      
      if (args.provider === 'anthropic') {
        const provider = new AnthropicProvider(args.key)
        valid = await provider.validateKey(args.key)
        if (valid) {
          await keychain.storeKey('anthropic', args.key)
          aiRegistry.register(
            new AnthropicProvider(args.key, settingsStore.get('anthropicModel'))
          )
        }
      } else if (args.provider === 'openai') {
        const provider = new OpenAIProvider(args.key)
        valid = await provider.validateKey(args.key)
        if (valid) {
          await keychain.storeKey('openai', args.key)
          aiRegistry.register(
            new OpenAIProvider(args.key, settingsStore.get('openaiModel'))
          )
        }
      }

      return { valid }
    }
  )

  ipcMain.handle(
    IPC.SETTINGS_GET_API_KEY_STATUS,
    async () => {
      return {
        anthropic: await keychain.hasKey('anthropic'),
        openai: await keychain.hasKey('openai')
      }
    }
  )

  ipcMain.handle(
    IPC.SETTINGS_GET_MODELS,
    async (_event, args: { provider: string }) => {
      if (args.provider === 'anthropic') {
        return new AnthropicProvider('').getModels()
      } else if (args.provider === 'openai') {
        return new OpenAIProvider('').getModels()
      }
      return []
    }
  )

  // ── History Handlers ──────────────────────

  ipcMain.handle(IPC.HISTORY_LIST, async () => {
    if (!projectManager.project) throw new Error('No project open')
    return snapshotManager.listSnapshots(projectManager.project.path)
  })

  ipcMain.handle(
    IPC.HISTORY_RESTORE,
    async (_event, args: { snapshotId: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      await snapshotManager.restoreSnapshot(
        projectManager.project.path,
        args.snapshotId
      )
      // Re-read manifest
      const manifest = await projectManager.openProject(projectManager.project.path)
      return manifest
    }
  )

  // ── Search Handlers ───────────────────────

  ipcMain.handle(IPC.SEARCH_BOOK, async (_event, args: { query: string }) => {
    if (!projectManager.project) throw new Error('No project open')
    return searchEngine.search(projectManager.project, args.query)
  })

  // ── Dialog Handlers ───────────────────────

  ipcMain.handle(IPC.DIALOG_OPEN_FOLDER, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Choose Book Project Folder'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      title: 'Choose File to Import',
      filters: ParserFactory.getFileFilters()
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_SAVE_FOLDER, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Location for New Book'
    })
    return result.canceled ? null : result.filePaths[0]
  })
}
