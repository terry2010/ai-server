import { IPC, type ModuleName, type ModuleStatus } from '../../shared/ipc-contract'

// 简易封装，渲染端通过 window.api.invoke 调主进程
// 为避免 TS 报错，这里不声明 window.api 类型，直接使用 any
const invoke = (channel: string, payload?: any) => (window as any).api.invoke(channel, payload)

export async function listModules(): Promise<{ name: string; type: string }[]> {
  const res = await invoke(IPC.ModulesList)
  if (!res?.success) throw new Error(res?.message || 'ModulesList 调用失败')
  return res.data?.items || []
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

// 窗口控制
export const windowMinimize = () => invoke(IPC.WindowMinimize)
export const windowMaximize = () => invoke(IPC.WindowMaximize)
export const windowClose = () => invoke(IPC.WindowClose)

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
