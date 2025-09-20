import type { WebContents } from 'electron'
import { BrowserWindow } from 'electron'
import { IPC, type IpcResponse, type ModuleName, type ModuleType } from '../../shared/ipc-contract'
import { loadRegistry, getGlobalConfig } from '../config/store'
import type { ModuleSchema } from '../config/schema'
import { ensureExternalResources, ensureExternalInfraResources } from './resources'
import { waitHealth } from './health'
import { checkPortsConflict } from './ports'
import { containerNameFor, servicesForModule } from './naming'
import { createOrStartContainerForModule, stopContainerByName } from './helpers'
import { listRunningContainerNames } from './status'

export interface ModuleItem { name: string; type: ModuleType }

function emitStdout(sender: WebContents, streamId: string, text: string) {
  try { sender.send(IPC.ModuleLogEvent, { streamId, event: 'stdout', chunk: text }) } catch {}
}

export function listModules(): ModuleItem[] {
  const reg = loadRegistry()
  return (reg.modules || []).map(m => ({ name: m.name, type: m.type }))
}

function detectDepCycle(mods: any[], start: string): { ok: true } | { ok: false; path: string[] } {
  const byName: Record<string, any> = {}
  for (const m of mods) byName[m.name] = m
  const visited = new Set<string>()
  const stack = new Set<string>()
  const path: string[] = []
  function dfs(n: string): boolean {
    if (stack.has(n)) { path.push(n); return true }
    if (visited.has(n)) return false
    visited.add(n); stack.add(n); path.push(n)
    const deps = (byName[n]?.dependsOn || []) as string[]
    for (const d of deps) { if (dfs(d)) return true }
    stack.delete(n); path.pop();
    return false
  }
  const has = dfs(start)
  if (has) {
    const loopStart = path[path.length - 1]
    const firstIdx = path.indexOf(loopStart)
    const cyc = path.slice(firstIdx)
    return { ok: false, path: cyc }
  }
  return { ok: true }
}

export async function firstStartModule(name: ModuleName): Promise<IpcResponse> {
  try {
    await ensureExternalResources()
  } catch (e: any) {
    return { success: false, code: 'E_PREFLIGHT_RESOURCE', message: `初始化外部资源失败: ${String(e?.message ?? e)}` }
  }
  return startModule(name)
}

