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
import { initUpdater } from './updater'

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

  // Dev-only: KITAPMI_CAPTURE=out.png [KITAPMI_OPEN=projectDir] [KITAPMI_EVAL=js]
  // renders a state and writes a screenshot — used for design QA and store shots.
  if (!app.isPackaged && process.env.KITAPMI_CAPTURE) {
    const wc = mainWindow.webContents
    wc.on('console-message', (_e, _level, msg) => console.error('[renderer]', msg))
    wc.once('did-finish-load', async () => {
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
      // Background windows throttle CSS animations; freeze them at their end state.
      await wc.insertCSS('*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}')
      await wait(1500)
      if (process.env.KITAPMI_OPEN) wc.send('menu:open-project', process.env.KITAPMI_OPEN)
      await wait(1500)
      if (process.env.KITAPMI_EVAL) {
        await wc.executeJavaScript(process.env.KITAPMI_EVAL).catch((e) => console.error(e))
      }
      await wait(Number(process.env.KITAPMI_DELAY || 1500))
      const img = await wc.capturePage()
      require('fs').writeFileSync(process.env.KITAPMI_CAPTURE!, img.toPNG())
      app.exit(0)
    })
  }

  // Check GitHub Releases for new versions (packaged builds only)
  initUpdater()

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
