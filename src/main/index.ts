import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './windows'
import { createMenu } from './menu'
import { registerIPC } from './ipc'
import { ProjectManager } from './project/ProjectManager'
import { FileWatcher } from './project/FileWatcher'
import { AIRegistry } from './ai/registry'
import { keychain } from './ai/keychain'
import { OpenRouterProvider } from './ai/providers/OpenRouterProvider'
import { SnapshotManager } from './history/SnapshotManager'
import { SearchEngine } from './search/SearchEngine'
import Store from 'electron-store'

const settingsStore = new Store({
  defaults: {
    openrouterModel: 'google/gemini-3-flash-preview'
  }
})

const projectManager = new ProjectManager()
const fileWatcher = new FileWatcher()
const aiRegistry = new AIRegistry()
const snapshotManager = new SnapshotManager()
const searchEngine = new SearchEngine()

app.whenReady().then(async () => {
  // Set app user model id for Windows
  app.setAppUserModelId('com.kitapmi.app')

  // Initialize OpenRouter provider from stored key
  try {
    const openrouterKey = await keychain.getKey('openrouter')
    if (openrouterKey) {
      aiRegistry.register(
        new OpenRouterProvider(
          openrouterKey,
          settingsStore.get('openrouterModel') as string
        )
      )
    }
  } catch {
    console.warn('Failed to load OpenRouter API key')
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
