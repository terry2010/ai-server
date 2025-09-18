import type { ModuleSchema } from '../config/schema'
import { getGlobalConfig } from '../config/store'
import { resolveDefaultVar } from './template'

export function getDocker(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Docker = require('dockerode')
    const isWin = process.platform === 'win32'
    return isWin ? new Docker({ socketPath: '//./pipe/docker_engine' }) : new Docker({ socketPath: '/var/run/docker.sock' })
  } catch {
    return null
  }
}

function resolveImage(mod: ModuleSchema): string | undefined {
  const img = (mod as any).image as string | undefined
  if (img && img.trim()) return applyRegistryMirror(img.trim())
  const name = String(mod.name).toLowerCase()
  switch (name) {
    case 'postgres': return applyRegistryMirror('postgres:16')
    case 'mysql': return applyRegistryMirror('mysql:8')
    case 'redis': return applyRegistryMirror('redis:7-alpine')
    case 'minio': return applyRegistryMirror('minio/minio:latest')
    case 'qdrant': return applyRegistryMirror('qdrant/qdrant:latest')
    case 'meilisearch': return applyRegistryMirror('getmeili/meilisearch:latest')
    case 'elasticsearch': return applyRegistryMirror('docker.io/library/elasticsearch:8.14.3')
    case 'n8n': return applyRegistryMirror('n8nio/n8n:latest')
    case 'oneapi': return applyRegistryMirror('justsong/one-api:latest')
    case 'dify': return applyRegistryMirror('langgenius/dify:latest')
    case 'ragflow': return applyRegistryMirror('python:3.11-slim')
    default:
      return undefined
  }
}

function applyRegistryMirror(image: string): string {
  try {
    const cfg = getGlobalConfig() as any
    const mirror = cfg?.docker?.mirror?.url as string | undefined
    const enabled = !!cfg?.docker?.mirror?.enabled
    if (!enabled || !mirror) return image
    // parse image into [registry]/[namespace]/repo:tag
    // if no registry specified, default is docker.io
    const hasRegistry = image.includes('/') && (image.split('/')[0].includes('.') || image.split('/')[0].includes(':'))
    let registry = hasRegistry ? image.split('/')[0] : 'docker.io'
    let rest = hasRegistry ? image.substring(registry.length + 1) : image
    // ensure library namespace for single-segment repo names
    if (!rest.includes('/')) rest = `library/${rest}`
    if (registry === 'docker.io' || registry === 'index.docker.io' || registry === 'registry-1.docker.io') {
      // rewrite to mirror
      const trimmed = mirror.replace(/\/$/, '')
      return `${trimmed}/${rest}`
    }
    return image
  } catch {
    return image
  }
}

function resolveCommand(mod: ModuleSchema): string[] | undefined {
  const cmd: any = (mod as any).command
  if (Array.isArray(cmd) && cmd.length > 0) return cmd.map(String)
  if (typeof cmd === 'string' && cmd.trim()) return cmd.split(/\s+/)
  const name = String(mod.name).toLowerCase()
  switch (name) {
    case 'minio':
      return ['server', '/data', '--console-address', ':9001']
    case 'ragflow':
      return ['sleep', 'infinity']
    case 'dify':
      return ['sleep', 'infinity']
    default:
      return undefined
  }
}

export async function ensureImage(image: string): Promise<void> {
  const docker = getDocker()
  if (!docker) throw new Error('dockerode 不可用')
  const imgs = await docker.listImages()
  const has = imgs.some((im: any) => (im.RepoTags || []).includes(image))
  if (!has) {
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: any, stream: any) => {
        if (err) return reject(err)
        docker.modem.followProgress(stream, (err2: any) => (err2 ? reject(err2) : resolve()))
      })
    })
  }
}

export function toEnvArray(rec?: Record<string, string>): string[] | undefined {
  if (!rec) return undefined
  return Object.entries(rec).map(([k, v]) => `${k}=${v}`)
}

export function toPortBindings(ports?: Array<{ container: number; host: number | string; bind?: string }>): any | undefined {
  if (!ports || ports.length === 0) return undefined
  const binds: Record<string, Array<{ HostIp?: string; HostPort?: string }>> = {}
  for (const p of ports) {
    const key = `${p.container}/tcp`
    const arr = binds[key] || (binds[key] = [])
    arr.push({ HostIp: p.bind ? String(p.bind) : '127.0.0.1', HostPort: String(p.host) })
  }
  return binds
}

export function toBinds(vols?: Array<{ host: string; container: string }>): string[] | undefined {
  if (!vols || vols.length === 0) return undefined
  return vols.map(v => `${v.host}:${v.container}`)
}

