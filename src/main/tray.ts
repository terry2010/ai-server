import { app, Menu, Tray, nativeImage, BrowserWindow } from 'electron'
import path from 'node:path'
import { getGlobalConfig } from './config/store'
import { listModules, startModule, stopModule } from './docker/modules'
import { getModuleStatus } from './docker/status'

let tray: Tray | null = null
let lastMenuJSON = ''
const statusCache: Record<string, 'running'|'stopped'|'error'|'parse_error'|undefined> = {}

// 加载状态点图标（从文件加载，支持高DPI）
function loadStatusIcon(color: 'green'|'gray'|'red'): Electron.NativeImage {
  try {
    const iconPath = path.resolve(process.cwd(), 'build', `dot-${color}.ico`)
    const img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      return img.resize({ width: 8, height: 8 })
    }
  } catch {}
  return nativeImage.createEmpty()
}

function getIcon() {
  try {
    // 使用打包资源 build/icon.ico，避免引用 doc 目录
    const iconPath = path.resolve(process.cwd(), 'build', 'icon.ico')
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
  const modsAll = listModules().filter(m => ['n8n','dify','oneapi','ragflow'].includes(m.name))
  // 读取顶部 tab 顺序
  const cfg = getGlobalConfig() as any
  const order: string[] = Array.isArray(cfg?.ui?.tabOrder) ? cfg.ui.tabOrder : ['n8n','dify','oneapi','ragflow']
  // 计算最新状态（若无缓存则获取一次），随后仅显示运行/异常，并按顺序排序
  const statusMap: Record<string, 'running'|'stopped'|'error'|'parse_error'> = {}
  for (const m of modsAll) {
    let s: any = statusCache[m.name]
    if (!s) {
      try { const resp: any = await getModuleStatus(m.name as any); s = resp?.data?.status || 'stopped' } catch {}
    }
    statusMap[m.name] = (s || 'stopped')
  }
  const sorted = modsAll
    .filter(m => ['running','error','parse_error'].includes(statusMap[m.name] as any))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
  const mods = sorted
  const items: any[] = []
  // banner（使用图标展示）
  const icon = getIcon()
  items.push({ label: 'AI-Server 管理平台', icon: icon.isEmpty() ? undefined : icon, enabled: false })
  items.push({ type: 'separator' })
  // 各模块二级菜单
  for (const m of mods) {
    let s: 'running'|'stopped'|'error'|'parse_error' = 'stopped'
    try {
      let cache = statusCache[m.name]
      if (!cache) {
        const resp: any = await getModuleStatus(m.name as any)
        cache = (resp?.data?.status || 'stopped')
      }
      s = (cache as any)
    } catch {}
    const pretty = (m.name === 'dify' ? 'Dify' : m.name === 'oneapi' ? 'OneAPI' : m.name === 'ragflow' ? 'RagFlow' : 'n8n')
    const ico = s === 'running' ? loadStatusIcon('green') : s === 'error' ? loadStatusIcon('red') : loadStatusIcon('gray')
    const running = s === 'running'
    const submenu: any[] = []
    submenu.push({ label: `${pretty} - 简介：${pretty} 服务`, enabled: false })
    submenu.push({ type: 'separator' })
    if (running) {
      submenu.push({ label: '停止', click: async () => {
        try {
          await stopModule(m.name as any)
          // 不做乐观置灰，等待真实状态事件/轮询刷新
          ensureTray().catch(()=>{})
        } catch {}
      } })
    } else {
      submenu.push({ label: '启动', click: async () => {
        try {
          await startModule(m.name as any)
          // 不做乐观置绿，等待真实状态事件/轮询刷新
          ensureTray().catch(()=>{})

          // 启动后自动在后台加载对应页面（如果从未打开过）
          try {
            const wins = BrowserWindow.getAllWindows()
            const { IPC } = require('../shared/ipc-contract')
            for (const w of wins) w.webContents.send(IPC.PreloadModulePage, { module: m.name })
          } catch {}
        } catch {}
      } })
    }
    // 仅当模块运行时才显示“打开模块”
    if (running) {
      submenu.push({ 
        label: '打开模块', 
        click: () => {
          try {
            showMainWindow()
            const wins = BrowserWindow.getAllWindows()
            const route = '/' + m.name.toLowerCase()
            for (const w of wins) w.webContents.send(require('../shared/ipc-contract').IPC.UIGoto, { path: route })
          } catch {}
        }
      })
    }
    items.push({ label: `${pretty}`, icon: ico, submenu })
  }
  items.push({ type: 'separator' })
  items.push({ label: '打开主界面', click: () => showMainWindow() })
  // 直接打开内置页面：guide / market
  items.push({ label: '在线教程', click: () => {
    try {
      showMainWindow()
      const wins = BrowserWindow.getAllWindows()
      for (const w of wins) w.webContents.send(require('../shared/ipc-contract').IPC.UIGoto, { path: '/guide' })
    } catch {}
  } })
  items.push({ label: 'AI市场', click: () => {
    try {
      showMainWindow()
      const wins = BrowserWindow.getAllWindows()
      for (const w of wins) w.webContents.send(require('../shared/ipc-contract').IPC.UIGoto, { path: '/market' })
    } catch {}
  } })
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
  const want = !!cfg.showTrayNative || !!cfg.showTray || !!cfg.showTrayCustom
  if (!want) {
    if (tray) { tray.destroy(); tray = null }
    return
  }
  if (!tray) {
    tray = new Tray(getIcon())
    tray.setToolTip('AI-Server 管理平台')
    // 点击托盘：统一打开主界面
    try {
      const { toggleCustomTray } = require('./tray-custom')
      tray.on('click', () => { showMainWindow() })
      // 双击托盘：同时打开主界面 + 自绘托盘弹窗
      tray.on('double-click', () => {
        showMainWindow()
        const enableCustom = !!(getGlobalConfig() as any)?.showTrayCustom
        if (enableCustom) toggleCustomTray()
      })
    } catch {}
  }
  const template = await buildContextTemplate()
  // 直接重建右键菜单，避免因为 JSON 序列化丢失函数/NativeImage 导致签名一致而不刷新
  tray.setContextMenu(Menu.buildFromTemplate(template))
  lastMenuJSON = ''
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
