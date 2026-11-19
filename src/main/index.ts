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
import { DEFAULT_MODEL, DEFAULT_UTILITY_MODEL, refreshPricing, resolveModel } from './ai/models'
import { onAIUsage, setUtilityModel } from './ai/usage'
import { IPC } from '@shared/ipc-channels'

const settingsStore = new Store({
  defaults: {
    openrouterModel: DEFAULT_MODEL,
    openrouterUtilityModel: DEFAULT_UTILITY_MODEL
  }
})

// Retired or unknown model ids fall back to the current defaults.
settingsStore.set(
  'openrouterModel',
  resolveModel(settingsStore.get('openrouterModel') as string, DEFAULT_MODEL)
)
settingsStore.set(
  'openrouterUtilityModel',
  resolveModel(settingsStore.get('openrouterUtilityModel') as string, DEFAULT_UTILITY_MODEL)
)
setUtilityModel(settingsStore.get('openrouterUtilityModel') as string)

// Tell every window what each AI request cost.
onAIUsage((event) => {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.AI_USAGE, event)
})

const projectManager = new ProjectManager()
const fileWatcher = new FileWatcher()
const aiRegistry = new AIRegistry()
const snapshotManager = new SnapshotManager()
const searchEngine = new SearchEngine()

// One Kitapmi at a time: a second launch focuses the existing window.
// (Packaged builds only, so dev runs and screenshot captures can run alongside.)
const isPrimaryInstance = !app.isPackaged || app.requestSingleInstanceLock()
if (!isPrimaryInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    if (!win.isVisible()) win.show()
    win.focus()
  })
}

app.whenReady().then(async () => {
  if (!isPrimaryInstance) return
  // Set app user model id for Windows
  app.setAppUserModelId('com.kitapmi.app')

  // Refresh model prices in the background; the built-in list is the fallback.
  void refreshPricing()

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
