import type { ModuleSchema } from '../config/schema'
import { getGlobalConfig } from '../config/store'
import { resolveDefaultVar } from './template'
import { emitOpsLog } from '../logs/app-ops-log'

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
    const mirrors = Array.isArray(cfg?.docker?.mirrors) ? (cfg.docker.mirrors as string[]) : []
    if (mirrors.length === 0) return image
    // parse image into [registry]/[namespace]/repo:tag
    // if no registry specified, default is docker.io
    const hasRegistry = image.includes('/') && (image.split('/')[0].includes('.') || image.split('/')[0].includes(':'))
    let registry = hasRegistry ? image.split('/')[0] : 'docker.io'
    let rest = hasRegistry ? image.substring(registry.length + 1) : image
    // ensure library namespace for single-segment repo names
    if (!rest.includes('/')) rest = `library/${rest}`
    if (registry === 'docker.io' || registry === 'index.docker.io' || registry === 'registry-1.docker.io') {
      // 依次尝试多个镜像基址（规范化为 host[:port]，不含协议）
      for (const m of mirrors) {
        const trimmed = normalizeMirrorHost(m)
        if (trimmed) return `${trimmed}/${rest}`
      }
    }
    return image
  } catch {
    return image
  }
}

function normalizeMirrorHost(m: string): string {
  try {
    // 去掉协议与尾随斜杠，仅保留 host[:port]/path 可选
    let s = String(m).trim()
    s = s.replace(/^https?:\/\//i, '')
    s = s.replace(/\/$/, '')
    return s
  } catch { return m }
}

function buildMirrorCandidates(image: string): string[] {
  try {
    const cfg = getGlobalConfig() as any
    const mirrorsRaw = Array.isArray(cfg?.docker?.mirrors) ? (cfg.docker.mirrors as string[]) : []
    const mirrors = mirrorsRaw.map(normalizeMirrorHost).filter(Boolean)
    // 解析 registry 与剩余部分
    const hasRegistry = image.includes('/') && (image.split('/')[0].includes('.') || image.split('/')[0].includes(':'))
    const registry = hasRegistry ? image.split('/')[0] : 'docker.io'
    const rest0 = hasRegistry ? image.substring(registry.length + 1) : image
    const rest = rest0.includes('/') ? rest0 : `library/${rest0}`
    const isDockerHub = (registry === 'docker.io' || registry === 'index.docker.io' || registry === 'registry-1.docker.io')
    const isMirrorHost = mirrors.includes(registry)
    const cands: string[] = []
    if (isDockerHub) {
      for (const h of mirrors) cands.push(`${h}/${rest}`)
      cands.push(`docker.io/${rest}`)
    } else if (isMirrorHost) {
      // 当前就是某个镜像站，尝试其它镜像站 + 原始 docker.io
      for (const h of mirrors) cands.push(`${h}/${rest}`)
      cands.push(`docker.io/${rest}`)
    } else {
      // 非 docker hub 与镜像站，返回原样
      cands.push(image)
    }
    // 去重保序
    return Array.from(new Set(cands))
  } catch { return [image] }
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
  if (has) return
  emitOpsLog(`[image] local miss, will pull: ${image}`)
  const candidates = buildMirrorCandidates(image)
  let lastErr: any = null
  for (const img of candidates) {
    try {
      emitOpsLog(`[image] pull start: ${img}`)
      await new Promise<void>((resolve, reject) => {
        docker.pull(img, (err: any, stream: any) => {
          if (err) {
            emitOpsLog(`[image] pull error(init): ${img} -> ${String(err?.message || err)}`, 'error')
            return reject(err)
          }
          const onFinished = (err2: any) => {
            if (err2) {
              emitOpsLog(`[image] pull error: ${img} -> ${String(err2?.message || err2)}`, 'error')
              reject(err2)
            } else {
              emitOpsLog(`[image] pull done: ${img}`)
              resolve()
            }
          }
          const onProgress = (evt: any) => {
            try {
              if (evt?.status) {
                const id = evt.id ? ` (${evt.id})` : ''
                const prog = evt.progress ? ` ${evt.progress}` : ''
                emitOpsLog(`[image] ${evt.status}${id}${prog}: ${img}`)
              }
            } catch {}
          }
          docker.modem.followProgress(stream, onFinished, onProgress)
        })
      })
      // 成功
      return
    } catch (e) {
      lastErr = e
      // 尝试下一个候选
      continue
    }
  }
  // 所有候选失败
  const msg = String(lastErr?.message || lastErr || 'unknown')
  emitOpsLog(`[image] pull failed for all mirrors: ${candidates.join(', ')} -> ${msg}`, 'error')
  throw lastErr
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
