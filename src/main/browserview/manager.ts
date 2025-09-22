import { BrowserView, BrowserWindow } from 'electron'
import { loadRegistry } from '../config/store'
import { getModuleStatus } from '../docker/status'
import { emitOpsLog } from '../logs/app-ops-log'

export type ModuleKey = 'n8n' | 'dify' | 'oneapi' | 'ragflow'

interface Insets { top: number; left: number; right: number; bottom: number }

class BrowserViewManager {
  private views: Map<ModuleKey, BrowserView> = new Map()
  // 默认不预留左侧边距，由渲染端上报实际 top（包含顶部 tabs 与工具栏高度）
  private insets: Insets = { top: 60, left: 0, right: 0, bottom: 0 }
  private lastOk: Map<ModuleKey, boolean> = new Map()

  setInsets(insets: Partial<Insets>) {
    this.insets = { ...this.insets, ...insets }
    this.updateBoundsForActive()
  }

  private getActiveWindow(): BrowserWindow | null {
    const wins = BrowserWindow.getAllWindows()
    return wins.find(w => !w.isDestroyed()) || null
  }

  private async ensureView(name: ModuleKey): Promise<BrowserView> {
    let v = this.views.get(name)
    if (v && !v.webContents.isDestroyed()) return v
    v = new BrowserView({ webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } })
    this.views.set(name, v)
    return v
  }

  private extractFirstHttpUrl(ports: Record<string, string>): string {
    for (const key of Object.keys(ports)) {
      const s = ports[key] || ''
      const m = s.match(/(127\.0\.0\.1|0\.0\.0\.0|\[?:::\]?|\*)?:(\d+)->(\d+\/tcp)/)
      if (m && m[2]) return `http://localhost:${m[2]}`
    }
    return ''
  }

  private setViewBounds(win: BrowserWindow, v: BrowserView) {
    const bounds = win.getContentBounds()
    const { top, left, right, bottom } = this.insets
    const x = left
    const y = top
    const width = Math.max(0, bounds.width - left - right)
    const height = Math.max(0, bounds.height - top - bottom)
    v.setBounds({ x, y, width, height })
  }

  private updateBoundsForActive() {
    const win = this.getActiveWindow()
    if (!win) return
    const v = win.getBrowserView()
    if (v) this.setViewBounds(win, v)
  }
  public resizeActive() { this.updateBoundsForActive() }

  async show(name: ModuleKey) {
    const win = this.getActiveWindow()
    if (!win) return { success: false, message: 'no window' }
    const v = await this.ensureView(name)
    // 确保就绪（如需则带重试加载）
    try { await this.ensureReady(name) } catch {}
    win.setBrowserView(v)
    this.setViewBounds(win, v)
    return { success: true }
  }

  hideAll() {
    const win = this.getActiveWindow()
    if (!win) return { success: false, message: 'no window' }
    try { win.setBrowserView(null as any) } catch {}
    return { success: true }
  }

  async refresh(name: ModuleKey) {
    const v = this.views.get(name)
    if (v && !v.webContents.isDestroyed()) {
      try { await v.webContents.reload() } catch {}
      return { success: true }
    }
    return this.show(name)
  }

  release(name?: ModuleKey) {
    const releaseOne = (k: ModuleKey) => {
      const v = this.views.get(k)
      if (v) {
        try { if (!v.webContents.isDestroyed()) (v.webContents as any)?.destroy?.() } catch {}
      }
      this.views.delete(k)
    }
    if (name) releaseOne(name)
    else (Array.from(this.views.keys()) as ModuleKey[]).forEach(releaseOne)
    return { success: true }
  }

  private getView(name: ModuleKey): BrowserView | undefined { return this.views.get(name) }
  goBack(name: ModuleKey) {
    const v = this.getView(name)
    try { if (v && v.webContents.canGoBack()) v.webContents.goBack() } catch {}
    return { success: true }
  }
  goForward(name: ModuleKey) {
    const v = this.getView(name)
    try { if (v && v.webContents.canGoForward()) v.webContents.goForward() } catch {}
    return { success: true }
  }

  async loadUrl(name: ModuleKey, url: string) {
    const v = await this.ensureView(name)
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
    const maxRetry = 10
    let attempt = 0
    let lastErr: any = null
    if (!url) return { success: false, message: 'empty url' }
    while (attempt < maxRetry) {
      try {
        // 先探测 HTTP 可用性（含重定向处理）
        const status = await this.probeUrlStatus(url)
        if (status === 200) {
          await v.webContents.loadURL(url)
          this.lastOk.set(name, true)
          try { emitOpsLog(`[bv] loadUrl success: ${name} -> ${url}`) } catch {}
          return { success: true }
        }
        // 3xx：等待 3 秒再试；其它非 200：等待 2 秒
        await sleep(status && status >= 300 && status < 400 ? 3000 : 2000)
      } catch (e) {
        lastErr = e
        await sleep(2000)
      }
      attempt++
    }
    this.lastOk.set(name, false)
    try { emitOpsLog(`[bv] loadUrl fail: ${name} -> ${url} after ${maxRetry} retries: ${String(lastErr || 'load failed')}`, 'warn') } catch {}
    return { success: false, message: String(lastErr || 'load failed') }
  }

  async loadHome(name: ModuleKey) {
    try {
      let url = ''
      if (name === 'dify') {
        try {
          const stWeb = await getModuleStatus('dify-web' as any)
          url = this.extractFirstHttpUrl((stWeb as any)?.data?.ports || (stWeb as any)?.ports || {})
        } catch {}
      }
      if (!url) {
        const st = await getModuleStatus(name as any)
        url = this.extractFirstHttpUrl((st as any)?.data?.ports || (st as any)?.ports || {})
      }
      const res = await this.loadUrl(name, url)
      try { emitOpsLog(`[bv] loadHome ${name} -> ${url} => ${res.success?'OK':'FAIL'}`) } catch {}
      return res
    } catch {
      return { success: false }
    }
  }

  async ensureReady(name: ModuleKey) {
    const v = this.views.get(name)
    if (!v || v.webContents.isDestroyed()) {
      return this.loadHome(name)
    }
    const current = v.webContents.getURL() || ''
    if (!current) return this.loadHome(name)
    try {
      const status = await this.probeUrlStatus(current)
      if (status !== 200) return this.loadHome(name)
      this.lastOk.set(name, true)
      return { success: true }
    } catch {
      return this.loadHome(name)
    }
  }

  private async probeUrlStatus(url: string): Promise<number | null> {
    try {
      const res = await fetch(url, { redirect: 'follow' as any })
      return res.status || null
    } catch {
      return null
    }
  }
}

export const BVManager = new BrowserViewManager()
