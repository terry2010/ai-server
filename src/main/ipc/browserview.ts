import { ipcMain, shell } from 'electron'
import { IPC } from '../../shared/ipc-contract'
import { BVManager } from '../browserview/manager'

ipcMain.handle(IPC.BVShow, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow' }) => {
  return BVManager.show(payload.name)
})

ipcMain.handle(IPC.BVRefresh, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow' }) => {
  return BVManager.refresh(payload.name)
})

ipcMain.handle(IPC.BVHideAll, async () => BVManager.hideAll())

ipcMain.handle(IPC.BVRelease, async (_e, payload?: { name?: 'n8n'|'dify'|'oneapi'|'ragflow' }) => BVManager.release(payload?.name))

ipcMain.handle(IPC.BVSetInsets, async (_e, payload: Partial<{ top: number; left: number; right: number; bottom: number }>) => {
  BVManager.setInsets(payload || {})
  return { success: true }
})

ipcMain.handle(IPC.BVGoBack, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow' }) => BVManager.goBack(payload.name))
ipcMain.handle(IPC.BVGoForward, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow' }) => BVManager.goForward(payload.name))

ipcMain.handle(IPC.OpenExternal, async (_e, payload: { url: string }) => {
  try { await shell.openExternal(payload.url); return { success: true } } catch (e:any) { return { success: false, message: e?.message || String(e) } }
})

ipcMain.handle(IPC.BVLoadUrl, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow'; url: string }) => BVManager.loadUrl(payload.name, payload.url))
ipcMain.handle(IPC.BVLoadHome, async (_e, payload: { name: 'n8n'|'dify'|'oneapi'|'ragflow' }) => BVManager.loadHome(payload.name))
