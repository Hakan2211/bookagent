import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import path from 'path'
import { IPC } from '@shared/ipc-channels'
import type {
  BookMetadata,
  ChapterStatus,
  ImportConfig,
  ConfirmedChapter,
  AppSettings,
  ExportConfig
} from '@shared/types'
import { ProjectManager } from './project/ProjectManager'
import { FileWatcher } from './project/FileWatcher'
import { AIRegistry } from './ai/registry'
import { keychain } from './ai/keychain'
import { AnthropicProvider } from './ai/providers/AnthropicProvider'
import { OpenAIProvider } from './ai/providers/OpenAIProvider'
import { OpenRouterProvider } from './ai/providers/OpenRouterProvider'
import { ImportPipeline } from './import/ImportPipeline'
import { Agent } from './agent/Agent'
import { SnapshotManager } from './history/SnapshotManager'
import { SearchEngine } from './search/SearchEngine'
import { ParserFactory } from './import/parsers'
import { ExportEngine, PdfExporter, EpubExporter } from './export'
import Store from 'electron-store'

const settingsStore = new Store<AppSettings>({
  defaults: {
    anthropicModel: 'claude-sonnet-4-5-20250929',
    openaiModel: 'gpt-4o',
    openrouterModel: 'anthropic/claude-sonnet-4.6',
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

  // ── Section Handlers ───────────────────────

  ipcMain.handle(
    IPC.SECTION_READ,
    async (_event, args: { chapterId: string; sectionId: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      return projectManager.project.readSection(args.chapterId, args.sectionId)
    }
  )

  ipcMain.handle(
    IPC.SECTION_SAVE,
    async (_event, args: { chapterId: string; sectionId: string; content: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      const wordCount = await projectManager.project.saveSection(
        args.chapterId,
        args.sectionId,
        args.content
      )
      return { wordCount }
    }
  )

  ipcMain.handle(
    IPC.SECTION_CREATE,
    async (
      _event,
      args: { chapterId: string; title: string; content: string; afterSectionId?: string }
    ) => {
      if (!projectManager.project) throw new Error('No project open')
      return projectManager.project.addSection(
        args.chapterId,
        args.title,
        args.content,
        args.afterSectionId
      )
    }
  )

  ipcMain.handle(
    IPC.SECTION_DELETE,
    async (_event, args: { chapterId: string; sectionId: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.deleteSection(args.chapterId, args.sectionId)
    }
  )

  ipcMain.handle(
    IPC.SECTION_RENAME,
    async (_event, args: { chapterId: string; sectionId: string; newTitle: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.renameSection(args.chapterId, args.sectionId, args.newTitle)
    }
  )

  ipcMain.handle(
    IPC.SECTION_REORDER,
    async (_event, args: { chapterId: string; sectionIds: string[] }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.reorderSections(args.chapterId, args.sectionIds)
    }
  )

  ipcMain.handle(
    IPC.SECTION_UPDATE_STATUS,
    async (_event, args: { chapterId: string; sectionId: string; status: ChapterStatus }) => {
      if (!projectManager.project) throw new Error('No project open')
      await projectManager.project.updateSectionStatus(args.chapterId, args.sectionId, args.status)
    }
  )

  ipcMain.handle(
    IPC.CHAPTER_CONVERT_TO_SECTIONED,
    async (_event, args: { chapterId: string; firstSectionTitle: string }) => {
      if (!projectManager.project) throw new Error('No project open')
      return projectManager.project.convertToSectioned(args.chapterId, args.firstSectionTitle)
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
      } else if (args.provider === 'openrouter') {
        const provider = new OpenRouterProvider(args.key)
        valid = await provider.validateKey(args.key)
        if (valid) {
          await keychain.storeKey('openrouter', args.key)
          aiRegistry.register(
            new OpenRouterProvider(args.key, settingsStore.get('openrouterModel'))
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
        openai: await keychain.hasKey('openai'),
        openrouter: await keychain.hasKey('openrouter')
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
      } else if (args.provider === 'openrouter') {
        return new OpenRouterProvider('').getModels()
      }
      return []
    }
  )

  ipcMain.handle(IPC.SETTINGS_CHECK_API_STATUS, async () => {
    // Check which providers have keys and try a lightweight connectivity test
    const providers: Array<'anthropic' | 'openai' | 'openrouter'> = [
      'anthropic',
      'openai',
      'openrouter'
    ]
    let connected = false
    let activeProvider = ''
    let activeModel = ''

    // Determine the active provider from the open project, or fall back to whichever has a key
    const projectProvider = projectManager.project?.manifest.ai.provider
    const projectModel = projectManager.project?.manifest.ai.model

    // Preferred check order: project provider first, then others
    const ordered = projectProvider
      ? [projectProvider, ...providers.filter((p) => p !== projectProvider)]
      : providers

    for (const provider of ordered) {
      if (aiRegistry.has(provider)) {
        try {
          const apiKey = await keychain.getKey(provider)
          if (apiKey) {
            let valid = false
            if (provider === 'anthropic') {
              valid = await new AnthropicProvider(apiKey).validateKey(apiKey)
            } else if (provider === 'openai') {
              valid = await new OpenAIProvider(apiKey).validateKey(apiKey)
            } else if (provider === 'openrouter') {
              valid = await new OpenRouterProvider(apiKey).validateKey(apiKey)
            }
            if (valid) {
              connected = true
              activeProvider = provider
              // Get model name
              if (provider === projectProvider && projectModel) {
                activeModel = projectModel
              } else {
                const settingKey =
                  provider === 'anthropic'
                    ? 'anthropicModel'
                    : provider === 'openai'
                      ? 'openaiModel'
                      : 'openrouterModel'
                activeModel = settingsStore.get(settingKey) as string
              }
              break
            }
          }
        } catch {
          // continue to next provider
        }
      }
    }

    // If no registered provider was reachable, check if any keys exist at all
    const hasAnyKey =
      (await keychain.hasKey('anthropic')) ||
      (await keychain.hasKey('openai')) ||
      (await keychain.hasKey('openrouter'))

    // Look up a friendly model name from the provider's model list
    let modelName = activeModel
    if (connected && activeModel) {
      let modelList: { id: string; name: string }[] = []
      if (activeProvider === 'anthropic') {
        modelList = new AnthropicProvider('').getModels()
      } else if (activeProvider === 'openai') {
        modelList = new OpenAIProvider('').getModels()
      } else if (activeProvider === 'openrouter') {
        modelList = new OpenRouterProvider('').getModels()
      }
      const found = modelList.find((m) => m.id === activeModel)
      if (found) modelName = found.name
    }

    return {
      status: connected ? 'connected' : hasAnyKey ? 'unavailable' : 'no-key',
      provider: activeProvider,
      model: activeModel,
      modelName
    }
  })

  ipcMain.handle(
    IPC.PROJECT_UPDATE_SETTINGS,
    async (
      _event,
      args: { title?: string; author?: string; totalWords?: number }
    ) => {
      if (!projectManager.project) throw new Error('No project open')
      const manifest = projectManager.project.manifest
      if (args.title !== undefined) manifest.title = args.title
      if (args.author !== undefined) manifest.author = args.author
      if (args.totalWords !== undefined) manifest.targets.totalWords = args.totalWords
      await projectManager.project.saveManifest()
      return manifest
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

  ipcMain.handle(IPC.DIALOG_SAVE_FOLDER, async (_event, args?: { defaultPath?: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Location for New Book',
      defaultPath: args?.defaultPath || undefined
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(
    IPC.DIALOG_CONFIRM,
    async (_event, args: { message: string; title?: string; confirmLabel?: string }) => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return false
      const result = await dialog.showMessageBox(win, {
        type: 'warning',
        title: args.title || 'Confirm',
        message: args.message,
        buttons: [args.confirmLabel || 'Delete', 'Cancel'],
        defaultId: 1,
        cancelId: 1
      })
      return result.response === 0
    }
  )

  // ── Export Handlers ────────────────────────

  ipcMain.handle(
    IPC.EXPORT_PDF,
    async (_event, args: { config: ExportConfig; outputPath: string }) => {
      if (!projectManager.project) throw new Error('No project open')

      const win = BrowserWindow.getFocusedWindow()
      const sendProgress = (progress: unknown) => {
        if (win) win.webContents.send(IPC.EXPORT_PROGRESS, progress)
      }

      await PdfExporter.export(
        projectManager.project,
        args.config,
        args.outputPath,
        sendProgress
      )
    }
  )

  ipcMain.handle(
    IPC.EXPORT_EPUB,
    async (_event, args: { config: ExportConfig; outputPath: string }) => {
      if (!projectManager.project) throw new Error('No project open')

      const win = BrowserWindow.getFocusedWindow()
      const sendProgress = (progress: unknown) => {
        if (win) win.webContents.send(IPC.EXPORT_PROGRESS, progress)
      }

      await EpubExporter.export(
        projectManager.project,
        args.config,
        args.outputPath,
        sendProgress
      )
    }
  )

  ipcMain.handle(
    IPC.EXPORT_PREVIEW_HTML,
    async (_event, args: { config: ExportConfig }) => {
      if (!projectManager.project) throw new Error('No project open')

      if (args.config.scope === 'chapter' && args.config.chapterId) {
        return ExportEngine.assembleChapterHtml(
          projectManager.project,
          args.config.chapterId,
          args.config,
          true
        )
      }
      return ExportEngine.assembleBookHtml(projectManager.project, args.config, true)
    }
  )

  ipcMain.handle(
    IPC.DIALOG_SAVE_FILE,
    async (
      _event,
      args: { defaultName: string; filters: Electron.FileFilter[] }
    ) => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return null
      const result = await dialog.showSaveDialog(win, {
        title: 'Export Book',
        defaultPath: args.defaultName,
        filters: args.filters
      })
      return result.canceled ? null : result.filePath
    }
  )

  // ── App Handlers ──────────────────────────

  ipcMain.handle(IPC.APP_GET_DOCUMENTS_PATH, async () => {
    return path.join(app.getPath('documents'), 'ChapterForge')
  })
}
