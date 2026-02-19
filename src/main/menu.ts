import { Menu, app, dialog, type BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { t } from './i18n'

export function createMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: t('settings'),
                accelerator: 'Cmd+,',
                click: () => mainWindow.webContents.send('menu:settings')
              },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          } as Electron.MenuItemConstructorOptions
        ]
      : []),
    {
      label: t('file'),
      submenu: [
        {
          label: t('newBook'),
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-project')
        },
        {
          label: t('openBook'),
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: t('openBookDialog')
            })
            if (!result.canceled && result.filePaths[0]) {
              mainWindow.webContents.send('menu:open-project', result.filePaths[0])
            }
          }
        },
        {
          label: t('importFile'),
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.send('menu:import')
        },
        { type: 'separator' },
        {
          label: t('save'),
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        { type: 'separator' },
        {
          label: t('exportPdf'),
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('menu:export', 'pdf')
        },
        {
          label: t('exportEpub'),
          click: () => mainWindow.webContents.send('menu:export', 'epub')
        },
        {
          label: t('preview'),
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow.webContents.send('menu:preview')
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const }])
      ]
    },
    {
      label: t('edit'),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: t('view'),
      submenu: [
        {
          label: t('toggleSidebar'),
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar')
        },
        {
          label: t('toggleAgentPanel'),
          accelerator: 'CmdOrCtrl+J',
          click: () => mainWindow.webContents.send('menu:toggle-chat')
        },
        { type: 'separator' },
        {
          label: t('searchBook'),
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow.webContents.send('menu:search')
        },
        {
          label: t('quickSwitchChapter'),
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu:quick-switch')
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: t('help'),
      submenu: [
        {
          label: t('aboutChapterForge'),
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: t('aboutChapterForge'),
              message: t('aboutVersion'),
              detail: t('aboutDetail')
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
