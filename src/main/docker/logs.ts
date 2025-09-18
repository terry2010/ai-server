import type { ModuleName, IpcResponse, ModuleType } from '../../shared/ipc-contract'
import { loadRegistry } from '../config/store'
import { containerNameFor, servicesForModule } from './naming'
import { resolveContainerNamesForModule } from './status'

export interface AppLogEntry { id: string; timestamp: string; service: string; module: string; moduleType: ModuleType; level: 'error'|'warn'|'info'|'debug'|'log'; message: string }

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

// 读取模块相关容器的最近日志（聚合返回）——使用 dockerode
export async function getModuleLogs(name?: ModuleName, tail: number = 200): Promise<IpcResponse<{ entries: AppLogEntry[] }>> {
  try {
    const docker = getDocker()
    if (!docker) return { success: false, code: 'E_RUNTIME', message: 'dockerode 不可用' }
    const reg = loadRegistry()
    const mods = reg.modules || []
    let targets: string[] = []
    if (name) {
      const self = mods.find((m: any) => m.name === name)
      if (!self) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` }
      targets = await resolveContainerNamesForModule(name)
    } else {
      // 全量列出：对每个模块解析其容器名（可能较慢，但用于日志汇总视图）
      const all: string[] = []
      for (const m of mods) {
        const arr = await resolveContainerNamesForModule(m.name as ModuleName)
        all.push(...arr)
      }
      targets = Array.from(new Set(all))
    }
    const entries: AppLogEntry[] = []
    for (const cname of targets) {
      try {
        const container = docker.getContainer(cname)
        const buf: Buffer = await container.logs({ stdout: true, stderr: true, timestamps: true, tail, follow: false })
        const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf || '')
        const lines = text.split(/\r?\n/).filter(Boolean)
        for (const line of lines) {
          const m = line.match(/^(\d{4}-\d{2}-\d{2}T[^\s]+)\s+(.*)$/)
          const ts = m ? m[1] : new Date().toISOString()
          const msg = m ? m[2] : line
          const level: AppLogEntry['level'] = /error|ERR|\[error\]/i.test(msg) ? 'error' : /warn|\[warn\]/i.test(msg) ? 'warn' : /debug|\[debug\]/i.test(msg) ? 'debug' : /info|\[info\]/i.test(msg) ? 'info' : 'log'
          let modName: string = ''
          let modType: ModuleType = 'feature'
          for (const mm of mods) {
            const arr = (mm.type === 'feature' ? servicesForModule(mm.name as ModuleName) : [mm.name])
            const names = arr.map(s => containerNameFor(s as ModuleName))
            if (names.includes(cname)) { modName = mm.name; modType = mm.type; break }
          }
          entries.push({ id: `${cname}-${ts}-${entries.length}`, timestamp: ts, service: cname, module: modName || 'unknown', moduleType: modType, level, message: msg })
        }
      } catch {
        // 忽略单容器日志失败
      }
    }
    entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    return { success: true, data: { entries } }
  } catch (e: any) {
    return { success: false, code: 'E_RUNTIME', message: String(e?.message ?? e) }
  }
}
