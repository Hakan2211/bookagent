import { BrowserWindow, shell, app, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import path from 'path'

let mainWindow: BrowserWindow | null = null

const TITLEBAR = {
  ink: { color: '#121110', symbolColor: '#A39C8F', height: 40 },
  paper: { color: '#F6F1E7', symbolColor: '#6B6358', height: 40 }
} as const

// Keep the native caption buttons in step with the renderer theme.
ipcMain.handle(IPC.APP_SET_THEME, (event, theme: 'ink' | 'paper') => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  win.setBackgroundColor(TITLEBAR[theme].color)
  if (process.platform !== 'darwin') win.setTitleBarOverlay(TITLEBAR[theme])
})

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Kitapmi',
    backgroundColor: '#121110',
    // Frameless look on every platform: mac keeps traffic lights, win/linux get
    // native caption buttons drawn over our own 40px title bar.
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 14, y: 13 } }
      : { titleBarOverlay: TITLEBAR.ink }),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Show on the first of: first paint, page loaded, or a safety timeout.
  // On Windows a hidden window is sometimes treated as occluded and never
  // paints, so 'ready-to-show' alone can leave the app invisible forever.
  const win = mainWindow
  let shown = false
  const reveal = (): void => {
    if (shown || win.isDestroyed()) return
    shown = true
    clearTimeout(fallback)
    win.show()
    win.focus()
  }
  const fallback = setTimeout(reveal, 3000)
  win.once('ready-to-show', reveal)
  win.webContents.once('did-finish-load', reveal)
  win.on('closed', () => clearTimeout(fallback))

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the app
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
