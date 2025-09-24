import { IPC, type ModuleName, type ModuleStatus } from '../../shared/ipc-contract'

// 简易封装，渲染端通过 window.api.invoke 调主进程
// 为避免 TS 报错，这里不声明 window.api 类型，直接使用 any
const invoke = (channel: string, payload?: any) => (window as any).api.invoke(channel, payload)

// 追加一条客户端日志（用于记录用户操作等）
export async function appendClientLog(message: string, level: 'error'|'warn'|'info'|'debug' = 'info'): Promise<void> {
  try { await invoke(IPC.AppClientLogAppend, { message, level }) } catch {}
}

export async function listModules(): Promise<{ name: string; type: string }[]> {
  const res = await invoke(IPC.ModulesList)
  if (!res?.success) throw new Error(res?.message || 'ModulesList 调用失败')
  return res.data?.items || []
}

// 客户端（ops）日志历史
export async function getClientOpsLogs(tail = 500): Promise<Array<{ id: string; timestamp: string; level: string; message: string }>> {
  console.log('[ipc] getClientOpsLogs ->', { tail })
  const t0 = performance.now()
  const res = await invoke(IPC.AppClientLogsGet, { tail })
  const t1 = performance.now()
  if (!res?.success) {
    console.error('[ipc] getClientOpsLogs fail <-', res)
    throw new Error(res?.message || '读取客户端日志失败')
  }
  const arr = res.data || []
  console.log('[ipc] getClientOpsLogs ok <-', { count: arr.length, ms: Math.round(t1 - t0) })
  return arr
}

export async function getModuleStatus(name: ModuleName): Promise<ModuleStatus> {
  const res = await invoke(IPC.ModuleStatus, { name })
  if (!res?.success) throw new Error(res?.message || `获取模块状态失败: ${name}`)
  return res.data as ModuleStatus
}

export async function startModule(name: ModuleName) {
  console.log('[ipc] startModule ->', name)
  try { appendClientLog(`[ui] 点击启动 ${name}`, 'info') } catch {}
  const t0 = performance.now()
  const res = await invoke(IPC.ModuleStart, { name })
  const t1 = performance.now()
  if (res?.success) console.log('[ipc] startModule ok <-', name, `(${Math.round(t1 - t0)}ms)`) 
  else console.error('[ipc] startModule fail <-', name, res)
  try { appendClientLog(`[ui] 启动 ${name} => ${res?.success ? 'OK' : 'FAIL'} ${res?.message||''}`, res?.success ? 'info' : 'error') } catch {}
  if (!res?.success) throw new Error(res?.message || `启动失败: ${name}`)
  return res
}

export async function stopModule(name: ModuleName) {
  console.log('[ipc] stopModule ->', name)
  try { appendClientLog(`[ui] 点击停止 ${name}`, 'info') } catch {}
  const t0 = performance.now()
  const res = await invoke(IPC.ModuleStop, { name })
  const t1 = performance.now()
  if (res?.success) console.log('[ipc] stopModule ok <-', name, `(${Math.round(t1 - t0)}ms)`) 
  else console.error('[ipc] stopModule fail <-', name, res)
  try { appendClientLog(`[ui] 停止 ${name} => ${res?.success ? 'OK' : 'FAIL'} ${res?.message||''}`, res?.success ? 'info' : 'error') } catch {}
  if (!res?.success) throw new Error(res?.message || `停止失败: ${name}`)
  return res
}

export interface AppLogEntry { id: string; timestamp: string; service: string; module: string; moduleType: 'basic'|'feature'; level: 'error'|'warn'|'info'|'debug'|'log'; message: string }

export async function getModuleLogs(params?: { name?: ModuleName; tail?: number }): Promise<AppLogEntry[]> {
  console.log('[ipc] getModuleLogs ->', params)
  const t0 = performance.now()
  const res = await invoke(IPC.ModuleLogs, params)
  const t1 = performance.now()
  if (!res?.success) {
    console.error('[ipc] getModuleLogs fail <-', params, res)
    throw new Error(res?.message || '读取日志失败')
  }
  const entries = (res.data?.entries || []) as AppLogEntry[]
  console.log('[ipc] getModuleLogs ok <-', { name: params?.name, count: entries.length, ms: Math.round(t1 - t0) })
  return entries
}

// 实时日志 attach/detach
export async function attachModuleLogs(name: ModuleName, streamId: string): Promise<void> {
  const res = await invoke(IPC.ModuleLogsAttach, { name, streamId })
  if (!res?.success) throw new Error(res?.message || '日志 attach 失败')
}

export async function detachModuleLogs(name: ModuleName): Promise<void> {
  const res = await invoke(IPC.ModuleLogsDetach, { name })
  if (!res?.success) throw new Error(res?.message || '日志 detach 失败')
}

// 窗口控制
export const windowMinimize = () => invoke(IPC.WindowMinimize)
export const windowMaximize = () => invoke(IPC.WindowMaximize)
export const windowClose = () => invoke(IPC.WindowClose)
export const windowGetState = async (): Promise<{ isMaximized: boolean; isFullScreen: boolean }> => {
  const res = await invoke(IPC.WindowGetState)
  if (!res?.success) throw new Error(res?.message || '获取窗口状态失败')
  return res.data
}
export const windowOpenDevTools = async (): Promise<void> => {
  const res = await invoke(IPC.WindowOpenDevTools)
  if (!res?.success) throw new Error(res?.message || '打开调试窗口失败')
}

