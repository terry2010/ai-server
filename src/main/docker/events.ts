import { BrowserWindow } from 'electron'
import { loadRegistry } from '../config/store'
import { servicesForModule, containerNameFor } from './naming'
import { getModuleStatus } from './status'
import { dockerRunning } from './utils'
import { IPC } from '../../shared/ipc-contract'

const INTERESTING = new Set(['start', 'stop', 'die', 'restart', 'health_status', 'destroy'])
let retryTimer: NodeJS.Timeout | null = null
let currentStream: any = null
// 对模块状态刷新做去抖，避免事件风暴导致频繁 docker ps/inspect
const debounceTimers = new Map<string, NodeJS.Timeout>()
// 进一步：全局批处理，将多个模块刷新合并为每秒一批，串行调用，降低子进程抖动
const pendingModules = new Set<string>()
let batchTimer: NodeJS.Timeout | null = null

function getDocker(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Docker = require('dockerode')
    const isWin = process.platform === 'win32'
    return isWin ? new Docker({ socketPath: '//./pipe/docker_engine' }) : new Docker({ socketPath: '/var/run/docker.sock' })
  } catch (e) {
    console.warn('[docker-events] dockerode not installed, skip events', e)
    return null
  }
}

async function resolveModuleByContainerName(cname: string): Promise<string | undefined> {
  try {
    const reg = loadRegistry()
    for (const m of (reg.modules || [])) {
      const arr = (m.type === 'feature' ? servicesForModule(m.name) : [m.name])
      for (const s of arr) if (containerNameFor(s) === cname) return m.name
    }
  } catch {}
  return undefined
}

function broadcastStatus(name: string, statusResp: any) {
  try {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send(IPC.ModuleStatusEvent, { name, status: statusResp })
  } catch {}
}

function scheduleRefresh(name: string, fn: () => Promise<void>, delay = 300) {
  const t = debounceTimers.get(name)
  if (t) clearTimeout(t)
  const h = setTimeout(() => {
    debounceTimers.delete(name)
    fn().catch(() => {})
  }, delay)
  debounceTimers.set(name, h)
}

function enqueueModule(name: string) {
  pendingModules.add(name)
}

async function processBatchOnce() {
  if (pendingModules.size === 0) return
  // 复制并清空，避免长时间持有 Set
  const names = Array.from(pendingModules)
  pendingModules.clear()
  // 串行依次获取状态，避免并发导致 docker CLI 并行进程过多
  for (const mod of names) {
    try {
      const statusResp = await getModuleStatus(mod as any)
      broadcastStatus(mod, statusResp)
    } catch {}
  }
}

function ensureBatchLoop() {
  if (batchTimer) return
  batchTimer = setInterval(() => { processBatchOnce().catch(() => {}) }, 1000)
}

async function handleEvent(docker: any, evt: any) {
  try {
    if (!evt || evt.Type !== 'container') return
    if (evt.Action && !INTERESTING.has(String(evt.Action))) return
    // 优先使用事件自带的容器名，避免每次都调用 inspect
    let cname: string | undefined = String(evt?.Actor?.Attributes?.name || '').trim()
    if (!cname) {
      const id = evt.id || evt.Actor?.ID
      if (!id) return
      try {
        const info = await docker.getContainer(id).inspect()
        cname = String(info?.Name || '').replace(/^\//, '')
      } catch {
        return
      }
    }
    const mod = await resolveModuleByContainerName(cname)
    if (!mod) return
    // 改为加入批处理队列，由定时批处理统一刷新，避免重复与并发抖动
    enqueueModule(mod)
  } catch (e) {
    console.warn('[docker-events] handleEvent error', e)
  }
}

function startStream(docker: any) {
  if (!docker) return
  if (currentStream) { try { currentStream.destroy?.() } catch {} currentStream = null }
  // 仅订阅“当前时刻之后”的事件，并过滤为我们关心的 container 事件，避免历史事件回放造成风暴
  const since = Math.floor(Date.now() / 1000)
  const filters = { type: ['container'], event: Array.from(INTERESTING) }
  docker.getEvents({ since, filters }, (err: any, stream: any) => {
    if (err) { /* 降低日志噪音 */ scheduleRetry(); return }
    currentStream = stream
    // 确保批处理循环已启动
    ensureBatchLoop()
    stream.on('data', (buf: Buffer) => {
      const text = buf.toString('utf8')
      text.split(/\n+/).forEach((line) => {
        const t = line.trim(); if (!t) return
        try { const evt = JSON.parse(t); handleEvent(docker, evt) } catch {}
      })
    })
    stream.on('end', () => { console.warn('[docker-events] stream end'); scheduleRetry() })
    stream.on('error', (e: any) => { console.warn('[docker-events] stream error', e); scheduleRetry() })
  })
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => { retryTimer = null; tryStart() }, 5000)
}

export async function tryStart() {
  const running = await dockerRunning().catch(() => false)
  if (!running) { scheduleRetry(); return }
  const docker = getDocker()
  if (!docker) { scheduleRetry(); return }
  startStream(docker)
  ensureBatchLoop()
}

export function stopWatch() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  if (currentStream) { try { currentStream.destroy?.() } catch {} currentStream = null }
  // 清理所有去抖计时器
  for (const t of debounceTimers.values()) { try { clearTimeout(t) } catch {} }
  debounceTimers.clear()
  if (batchTimer) { try { clearInterval(batchTimer) } catch {} batchTimer = null }
  pendingModules.clear()
}
