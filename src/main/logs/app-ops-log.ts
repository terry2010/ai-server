import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC } from '../../shared/ipc-contract'

export type OpsLevel = 'error'|'warn'|'info'|'debug'
export interface OpsEntry {
  id: string
  timestamp: string
  level: OpsLevel
  message: string
}

const MAX_MEM = 2000
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 3

let mem: OpsEntry[] = []
let logDir = ''
let logFile = ''

function ensurePaths() {
  if (!logDir) {
    const base = app.getPath('userData')
    logDir = path.join(base, 'logs')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    logFile = path.join(logDir, 'ops.log')
  }
}

function rotateIfNeeded() {
  try {
    if (fs.existsSync(logFile)) {
      const st = fs.statSync(logFile)
      if (st.size >= MAX_FILE_BYTES) {
        // Rotate: ops.log.2 -> .3, .1 -> .2, .log -> .1
        for (let i = MAX_FILES - 1; i >= 1; i--) {
          const src = path.join(logDir, `ops.log.${i}`)
          const dst = path.join(logDir, `ops.log.${i+1}`)
          if (fs.existsSync(dst)) fs.unlinkSync(dst)
          if (fs.existsSync(src)) fs.renameSync(src, dst)
        }
        const first = path.join(logDir, 'ops.log.1')
        if (fs.existsSync(first)) fs.unlinkSync(first)
        if (fs.existsSync(logFile)) fs.renameSync(logFile, first)
      }
    }
  } catch {}
}

function appendToFile(line: string) {
  try {
    ensurePaths()
    rotateIfNeeded()
    fs.appendFileSync(logFile, line + '\n', 'utf8')
  } catch {}
}

export function emitOpsLog(message: string, level: OpsLevel = 'info') {
  const ts = new Date().toISOString()
  const entry: OpsEntry = { id: `${ts}-${mem.length}`, timestamp: ts, level, message }
  mem.push(entry)
  if (mem.length > MAX_MEM) mem.splice(0, mem.length - MAX_MEM)
  appendToFile(JSON.stringify(entry))
  try {
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.ModuleLogEvent, { streamId: 'ops', level, chunk: message, timestamp: ts })
  } catch {}
}

export function getOpsLogs(tail = 500): OpsEntry[] {
  try {
    // 一律合并“文件历史 + 内存”后再裁剪，避免刷新页面后看不到历史日志
    ensurePaths()
    const files: string[] = []
    for (let i = MAX_FILES; i >= 1; i--) {
      const f = path.join(logDir, `ops.log.${i}`)
      if (fs.existsSync(f)) files.push(f)
    }
    if (fs.existsSync(logFile)) files.push(logFile)
    const lines: OpsEntry[] = []
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, 'utf8').trim()
        if (!content) continue
        for (const line of content.split(/\r?\n/)) {
          try { lines.push(JSON.parse(line)) } catch {}
        }
      } catch {}
    }
    const all = [...lines, ...mem]
    return all.slice(Math.max(0, all.length - tail))
  } catch {
    return mem.slice(Math.max(0, mem.length - tail))
  }
}