export async function startModule(name: ModuleName): Promise<IpcResponse> {
  // 资源
  const wins0 = BrowserWindow.getAllWindows()
  const emitOps0 = (msg: string) => { try { for (const w of wins0) w.webContents.send(IPC.ModuleLogEvent, { streamId: 'ops', event: 'info', chunk: `[ops] ${msg}` }) } catch {} }
  emitOps0('ensure external infra resources ...')
  try {
    await ensureExternalInfraResources()
    emitOps0('external infra ready')
  } catch (e: any) {
    console.error('[ops] ensureExternalInfraResources error', e)
    emitOps0(`external infra error: ${String(e?.message || e)}`)
    return { success: false, code: 'E_INFRA', message: `初始化外部资源失败: ${String(e?.message || e)}` }
  }
  const reg = loadRegistry()
  const modules = reg.modules || []
  const target = modules.find(m => m.name === name)
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` }
  const cyc = detectDepCycle(modules as any[], name)
  if (!cyc.ok) return { success: false, code: 'E_DEP_CYCLE', message: `依赖存在环: ${cyc.path.join(' -> ')}` }

  const deps = (target.dependsOn || []) as ModuleName[]
  const wins = BrowserWindow.getAllWindows()
  const emitOps = (msg: string) => { try { for (const w of wins) w.webContents.send(IPC.ModuleLogEvent, { streamId: 'ops', event: 'info', chunk: `[ops] ${msg}` }) } catch {} }
  console.info('[ops] startModule', { name, deps })
  emitOps(`start ${name}: deps=[${deps.join(', ')}]`)
  // 端口占用校验
  {
    const checkList = [...deps, name]
    const runningNames = await listRunningContainerNames()
    const r = await checkPortsConflict(modules as any[], checkList, runningNames, containerNameFor)
    if (!r.ok) {
      const { bind, hostPort, modName } = r as any
      console.warn('[ops] port conflict', { bind, hostPort, modName })
      emitOps(`port conflict ${bind}:${hostPort} (mod=${modName})`)
      return { success: false, code: 'E_PORT_CONFLICT', message: `端口已被占用: ${bind}:${hostPort}（模块: ${modName}）。请在设置中修改宿主机端口或释放后重试。` }
    }
  }
  // 启动依赖
  const lenient = name === 'dify' || name === 'ragflow'
  for (const dep of deps) {
    const depItem = modules.find(m => m.name === dep)
    if (!depItem) continue
    console.info('[ops] ensure dep', dep)
    emitOps(`ensure dep ${dep}`)
    await createOrStartContainerForModule(depItem as ModuleSchema)
    const skipHealth = lenient || dep === 'minio' || dep === 'elasticsearch' || dep === 'mysql' || dep === 'redis' || dep === 'qdrant'
    const ok = skipHealth ? true : await waitHealth((depItem as any).healthCheck)
    if (!ok) {
      console.warn('[ops] dep health timeout', dep)
      emitOps(`dep ${dep} health timeout`)
      if (!lenient) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `依赖未就绪: ${dep}` }
    } else {
      emitOps(`dep ${dep} ready`)
    }
  }
  // 启动自身
  console.info('[ops] ensure self', name)
  emitOps(`ensure self ${name}`)
  await createOrStartContainerForModule(target as ModuleSchema)
  const skipHealthSelf = name === 'dify' || name === 'ragflow' // TODO: 同上
  const ok = skipHealthSelf ? true : await waitHealth((target as any).healthCheck)
  if (!ok) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `模块未就绪: ${name}` }
  emitOps(`self ${name} ready`)

  // 可选伴随服务：在不引入依赖环的前提下，点击 dify 时自动拉起 dify-web / dify-plugin
  try {
    if (name === 'dify') {
      const web = modules.find(m => m.name === 'dify-web') as ModuleSchema | undefined
      if (web) {
        console.info('[ops] ensure companion', 'dify-web')
        emitOps('ensure companion dify-web')
        // 不等待健康检查，避免卡住主流程
        createOrStartContainerForModule(web).catch(e => console.warn('[ops] start dify-web failed', e?.message || e))
      }
      const plugin = modules.find(m => m.name === 'dify-plugin') as ModuleSchema | undefined
      if (plugin) {
        console.info('[ops] ensure companion', 'dify-plugin')
        emitOps('ensure companion dify-plugin')
        createOrStartContainerForModule(plugin).catch(e => console.warn('[ops] start dify-plugin failed', e?.message || e))
      }
    }
  } catch (e: any) {
    console.warn('[ops] companion start error', e?.message || e)
  }
  return { success: true, message: `start ${name} OK` }
}

export async function stopModule(name: ModuleName): Promise<IpcResponse> {
  const reg = loadRegistry()
  const modules = reg.modules || []
  const target = modules.find(m => m.name === name)
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` }

  if (target.type !== 'feature') {
    const users = modules.filter(m => m.type === 'feature' && (m.dependsOn || []).includes(name))
    if (users.length > 0) {
      const runningSet = await listRunningContainerNames()
      const inUse = users.some(u => {
        const svcs = servicesForModule(u.name as ModuleName)
        return svcs.some(s => runningSet.has(containerNameFor(s)))
      })
      if (inUse) return { success: false, code: 'E_IN_USE', message: `基础服务 ${name} 仍被运行中的功能模块依赖，已阻止停止。` }
    }
  }
  try { await stopContainerByName(containerNameFor(name)) } catch {}

  // 依赖感知回收（可选，仅当 target 为 feature）
  try {
    if (target.type === 'feature') {
      const { autoStopUnusedDeps } = getGlobalConfig() as any
      if (autoStopUnusedDeps) {
        const deps = (target.dependsOn || []) as ModuleName[]
        if (deps.length > 0) {
          const runningNames = await listRunningContainerNames()
          for (const dep of deps) {
            const users = modules.filter(m => m.name !== name && m.type === 'feature' && (m.dependsOn || []).includes(dep))
            const inUse = users.some(u => {
              const svcs = servicesForModule(u.name as ModuleName)
              return svcs.some(s => runningNames.has(containerNameFor(s)))
            })
            if (!inUse) await stopContainerByName(containerNameFor(dep))
          }
        }
      }
    }
  } catch {}
  return { success: true, message: `stop ${name} OK` }
}

export async function clearModuleCache(name: ModuleName): Promise<IpcResponse> {
  // TODO: dockerode 清理模块相关容器/卷（谨慎），当前保留占位
  return { success: true, message: `clear ${name} (stub)` }
}

export async function firstStartModuleStream(name: ModuleName, sender: WebContents, streamId: string): Promise<IpcResponse> {
  try { await ensureExternalResources() } catch (e: any) { return { success: false, code: 'E_PREFLIGHT_RESOURCE', message: `初始化外部资源失败: ${String(e?.message ?? e)}` } }
  return startModuleStream(name, sender, streamId)
}

