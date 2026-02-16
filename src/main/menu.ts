import { Menu, app, dialog, type BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'

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
                label: 'Settings...',
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
      label: 'File',
      submenu: [
        {
          label: 'New Book...',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-project')
        },
        {
          label: 'Open Book...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Open Book Project'
            })
            if (!result.canceled && result.filePaths[0]) {
              mainWindow.webContents.send('menu:open-project', result.filePaths[0])
            }
          }
        },
        {
          label: 'Import File...',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.send('menu:import')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const }])
      ]
    },
    {
      label: 'Edit',
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
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar')
        },
        {
          label: 'Toggle Agent Panel',
          accelerator: 'CmdOrCtrl+J',
          click: () => mainWindow.webContents.send('menu:toggle-chat')
        },
        { type: 'separator' },
        {
          label: 'Search Book',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow.webContents.send('menu:search')
        },
        {
          label: 'Quick Switch Chapter',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu:quick-switch')
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ChapterForge',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About ChapterForge',
              message: 'ChapterForge v0.1.0',
              detail: 'AI-powered book writing IDE.\nCursor for books.'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
