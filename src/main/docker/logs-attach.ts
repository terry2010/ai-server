import type { WebContents } from 'electron'
import { IPC } from '../../shared/ipc-contract'
import { servicesForModule, containerNameFor } from './naming'

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

function send(sender: WebContents, streamId: string, event: 'stdout'|'stderr'|'info'|'error', chunk: string) {
  try { sender.send(IPC.ModuleLogEvent, { streamId, event, chunk }) } catch {}
}

const streams = new Map<string, any>() // key: container name

export async function attachModuleContainers(name: string, sender: WebContents, streamId: string) {
  const docker = getDocker(); if (!docker) return
  const services = servicesForModule(name)
  for (const svc of services) {
    const cname = containerNameFor(svc)
    if (streams.has(cname)) continue
    try {
      const container = docker.getContainer(cname)
      const stream: any = await container.attach({ stream: true, stdout: true, stderr: true, logs: false })
      streams.set(cname, stream)
      stream.on('data', (buf: Buffer) => {
        const text = buf.toString('utf8')
        send(sender, streamId, 'stdout', `[${cname}] ${text}`)
      })
      stream.on('error', (e: any) => {
        send(sender, streamId, 'error', `[${cname}] attach error: ${String(e?.message || e)}`)
      })
      stream.on('end', () => {
        streams.delete(cname)
        send(sender, streamId, 'info', `[${cname}] log stream ended`)
      })
    } catch (e: any) {
      send(sender, streamId, 'error', `[${cname}] attach failed: ${String(e?.message || e)}`)
    }
  }
}

export async function detachModuleContainers(name: string) {
  const services = servicesForModule(name)
  for (const svc of services) {
    const cname = containerNameFor(svc)
    const s = streams.get(cname)
    if (!s) continue
    try { s.destroy?.() } catch {}
    streams.delete(cname)
  }
}

export function detachAll() {
  for (const s of streams.values()) {
    try { s.destroy?.() } catch {}
  }
  streams.clear()
}
