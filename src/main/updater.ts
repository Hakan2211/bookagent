import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '@shared/ipc-channels'
import type { UpdateStatus } from '@shared/types'

const RELEASES_URL = 'https://github.com/Hakan2211/bookagent/releases/latest'
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

// Unsigned macOS builds cannot be swapped in-place by Squirrel.Mac,
// so on mac we only notify and send the user to the download page.
const manual = process.platform === 'darwin'

let status: UpdateStatus = { state: 'idle', currentVersion: app.getVersion(), manual }

function setStatus(patch: Partial<UpdateStatus>): void {
  status = { ...status, ...patch }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.UPDATE_STATUS, status)
  }
}

function notesToText(notes: unknown): string | undefined {
  if (!notes) return undefined
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes.map((n: { note?: string | null }) => n?.note ?? '').join('\n\n')
  }
  return undefined
}

async function check(): Promise<void> {
  if (!app.isPackaged) return
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    setStatus({ state: 'error', error: (err as Error).message })
  }
}

export function initUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => {
    // Don't flash "checking" over an update the user already knows about.
    if (status.state === 'idle' || status.state === 'not-available' || status.state === 'error') {
      setStatus({ state: 'checking', error: undefined })
    }
  })
  autoUpdater.on('update-available', (info) => {
    if (status.state === 'downloading' || status.state === 'downloaded') return
    setStatus({
      state: 'available',
      version: info.version,
      releaseNotes: notesToText(info.releaseNotes)
    })
  })
  autoUpdater.on('update-not-available', () => setStatus({ state: 'not-available' }))
  autoUpdater.on('download-progress', (p) =>
    setStatus({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    setStatus({ state: 'downloaded', version: info.version, percent: 100 })
  )
  autoUpdater.on('error', (err) => {
    // A failed background check shouldn't nag; only surface errors mid-download.
    if (status.state === 'downloading') {
      setStatus({ state: 'error', error: err?.message ?? String(err) })
    } else if (status.state === 'checking') {
      setStatus({ state: 'idle' })
    }
  })

  ipcMain.handle(IPC.UPDATE_GET_STATUS, () => status)
  ipcMain.handle(IPC.UPDATE_CHECK, async () => {
    await check()
    return status
  })
  ipcMain.handle(IPC.UPDATE_DOWNLOAD, async () => {
    if (manual) {
      await shell.openExternal(RELEASES_URL)
      return status
    }
    setStatus({ state: 'downloading', percent: 0 })
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      setStatus({ state: 'error', error: (err as Error).message })
    }
    return status
  })
  ipcMain.handle(IPC.UPDATE_INSTALL, () => {
    // isSilent=false so Windows shows the installer progress; forceRunAfter=true relaunches.
    setImmediate(() => autoUpdater.quitAndInstall(false, true))
  })
  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion())

  setTimeout(check, 5000)
  setInterval(check, CHECK_INTERVAL_MS)
}