export async function getContainerState(cname: string): Promise<'running'|'stopped'|'missing'|string> {
  const docker = getDocker()
  if (!docker) return 'missing'
  try {
    const info = await docker.getContainer(cname).inspect()
    return String(info?.State?.Status || 'stopped').toLowerCase()
  } catch {
    return 'missing'
  }
}

export async function createOrStartContainerForModule(mod: ModuleSchema): Promise<void> {
  const docker = getDocker()
  if (!docker) throw new Error('dockerode 不可用')
  const cname = `ai-${mod.name}`
  const state = await getContainerState(cname)
  const image = resolveImage(mod)
  if (!image) throw new Error(`模块未配置镜像: ${mod.name}`)
  await ensureImage(image)

  // ===== 变量与端口占位解析 =====
  const dict: Record<string, string> = {}
  try {
    const g = getGlobalConfig() as any
    for (const [k, v] of Object.entries(g || {})) dict[k] = String(v)
  } catch {}
  try {
    // module.variables: 形如 { ONEAPI_PORT: "${ONEAPI_PORT:18080}" } 或带默认值表达式
    const vars = (mod as any).variables as Record<string, string> | undefined
    if (vars) for (const [k, raw] of Object.entries(vars)) {
      const dflt = resolveDefaultVar(String(raw))
      dict[k] = dflt ?? String(raw)
    }
  } catch {}
  for (const [k, v] of Object.entries(process.env)) if (typeof v === 'string') dict[k] = v

  function resolveExpr(expr?: string): string | undefined {
    if (!expr) return expr
    return expr.replace(/\$\{([A-Za-z0-9_]+)(?::-?([^}]+))?}/g, (_m, varName: string, dflt?: string) => {
      if (Object.prototype.hasOwnProperty.call(dict, varName)) return String(dict[varName])
      if (dflt !== undefined) return String(dflt)
      return ''
    })
  }

  // 生成 Env：优先 variables（解析默认），再合并 mod.env（同样解析表达式）
  const envRec: Record<string, string> = {}
  try {
    const vars = (mod as any).variables as Record<string, string> | undefined
    if (vars) for (const [k, raw] of Object.entries(vars)) envRec[k] = resolveExpr(String(raw)) || ''
  } catch {}
  try {
    const env2 = (mod as any).env as Record<string, string> | undefined
    if (env2) for (const [k, raw] of Object.entries(env2)) envRec[k] = resolveExpr(String(raw)) || ''
  } catch {}

  // 生成端口绑定：兼容两种 schema，统一为 { container, host, bind }
  const resolvedPorts = (mod.ports || [])
    .map((p: any) => {
      const containerPortVal = (p.container ?? p.containerPort) as number | string | undefined
      const hostVal = p.host ?? p.hostPort
      const hostStrRaw = typeof hostVal === 'string' ? resolveExpr(String(hostVal)) : String(hostVal)
      const hostStr = (hostStrRaw ?? '').toString().trim()
      const bindVal = p.bind
      const bindStrRaw = bindVal ? resolveExpr(String(bindVal)) : '127.0.0.1'
      const bindStr = (bindStrRaw ?? '127.0.0.1').toString().trim() || '127.0.0.1'
      const hostNum = parseInt(hostStr, 10)
      const contNum = typeof containerPortVal === 'string' ? parseInt(containerPortVal, 10) : Number(containerPortVal)
      if (!Number.isFinite(hostNum) || hostNum <= 0) return null
      if (!Number.isFinite(contNum) || contNum <= 0) return null
      return { container: contNum, host: hostNum, bind: bindStr }
    })
    .filter((v): v is { container: number; host: number; bind: string } => !!v)
  if (state === 'missing') {
    const createOpts: any = {
      name: cname,
      Image: image,
      Env: toEnvArray(envRec),
      Cmd: resolveCommand(mod),
      ExposedPorts: resolvedPorts.length > 0 ? resolvedPorts.reduce((acc: any, p: any) => { if (p.container) acc[`${p.container}/tcp`] = {}; return acc }, {} as any) : undefined,
      Labels: { 'ai.module': mod.name, 'ai.type': String((mod as any).type || '') },
      HostConfig: {
        PortBindings: resolvedPorts.length > 0 ? toPortBindings(resolvedPorts as any) : undefined,
        Binds: toBinds(mod.volumes as any),
        NetworkMode: 'ai-server-net',
        AutoRemove: false,
        RestartPolicy: { Name: 'unless-stopped' }
      }
    }
    await docker.createContainer(createOpts)
  }
  const st2 = await getContainerState(cname)
  if (st2 !== 'running') {
    await docker.getContainer(cname).start()
  }
}

export async function stopContainerByName(cname: string): Promise<void> {
  const docker = getDocker()
  if (!docker) return
  try {
    const c = docker.getContainer(cname)
    const info = await c.inspect()
    if (info?.State?.Running) await c.stop()
  } catch {}
}
