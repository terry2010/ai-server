import { app, Menu, Tray, nativeImage, BrowserWindow } from 'electron'
import path from 'node:path'
import { getGlobalConfig } from './config/store'
import { listModules } from './docker/modules'
import { getModuleStatus } from './docker/status'

let tray: Tray | null = null
let lastMenuJSON = ''
const statusCache: Record<string, 'running'|'stopped'|'error'|'parse_error'|undefined> = {}

function getIcon() {
  try {
    const iconPath = path.resolve(process.cwd(), 'src/mainui/assets/favicon.png')
    let img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      // 缩放到 16x16，避免托盘菜单过大
      img = img.resize({ width: 16, height: 16, quality: 'best' })
      return img
    }
  } catch {}
  return nativeImage.createEmpty()
}

function getMainWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows()
  return wins[0] || null
}

function showMainWindow() {
  const win = getMainWindow()
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  } else {
    // create later by app
  }
}

async function buildContextTemplate() {
  const mods = listModules().filter(m => ['n8n','dify','oneapi','ragflow'].includes(m.name))
  const items: any[] = []
  // banner（使用图标展示）
  const icon = getIcon()
  items.push({ label: 'AI-Server 管理平台', icon: icon.isEmpty() ? undefined : icon, enabled: false })
  items.push({ type: 'separator' })
  // 模块状态
  for (const m of mods) {
    try {
      // 优先使用缓存的事件驱动状态，若无再读一次
      let s = statusCache[m.name]
      if (!s) {
        const resp: any = await getModuleStatus(m.name as any)
        s = (resp?.data?.status || 'stopped')
      }
      const dot = s === 'running' ? '🟢' : s === 'error' ? '🔴' : '⚪'
      const name = (m.name === 'dify' ? 'Dify' : m.name === 'oneapi' ? 'OneAPI' : m.name === 'ragflow' ? 'RagFlow' : 'n8n')
      items.push({ label: `${name} ${dot} ${s || 'stopped'}`, enabled: false })
    } catch {
      items.push({ label: `${m.name} ⚪ stopped`, enabled: false })
    }
  }
  items.push({ type: 'separator' })
  items.push({ label: '打开主界面', click: () => showMainWindow() })
  items.push({ label: '系统设置', click: () => {
    try {
      showMainWindow()
      const wins = BrowserWindow.getAllWindows()
      for (const w of wins) w.webContents.send(require('../shared/ipc-contract').IPC.UIGoto, { path: '/settings' })
    } catch {}
  } })
  items.push({ label: '登录 / 注册 / 用户名', click: () => showMainWindow() })
  items.push({ type: 'separator' })
  items.push({ label: '退出', click: () => app.quit() })
  return items
}

export async function ensureTray() {
  const cfg = getGlobalConfig() as any
  const want = !!cfg.showTray
  if (!want) {
    if (tray) { tray.destroy(); tray = null }
    return
  }
  if (!tray) {
    tray = new Tray(getIcon())
    tray.setToolTip('AI-Server 管理平台')
  }
  const template = await buildContextTemplate()
  const json = JSON.stringify(template)
  if (json !== lastMenuJSON) {
    tray.setContextMenu(Menu.buildFromTemplate(template))
    lastMenuJSON = json
  }
}

// 周期性刷新状态（轻量轮询）
let refreshTimer: NodeJS.Timeout | null = null
function startAutoRefresh() {
  if (refreshTimer) return
  refreshTimer = setInterval(() => { ensureTray().catch(()=>{}) }, 5000)
}
function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}

// 启动时尝试启动自动刷新
startAutoRefresh()

export function destroyTray() { if (tray) { tray.destroy(); tray = null } }

// 供主进程其它模块更新状态缓存（事件驱动）
export function updateModuleStatusCache(name: string, status?: 'running'|'stopped'|'error'|'parse_error') {
  statusCache[name] = status
  // 轻量刷新菜单
  ensureTray().catch(()=>{})
}
