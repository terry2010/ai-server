import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-contract'

function getActiveWindow(): BrowserWindow | null {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  return win || null
}

ipcMain.handle(IPC.WindowMinimize, async () => {
  const win = getActiveWindow()
  if (win) win.minimize()
  return { success: true }
})

ipcMain.handle(IPC.WindowMaximize, async () => {
  const win = getActiveWindow()
  if (win) {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  }
  return { success: true }
})

ipcMain.handle(IPC.WindowClose, async () => {
  const win = getActiveWindow()
  if (win) win.close()
  return { success: true }
})
