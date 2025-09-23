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
    // 始终确保打开（即便已打开也重新触发一次，避免被手动关闭后无法再聚焦的问题）
    try { win.webContents.closeDevTools() } catch {}
    win.webContents.openDevTools({ mode: 'detach' })
    // 略延迟以确保 DevTools 已创建，再去聚焦 DevTools（不再抢回主窗口焦点）
    setTimeout(() => { try { win.webContents.devToolsWebContents?.focus?.() } catch {} }, 60)
    return { success: true }
  } catch (e:any) {
    return { success: false, message: e?.message || String(e) }
  }
})

// 清空客户端（renderer）页面的 Cookies 与 LocalStorage
ipcMain.handle(IPC.WindowClearClientData, async () => {
  try {
    const { session } = require('electron')
    // dev 环境是 Vite 5174，prod 是 file://（无 cookies/localStorage 需忽略）
    const isDev = process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development'
    const origin = isDev ? 'http://localhost:5174' : null
    if (origin) {
      await session.defaultSession.clearStorageData({ origin, storages: ['cookies','localstorage'] })
    } else {
      // 回退：尽量清空默认会话的 cookies 与 localstorage（不带 origin）
      await session.defaultSession.clearStorageData({ storages: ['cookies','localstorage'] })
    }
    return { success: true }
  } catch (e:any) {
    return { success: false, message: e?.message || String(e) }
  }
})
