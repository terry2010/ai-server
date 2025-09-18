import type { ModuleName, ModuleStatus, IpcResponse } from '../../shared/ipc-contract'
import { loadRegistry } from '../config/store'
import { containerNameFor, servicesForModule } from './naming'
import { dockerRunning } from './utils'

function getDocker(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Docker = require('dockerode')
    const isWin = process.platform === 'win32'
    return isWin ? new Docker({ socketPath: '//./pipe/docker_engine' }) : new Docker({ socketPath: '/var/run/docker.sock' })
  } catch {
    return null
  }
}

// 简易内存缓存容器（仅当前进程存活期间有效）
const statusCache: Record<string, { ts: number; val: IpcResponse<ModuleStatus> }> = {}
let psCache: { ts: number; lines: string[] } | null = null
const PS_TTL = 1000
const STATE_TTL = 1000
const containerStateCache: Record<string, { ts: number; state: string }> = {}

function getCachedContainerState(cname: string): string | null {
  const now = Date.now()
  const hit = containerStateCache[cname]
  if (hit && (now - hit.ts) < STATE_TTL) return hit.state
  return null
}
function setCachedContainerState(cname: string, state: string) {
  containerStateCache[cname] = { ts: Date.now(), state }
}

async function listContainersLines(): Promise<string[]> {
  const now = Date.now()
  if (psCache && (now - psCache.ts) < PS_TTL) return psCache.lines
  const docker = getDocker()
  if (!docker) { psCache = { ts: now, lines: [] }; return [] }
  try {
    const list = await docker.listContainers({ all: true })
    const lines: string[] = []
    for (const it of list) {
      const name = (Array.isArray(it.Names) && it.Names[0] ? String(it.Names[0]) : '').replace(/^\//, '')
      if (!name) continue
      const portStr = (it.Ports || [])
        .filter((p: any) => p.PublicPort)
        .map((p: any) => `${p.IP || '0.0.0.0'}:${p.PublicPort}->${p.PrivatePort}/${p.Type || 'tcp'}`)
        .join(', ')
      lines.push(`${name}|${portStr}`)
    }
    psCache = { ts: now, lines }
    return lines
  } catch {
    psCache = { ts: now, lines: [] }
    return []
  }
}

export async function listRunningContainerNames(): Promise<Set<string>> {
  try {
    const docker = getDocker()
    if (!docker) return new Set()
    const list = await docker.listContainers({ all: false })
    const set = new Set<string>()
    for (const it of list) {
      const name = (Array.isArray(it.Names) && it.Names[0] ? String(it.Names[0]) : '').replace(/^\//, '')
      if (name) set.add(name)
    }
    return set
  } catch {
    return new Set()
  }
}

// 根据模块名解析其对应的容器名集合（兼容历史非 ai- 前缀的容器）
export async function resolveContainerNamesForModule(name: ModuleName): Promise<string[]> {
  const docker = getDocker();
  if (!docker) return [];
  // 预期名称（标准 ai-<service>）
  const expected = servicesForModule(name).map(s => containerNameFor(s));
  try {
    const all = await docker.listContainers({ all: true });
    const byName = new Map<string, any>();
    const labelMatches: string[] = [];
    for (const it of all) {
      const nm = (Array.isArray(it.Names) && it.Names[0] ? String(it.Names[0]) : '').replace(/^\//, '');
      if (!nm) continue;
      byName.set(nm, it);
      const labels = it.Labels || {};
      if (labels['ai.module'] === name) labelMatches.push(nm);
    }
    // 优先：存在标准命名的容器
    const existExpected = expected.filter(n => byName.has(n));
    if (existExpected.length > 0) return existExpected;
    // 次选：存在带标签的容器（我们新创建的）
    if (labelMatches.length > 0) return labelMatches;
    // 兜底：名称模糊匹配（包含模块名的容器，尽量避免误伤）
    const lower = name.toLowerCase();
    const fuzzy: string[] = [];
    for (const nm of byName.keys()) {
      const clean = nm.toLowerCase();
      if (clean === lower || clean.startsWith(`ai-${lower}`) || clean.includes(`_${lower}`) || clean.includes(`-${lower}`) || clean.includes(`${lower}-`)) {
        fuzzy.push(nm);
      }
    }
    return fuzzy;
  } catch {
    return expected;
  }
}

export async function getModuleStatus(name: ModuleName): Promise<IpcResponse<ModuleStatus>> {
  try {
    const now = Date.now()
    const cacheKey = `status:${name}`
    const hit = statusCache[cacheKey]
    if (hit && now - hit.ts < 1500) return hit.val

    const reg = loadRegistry()
    const mods = reg.modules || []
    const self = mods.find(m => m.name === name)
    if (!self) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` }

    const runningDocker = await dockerRunning()
    if (!runningDocker) {
      const val: IpcResponse<ModuleStatus> = { success: true, data: { running: false, status: 'stopped', ports: {}, usedBy: self.type === 'basic' ? [] : undefined } }
      statusCache[cacheKey] = { ts: now, val }
      return val
    }

    const containers = await resolveContainerNamesForModule(name)

    const ports: Record<string, string> = {}
    const states: string[] = []

    try {
      const docker = getDocker()
      if (docker) {
        const lines = await listContainersLines()
        for (const cname of containers) {
          const match = lines.find(l => l.startsWith(cname + '|'))
          if (match) {
            const portStr = match.split('|')[1] || ''
            if (portStr) ports[cname] = portStr
          }
        }
        const listAll = await docker.listContainers({ all: true })
        const byName: Record<string, any> = {}
        for (const it of listAll) {
          const nm = (Array.isArray(it.Names) && it.Names[0] ? String(it.Names[0]) : '').replace(/^\//, '')
          if (nm) byName[nm] = it
        }
        for (const cname of containers) {
          let state = getCachedContainerState(cname)
          if (!state) {
            const info = byName[cname]
            state = String(info?.State || 'stopped').toLowerCase()
            setCachedContainerState(cname, state)
          }
          states.push(state || 'stopped')
        }
      }
    } catch {}

    let status: ModuleStatus['status'] = 'stopped'
    const isStoppedState = (s: string) => ['exited', 'created', 'dead', 'stopped', 'paused'].includes(s)
    if (states.length === 0) {
      // 无任何容器时按“停止”处理（可能是首次未初始化或已被清理）
      status = 'stopped'
    } else {
      const allRunning = states.every(s => s === 'running')
      const allFullyStopped = states.every(s => isStoppedState(s))
      if (allRunning) status = 'running'
      else if (allFullyStopped) status = 'stopped'
      else status = 'error'
    }
    const running = status === 'running'

    let usedBy: string[] | undefined = undefined
    if (self && self.type === 'basic') {
      const runningSet = await listRunningContainerNames()
      const users = mods.filter(m => m.type === 'feature' && (m.dependsOn || []).includes(name))
      const activeUsers = users.filter(u => {
        const svcs = servicesForModule(u.name as ModuleName)
        return svcs.some(s => runningSet.has(containerNameFor(s)))
      }).map(u => u.name)
      usedBy = activeUsers
    }

    const val: IpcResponse<ModuleStatus> = { success: true, data: { running, status, ports, usedBy } }
    statusCache[cacheKey] = { ts: now, val }
    return val
  } catch (e: any) {
    return { success: false, code: 'E_RUNTIME', message: String(e?.message ?? e) }
  }
}
