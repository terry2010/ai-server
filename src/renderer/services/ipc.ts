import { IPC, type ModuleName, type ModuleStatus } from '../../shared/ipc-contract'

// 简易封装，渲染端通过 window.api.invoke 调主进程
// 为避免 TS 报错，这里不声明 window.api 类型，直接使用 any
const invoke = (channel: string, payload?: any) => (window as any).api.invoke(channel, payload)

export async function listModules(): Promise<{ name: string; type: string }[]> {
  const res = await invoke(IPC.ModulesList)
  if (!res?.success) throw new Error(res?.message || 'ModulesList 调用失败')
  return res.data?.items || []
}

// 客户端（ops）日志历史
export async function getClientOpsLogs(tail = 500): Promise<Array<{ id: string; timestamp: string; level: string; message: string }>> {
  const res = await invoke(IPC.AppClientLogsGet, { tail })
  if (!res?.success) throw new Error(res?.message || '读取客户端日志失败')
  return res.data || []
}

export async function getModuleStatus(name: ModuleName): Promise<ModuleStatus> {
  const res = await invoke(IPC.ModuleStatus, { name })
  if (!res?.success) throw new Error(res?.message || `获取模块状态失败: ${name}`)
  return res.data as ModuleStatus
}

export async function startModule(name: ModuleName) {
  const res = await invoke(IPC.ModuleStart, { name })
  if (!res?.success) throw new Error(res?.message || `启动失败: ${name}`)
  return res
}

export async function stopModule(name: ModuleName) {
  const res = await invoke(IPC.ModuleStop, { name })
  if (!res?.success) throw new Error(res?.message || `停止失败: ${name}`)
  return res
}

export interface AppLogEntry { id: string; timestamp: string; service: string; module: string; moduleType: 'basic'|'feature'; level: 'error'|'warn'|'info'|'debug'|'log'; message: string }

export async function getModuleLogs(params?: { name?: ModuleName; tail?: number }): Promise<AppLogEntry[]> {
  const res = await invoke(IPC.ModuleLogs, params)
  if (!res?.success) throw new Error(res?.message || '读取日志失败')
  return (res.data?.entries || []) as AppLogEntry[]
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

// ---- Docker 维护 ----
export async function dockerStopAll(): Promise<void> {
  const res = await invoke(IPC.DockerStopAll)
  if (!res?.success) throw new Error(res?.message || '停止容器失败')
}
export async function dockerRemoveAllContainers(): Promise<void> {
  const res = await invoke(IPC.DockerRemoveAllContainers)
  if (!res?.success) throw new Error(res?.message || '删除容器失败')
}
export async function dockerRemoveAllVolumes(): Promise<void> {
  const res = await invoke(IPC.DockerRemoveAllVolumes)
  if (!res?.success) throw new Error(res?.message || '删除卷失败')
}
export async function dockerRemoveCustomNetwork(): Promise<void> {
  const res = await invoke(IPC.DockerRemoveCustomNetwork)
  if (!res?.success) throw new Error(res?.message || '删除网络失败')
}
export async function dockerNukeAll(): Promise<void> {
  const res = await invoke(IPC.DockerNukeAll)
  if (!res?.success) throw new Error(res?.message || '一键清理失败')
}

// ---- BrowserView 控制 ----
export async function bvShow(name: 'n8n'|'dify'|'oneapi'|'ragflow'): Promise<void> {
  const res = await invoke(IPC.BVShow, { name })
  if (!res?.success) throw new Error(res?.message || '显示 BrowserView 失败')
}
export async function bvRefresh(name: 'n8n'|'dify'|'oneapi'|'ragflow'): Promise<void> {
  const res = await invoke(IPC.BVRefresh, { name })
  if (!res?.success) throw new Error(res?.message || '刷新 BrowserView 失败')
}
export async function bvHideAll(): Promise<void> {
  const res = await invoke(IPC.BVHideAll)
  if (!res?.success) throw new Error(res?.message || '隐藏 BrowserView 失败')
}
export async function bvRelease(name?: 'n8n'|'dify'|'oneapi'|'ragflow'): Promise<void> {
  const res = await invoke(IPC.BVRelease, name ? { name } : undefined)
  if (!res?.success) throw new Error(res?.message || '释放 BrowserView 失败')
}
export async function bvSetInsets(p: Partial<{ top: number; left: number; right: number; bottom: number }>): Promise<void> {
  const res = await invoke(IPC.BVSetInsets, p)
  if (!res?.success) throw new Error(res?.message || '设置 BrowserView 边距失败')
}

export async function bvGoBack(name: 'n8n'|'dify'|'oneapi'|'ragflow'): Promise<void> {
  const res = await invoke(IPC.BVGoBack, { name })
  if (!res?.success) throw new Error(res?.message || '后退失败')
}
export async function bvGoForward(name: 'n8n'|'dify'|'oneapi'|'ragflow'): Promise<void> {
  const res = await invoke(IPC.BVGoForward, { name })
  if (!res?.success) throw new Error(res?.message || '前进失败')
}
export async function openExternal(url: string): Promise<void> {
  const res = await invoke(IPC.OpenExternal, { url })
  if (!res?.success) throw new Error(res?.message || '调用系统浏览器失败')
}

export async function bvLoadHome(name: 'n8n'|'dify'|'oneapi'|'ragflow'): Promise<void> {
  const res = await invoke(IPC.BVLoadHome, { name })
  if (!res?.success) throw new Error(res?.message || '加载模块首页失败')
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