export async function startModuleStream(name: ModuleName, sender: WebContents, streamId: string): Promise<IpcResponse> {
  emitStdout(sender, streamId, `[debug] startModuleStream ${name}`)
  const reg = loadRegistry()
  const modules = reg.modules || []
  const target = modules.find(m => m.name === name)
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` }
  const deps = (target.dependsOn || []) as ModuleName[]
  // 端口占用校验
  {
    const checkList = [...deps, name]
    const runningNames = await listRunningContainerNames()
    const r = await checkPortsConflict(modules as any[], checkList, runningNames, containerNameFor)
    if (!r.ok) {
      const { bind, hostPort, modName } = r as any
      return { success: false, code: 'E_PORT_CONFLICT', message: `端口已被占用: ${bind}:${hostPort}（模块: ${modName}）。请在设置中修改宿主机端口或释放后重试。` }
    }
  }
  // 启动依赖
  for (const dep of deps) {
    emitStdout(sender, streamId, `[debug] ensure dep ${dep}`)
    const depItem = modules.find(m => m.name === dep)
    if (!depItem) continue
    await createOrStartContainerForModule(depItem as ModuleSchema)
    const skipHealth = dep === 'dify' || dep === 'ragflow' || dep === 'minio'
    const ok = skipHealth ? true : await waitHealth((depItem as any).healthCheck)
    if (!ok) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `依赖未就绪: ${dep}` }
  }
  // 启动自身
  emitStdout(sender, streamId, `[debug] ensure self ${name}`)
  await createOrStartContainerForModule(target as ModuleSchema)
  const skipHealthSelf = name === 'dify' || name === 'ragflow'
  const ok = skipHealthSelf ? true : await waitHealth((target as any).healthCheck)
  emitStdout(sender, streamId, `[debug] health ${name}=${ok}`)
  if (!ok) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `模块未就绪: ${name}` }

  // 可选伴随服务：dify 启动后尝试启动 dify-web / dify-plugin（不阻塞主流程）
  try {
    if (name === 'dify') {
      const reg = loadRegistry()
      const web = (reg.modules || []).find(m => m.name === 'dify-web') as ModuleSchema | undefined
      if (web) {
        emitStdout(sender, streamId, `[debug] ensure companion dify-web`)
        createOrStartContainerForModule(web)
          .then(() => emitStdout(sender, streamId, `[debug] started dify-web`))
          .catch(e => emitStdout(sender, streamId, `[debug] start dify-web error: ${String(e?.message || e)}`))
      }
      const plugin = (reg.modules || []).find(m => m.name === 'dify-plugin') as ModuleSchema | undefined
      if (plugin) {
        emitStdout(sender, streamId, `[debug] ensure companion dify-plugin`)
        createOrStartContainerForModule(plugin)
          .then(() => emitStdout(sender, streamId, `[debug] started dify-plugin`))
          .catch(e => emitStdout(sender, streamId, `[debug] start dify-plugin error: ${String(e?.message || e)}`))
      }
    }
  } catch (e: any) {
    emitStdout(sender, streamId, `[debug] companion dify-web error: ${String(e?.message || e)}`)
  }
  return { success: true, message: `start ${name} OK` }
}

export async function stopModuleStream(name: ModuleName, sender: WebContents, streamId: string): Promise<IpcResponse> {
  const reg = loadRegistry()
  const modules = reg.modules || []
  const target = modules.find(m => m.name === name)
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` }

  if (target.type !== 'feature') {
    const users = modules.filter(m => m.type === 'feature' && (m.dependsOn || []).includes(name))
    if (users.length > 0) {
      const runningSet = await listRunningContainerNames()
      const inUse = users.some(u => runningSet.has(containerNameFor(u.name)))
      if (inUse) {
        emitStdout(sender, streamId, `[dep] block stop basic ${name}: in use by ${users.map(u=>u.name).join(', ')}`)
        return { success: false, code: 'E_IN_USE', message: `基础服务 ${name} 仍被运行中的功能模块依赖，已阻止停止。` }
      }
    }
  }
  try { await stopContainerByName(containerNameFor(name)) } catch {}

  // 依赖感知回收（可选，仅当 target 为 feature）
  try {
    if (target.type === 'feature') {
      const { autoStopUnusedDeps } = getGlobalConfig() as any
      if (autoStopUnusedDeps) {
        const deps = (target.dependsOn || []) as ModuleName[]
        if (deps.length > 0) {
          const runningNames = await listRunningContainerNames()
          for (const dep of deps) {
            const users = modules.filter(m => m.name !== name && m.type === 'feature' && (m.dependsOn || []).includes(dep))
            const inUse = users.some(u => runningNames.has(containerNameFor(u.name)))
            if (!inUse) {
              emitStdout(sender, streamId, `[dep] auto-stop unused basic ${dep}`)
              await stopContainerByName(containerNameFor(dep))
            }
          }
        }
      }
    }
  } catch {}
  return { success: true, message: `stop ${name} OK` }
}
