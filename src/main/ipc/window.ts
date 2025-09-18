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
    const state = { isMaximized: win.isMaximized(), isFullScreen: win.isFullScreen() }
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.WindowStateEvent, state)
  }
  return { success: true }
})

ipcMain.handle(IPC.WindowClose, async () => {
  const win = getActiveWindow()
  if (win) win.close()
  return { success: true }
})

ipcMain.handle(IPC.WindowGetState, async () => {
  const win = getActiveWindow()
  if (!win) return { success: false, message: 'no window' }
  return { success: true, data: { isMaximized: win.isMaximized(), isFullScreen: win.isFullScreen() } }
})

ipcMain.handle(IPC.WindowOpenDevTools, async () => {
  const win = getActiveWindow()
  if (!win) return { success: false, message: 'no window' }
  try {
    if (!win.webContents.isDevToolsOpened()) {
      win.webContents.openDevTools({ mode: 'detach' })
    }
    // 略延迟以确保 DevTools 已创建，再去聚焦
    setTimeout(() => {
      try { win.webContents.devToolsWebContents?.focus?.() } catch {}
      try { win.focus() } catch {}
    }, 30)
    return { success: true }
  } catch (e:any) {
    return { success: false, message: e?.message || String(e) }
  }
})
