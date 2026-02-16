import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './windows'
import { createMenu } from './menu'
import { registerIPC } from './ipc'
import { ProjectManager } from './project/ProjectManager'
import { FileWatcher } from './project/FileWatcher'
import { AIRegistry } from './ai/registry'
import { keychain } from './ai/keychain'
import { AnthropicProvider } from './ai/providers/AnthropicProvider'
import { OpenAIProvider } from './ai/providers/OpenAIProvider'
import { SnapshotManager } from './history/SnapshotManager'
import { SearchEngine } from './search/SearchEngine'
import Store from 'electron-store'

const settingsStore = new Store({
  defaults: {
    anthropicModel: 'claude-sonnet-4-5-20250929',
    openaiModel: 'gpt-4o'
  }
})

const projectManager = new ProjectManager()
const fileWatcher = new FileWatcher()
const aiRegistry = new AIRegistry()
const snapshotManager = new SnapshotManager()
const searchEngine = new SearchEngine()

app.whenReady().then(async () => {
  // Set app user model id for Windows
  app.setAppUserModelId('com.chapterforge.app')

  // Initialize AI providers from stored keys
  try {
    const anthropicKey = await keychain.getKey('anthropic')
    if (anthropicKey) {
      aiRegistry.register(
        new AnthropicProvider(
          anthropicKey,
          settingsStore.get('anthropicModel') as string
        )
      )
    }
  } catch {
    console.warn('Failed to load Anthropic API key')
  }

  try {
    const openaiKey = await keychain.getKey('openai')
    if (openaiKey) {
      aiRegistry.register(
        new OpenAIProvider(
          openaiKey,
          settingsStore.get('openaiModel') as string
        )
      )
    }
  } catch {
    console.warn('Failed to load OpenAI API key')
  }

  // Register IPC handlers
  registerIPC(projectManager, fileWatcher, aiRegistry, snapshotManager, searchEngine)

  // Create the main window
  const mainWindow = createMainWindow()
  createMenu(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createMainWindow()
      createMenu(win)
    }
  })
})

app.on('window-all-closed', () => {
  fileWatcher.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
