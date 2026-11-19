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

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

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
