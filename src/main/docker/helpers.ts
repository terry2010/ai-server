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
    case 'dify': return applyRegistryMirror('langgenius/dify-api:latest')
    // ragflow 使用官方已构建的生产镜像（包含 web dist 与 entrypoint.sh）
    // 若你在 registry 对 ragflow.image 做了自定义，将优先生效（见上）。
    case 'ragflow': return applyRegistryMirror('infiniflow/ragflow:v0.20.5-slim')
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
      // 让镜像内的 ENTRYPOINT 生效（Dockerfile: ENTRYPOINT ["./entrypoint.sh"])；不覆盖
      return undefined
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
  const image = resolveImage(mod)
  if (!image) throw new Error(`模块未配置镜像: ${mod.name}`)
  await ensureImage(image)
  const state = await getContainerState(cname)

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
  // 若容器已存在但“镜像/端口映射/绑定网卡”与期望不一致，删除后重建
  let needCreate = state === 'missing'
  if (!needCreate) {
    try {
      const oldInfo = await docker.getContainer(cname).inspect()
      const oldImage = String(oldInfo?.Config?.Image || '')
      // 期望的端口绑定
      const desiredBindings = resolvedPorts.length > 0 ? toPortBindings(resolvedPorts as any) : undefined
      const desiredKeys = desiredBindings ? Object.keys(desiredBindings) : []
      const oldBindings = (oldInfo?.HostConfig?.PortBindings || undefined) as Record<string, Array<{HostIp?: string; HostPort?: string}>> | undefined
      const oldKeys = oldBindings ? Object.keys(oldBindings) : []
      const sameImage = (!!oldImage && oldImage === image)
      const sameBindingKeys = JSON.stringify(desiredKeys.sort()) === JSON.stringify(oldKeys.sort())
      let sameBindingValues = sameBindingKeys
      if (sameBindingKeys && desiredBindings && oldBindings) {
        for (const k of desiredKeys) {
          const a = (desiredBindings[k] || []).map((x: { HostIp?: string; HostPort?: string }) => `${x.HostIp||''}:${x.HostPort||''}`).sort().join(',')
          const b = (oldBindings[k] || []).map((x: { HostIp?: string; HostPort?: string }) => `${x.HostIp||''}:${x.HostPort||''}`).sort().join(',')
          if (a !== b) { sameBindingValues = false; break }
        }
      }
      // 比较命令（需要先生成期望命令）
      const desiredCmdRaw = resolveCommand(mod)
      const desiredCmd = Array.isArray(desiredCmdRaw) ? desiredCmdRaw.map(s => resolveExpr(String(s)) || '').filter(Boolean) : undefined
      const oldCmd = (oldInfo?.Config?.Cmd || []) as string[]
      const sameCmd = JSON.stringify(desiredCmd || []) === JSON.stringify(oldCmd || [])
      if (!sameImage || !sameBindingKeys || !sameBindingValues || !sameCmd) {
        const reason = !sameImage ? `image mismatch -> ${oldImage} -> ${image}` : (!sameBindingKeys ? 'port keys changed' : (!sameBindingValues ? 'port bindings changed' : 'cmd changed'))
        emitOpsLog(`[docker] recreate ${cname}: ${reason}`)
        try { if (oldInfo?.State?.Running) await docker.getContainer(cname).stop() } catch {}
        try { await docker.getContainer(cname).remove({ force: true }) } catch {}
        needCreate = true
      }
    } catch {}
  }

  if (needCreate) {
    // 解析命令中的占位符（例如 ${REDIS_PASSWORD:xxx}）
    const cmdRaw = resolveCommand(mod)
    let cmdResolved: string[] | undefined = undefined
    if (Array.isArray(cmdRaw)) {
      cmdResolved = cmdRaw.map(s => resolveExpr(String(s)) || '').filter(s => s.length > 0)
    }
    const createOpts: any = {
      name: cname,
      Image: image,
      Env: toEnvArray(envRec),
      Cmd: cmdResolved,
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
    emitOpsLog(`[docker] create ${cname} with image ${image}`)
    await docker.createContainer(createOpts)
  }
  const st2 = await getContainerState(cname)
  if (st2 !== 'running') {
    emitOpsLog(`[docker] start ${cname}`)
    await docker.getContainer(cname).start()
  }

  // ragflow 启动后做一次诊断，帮助定位 80/9380 暴露与服务监听问题
  if (String(mod.name).toLowerCase() === 'ragflow') {
    try {
      const c = docker.getContainer(cname)
      // 仅确保前端目录存在一个占位页（其余由卷挂载的 ragflow.conf 接管），避免默认欢迎页/404
      try {
        const prep = await c.exec({ Cmd: ['sh', '-lc', [
          'set -e',
          'mkdir -p /ragflow/web/dist',
          'if [ ! -f /ragflow/web/dist/index.html ]; then echo "<!doctype html><html><head><meta charset=\"utf-8\"><title>RAGFlow</title></head><body><h3>RAGFlow 正在启动...</h3></body></html>" > /ragflow/web/dist/index.html; fi',
          'true'
        ].join('; ')], AttachStdout: true, AttachStderr: true })
        await new Promise<void>((resolve) => { prep.start({ hijack: true, stdin: false }, () => resolve()) })
        emitOpsLog('[diag][ragflow] web dist ensured')
      } catch (e: any) {
        emitOpsLog(`[diag][ragflow] ensure web dist error: ${String(e?.message || e)}`, 'warn')
      }
      // 关键：在容器启动后立即尝试让 Nginx 重新加载配置，确保我们通过卷挂载的 ragflow.conf 立刻生效
      try {
        const reload = await c.exec({ Cmd: ['sh', '-lc', 'nginx -t && nginx -s reload || true'], AttachStdout: true, AttachStderr: true })
        await new Promise<void>((resolve) => { reload.start({ hijack: true, stdin: false }, () => resolve()) })
        emitOpsLog('[diag][ragflow] nginx reloaded')
      } catch (e: any) {
        emitOpsLog(`[diag][ragflow] nginx reload error: ${String(e?.message || e)}`, 'warn')
      }
      const info = await c.inspect()
      const pb = info?.HostConfig?.PortBindings || {}
      emitOpsLog(`[diag][ragflow] Host PortBindings: ${JSON.stringify(pb)}`)
      // 容器内检查 80/9380 监听与本地请求
      const exec = await c.exec({ Cmd: ['sh', '-lc', [
        'echo "--- listeners ---"',
        'which ss >/dev/null 2>&1 && ss -ltnp || netstat -tlnp || true',
        'echo "--- nginx.conf ---"',
        'if [ -f /etc/nginx/nginx.conf ]; then sed -n "1,200p" /etc/nginx/nginx.conf; fi',
        'echo "--- conf.d list ---"',
        'ls -la /etc/nginx/conf.d || true',
        'for f in /etc/nginx/conf.d/*.conf; do echo "--- conf.d:$f ---"; sed -n "1,200p" "$f"; done 2>/dev/null || true',
        'echo "--- web dist ---"',
        'ls -la /ragflow/web/dist 2>/dev/null || true',
        'echo "--- curl 80 / ---"',
        'curl -I -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ || echo ERR',
        'echo "--- curl 80 /index.html ---"',
        'curl -I -s -o /dev/null -w "%{http_code}" http://127.0.0.1/index.html || echo ERR',
        'echo "--- curl 80 /#/login ---"',
        'curl -I -s -o /dev/null -w "%{http_code}" http://127.0.0.1/#/login || echo ERR',
        'echo "--- curl 9380 /api/health ---"',
        'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9380/api/health || echo ERR'
      ].join("; ")], AttachStdout: true, AttachStderr: true, Tty: false })
      await new Promise<void>((resolve) => {
        exec.start({ hijack: true, stdin: false }, (err: any, stream: any) => {
          if (err) { emitOpsLog(`[diag][ragflow] exec error: ${String(err?.message || err)}`, 'warn'); return resolve() }
          let buf = ''
          stream.on('data', (d: Buffer) => { buf += d.toString() })
          stream.on('end', () => { emitOpsLog(`[diag][ragflow] inside ss/curl:\n${buf}`); resolve() })
          stream.on('error', () => resolve())
        })
      })
      // 主机侧尝试访问绑定的 host 端口
      try {
        const entries = Object.entries(pb as any)
        for (const [key, arr] of entries) {
          const maps = Array.isArray(arr) ? arr as any[] : []
          for (const m of maps) {
            const host = (m?.HostIp && m.HostIp !== '0.0.0.0') ? m.HostIp : '127.0.0.1'
            const port = m?.HostPort
            const url = `http://${host}:${port}/`
            try {
              const res = await fetch(url as any)
              emitOpsLog(`[diag][ragflow] host fetch ${url} -> ${res.status}`)
            } catch (e: any) {
              emitOpsLog(`[diag][ragflow] host fetch ${url} error: ${String(e?.message || e)}`, 'warn')
            }
          }
        }
      } catch (e: any) {
        emitOpsLog(`[diag][ragflow] host fetch diag error: ${String(e?.message || e)}`, 'warn')
      }
    } catch (e: any) {
      emitOpsLog(`[diag][ragflow] diag failed: ${String(e?.message || e)}`, 'warn')
    }
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
