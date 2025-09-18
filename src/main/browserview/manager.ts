import { BrowserView, BrowserWindow } from 'electron'
import { loadRegistry } from '../config/store'
import { getModuleStatus } from '../docker/status'

export type ModuleKey = 'n8n' | 'dify' | 'oneapi' | 'ragflow'

interface Insets { top: number; left: number; right: number; bottom: number }

class BrowserViewManager {
  private views: Map<ModuleKey, BrowserView> = new Map()
  // 默认不预留左侧边距，由渲染端上报实际 top（包含顶部 tabs 与工具栏高度）
  private insets: Insets = { top: 60, left: 0, right: 0, bottom: 0 }

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

    // 解析模块 URL
    try {
      const st = await getModuleStatus(name as any)
      const url = this.extractFirstHttpUrl(st.data?.ports || {})
      if (url) await v.webContents.loadURL(url)
    } catch {}
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
}

export const BVManager = new BrowserViewManager()
