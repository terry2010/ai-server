import { ipcMain, shell } from 'electron'
import { IPC } from '../../shared/ipc-contract'
import { BVManager } from '../browserview/manager'

ipcMain.handle(IPC.BVShow, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => {
  return BVManager.show(payload.name)
})

ipcMain.handle(IPC.BVRefresh, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => {
  return BVManager.refresh(payload.name)
})

ipcMain.handle(IPC.BVHideAll, async () => BVManager.hideAll())

ipcMain.handle(IPC.BVRelease, async (_e, payload?: { name?: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => BVManager.release(payload?.name))

ipcMain.handle(IPC.BVSetInsets, async (_e, payload: Partial<{ top: number; left: number; right: number; bottom: number }>) => {
  BVManager.setInsets(payload || {})
  return { success: true }
})

ipcMain.handle(IPC.BVGoBack, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => BVManager.goBack(payload.name))
ipcMain.handle(IPC.BVGoForward, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => BVManager.goForward(payload.name))

ipcMain.handle(IPC.OpenExternal, async (_e, payload: { url: string }) => {
  try { await shell.openExternal(payload.url); return { success: true } } catch (e:any) { return { success: false, message: e?.message || String(e) } }
})

ipcMain.handle(IPC.BVLoadUrl, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'; url: string }) => BVManager.loadUrl(payload.name, payload.url))
ipcMain.handle(IPC.BVLoadHome, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => BVManager.loadHome(payload.name))

// 打开指定模块 BrowserView 的 DevTools
ipcMain.handle(IPC.BVOpenDevTools, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => {
  return BVManager.openDevTools(payload.name)
})

// 清空指定模块 BrowserView 的数据（cookies/localstorage 等）
ipcMain.handle(IPC.BVClearData, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market' }) => {
  return BVManager.clearData(payload.name)
})