export const windowClearClientData = async (): Promise<void> => {
  const res = await invoke(IPC.WindowClearClientData)
  if (!res?.success) throw new Error(res?.message || '清空客户端数据失败')
}

// ---- Docker 维护 ----
export async function dockerStopAll(): Promise<void> {
  console.log('[ipc] dockerStopAll ->')
  const t0 = performance.now()
  const res = await invoke(IPC.DockerStopAll)
  const t1 = performance.now()
  if (res?.success) console.log('[ipc] dockerStopAll ok <-', `(${Math.round(t1 - t0)}ms)`) 
  else console.error('[ipc] dockerStopAll fail <-', res)
  if (!res?.success) throw new Error(res?.message || '停止容器失败')
}
export async function dockerRemoveAllContainers(): Promise<void> {
  console.log('[ipc] dockerRemoveAllContainers ->')
  const t0 = performance.now()
  const res = await invoke(IPC.DockerRemoveAllContainers)
  const t1 = performance.now()
  if (res?.success) console.log('[ipc] dockerRemoveAllContainers ok <-', `(${Math.round(t1 - t0)}ms)`) 
  else console.error('[ipc] dockerRemoveAllContainers fail <-', res)
  if (!res?.success) throw new Error(res?.message || '删除容器失败')
}
export async function dockerRemoveAllVolumes(): Promise<void> {
  console.log('[ipc] dockerRemoveAllVolumes ->')
  const t0 = performance.now()
  const res = await invoke(IPC.DockerRemoveAllVolumes)
  const t1 = performance.now()
  if (res?.success) console.log('[ipc] dockerRemoveAllVolumes ok <-', `(${Math.round(t1 - t0)}ms)`) 
  else console.error('[ipc] dockerRemoveAllVolumes fail <-', res)
  if (!res?.success) throw new Error(res?.message || '删除卷失败')
}
export async function dockerRemoveCustomNetwork(): Promise<void> {
  console.log('[ipc] dockerRemoveCustomNetwork ->')
  const t0 = performance.now()
  const res = await invoke(IPC.DockerRemoveCustomNetwork)
  const t1 = performance.now()
  if (res?.success) console.log('[ipc] dockerRemoveCustomNetwork ok <-', `(${Math.round(t1 - t0)}ms)`) 
  else console.error('[ipc] dockerRemoveCustomNetwork fail <-', res)
  if (!res?.success) throw new Error(res?.message || '删除网络失败')
}
export async function dockerNukeAll(): Promise<void> {
  console.log('[ipc] dockerNukeAll ->')
  const t0 = performance.now()
  const res = await invoke(IPC.DockerNukeAll)
  const t1 = performance.now()
  if (res?.success) console.log('[ipc] dockerNukeAll ok <-', `(${Math.round(t1 - t0)}ms)`) 
  else console.error('[ipc] dockerNukeAll fail <-', res)
  if (!res?.success) throw new Error(res?.message || '一键清理失败')
}

// ---- BrowserView 控制 ----
export async function bvShow(name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVShow, { name })
  if (!res?.success) {
    if (res?.message === 'navigated away') return
    throw new Error(res?.message || '显示 BrowserView 失败')
  }
}
export async function bvRefresh(name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVRefresh, { name })
  if (!res?.success) {
    if (res?.message === 'navigated away') return
    throw new Error(res?.message || '刷新 BrowserView 失败')
  }
}
export async function bvHideAll(): Promise<void> {
  const res = await invoke(IPC.BVHideAll)
  if (!res?.success) throw new Error(res?.message || '隐藏 BrowserView 失败')
}
export async function bvRelease(name?: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVRelease, name ? { name } : undefined)
  if (!res?.success) throw new Error(res?.message || '释放 BrowserView 失败')
}
export async function bvSetInsets(p: Partial<{ top: number; left: number; right: number; bottom: number }>): Promise<void> {
  const res = await invoke(IPC.BVSetInsets, p)
  if (!res?.success) throw new Error(res?.message || '设置 BrowserView 边距失败')
}

export async function bvGoBack(name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVGoBack, { name })
  if (!res?.success) throw new Error(res?.message || '后退失败')
}
export async function bvGoForward(name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVGoForward, { name })
  if (!res?.success) throw new Error(res?.message || '前进失败')
}
export async function openExternal(url: string): Promise<void> {
  const res = await invoke(IPC.OpenExternal, { url })
  if (!res?.success) throw new Error(res?.message || '调用系统浏览器失败')
}

export async function bvLoadHome(name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVLoadHome, { name })
  if (!res?.success) {
    if (res?.message === 'navigated away') return
    throw new Error(res?.message || '加载模块首页失败')
  }
}

// 打开指定模块 BrowserView 的 DevTools
export async function bvOpenDevTools(name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVOpenDevTools, { name })
  if (!res?.success) throw new Error(res?.message || '打开模块调试窗口失败')
}

export async function bvClearData(name: 'n8n'|'dify'|'oneapi'|'ragflow'|'guide'|'market'): Promise<void> {
  const res = await invoke(IPC.BVClearData, { name })
  if (!res?.success) throw new Error(res?.message || '清空模块数据失败')
}

// Docker 状态/启动
export async function dockerCheck(): Promise<{ installed: boolean; running: boolean }> {
  const res = await invoke(IPC.DockerCheck)
  if (!res?.success) throw new Error(res?.message || 'Docker 检查失败')
  return res.data
}
export async function dockerStart(): Promise<void> {
  const res = await invoke(IPC.DockerStart)
  if (!res?.success) throw new Error(res?.message || 'Docker 启动失败')
}
