import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import { listModules } from './docker/modules'
import { getModuleStatus } from './docker/status'

let win: BrowserWindow | null = null

function dot(color: 'green'|'gray'|'red') {
  const css = `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${color==='green'?'#34c759':color==='red'?'#ff3b30':'#c7c7cc'};vertical-align:middle;`
  return `<span style="${css}"></span>`
}

async function renderHtml(): Promise<string> {
  const mods = listModules().filter(m => ['n8n','dify','oneapi','ragflow'].includes(m.name))
  const rows: string[] = []
  for (const m of mods) {
    try {
      const resp: any = await getModuleStatus(m.name as any)
      const st = (resp?.data?.status || 'stopped') as string
      const color = st === 'running' ? 'green' : st === 'error' ? 'red' : 'gray'
      const name = (m.name === 'dify' ? 'Dify' : m.name === 'oneapi' ? 'OneAPI' : m.name === 'ragflow' ? 'RagFlow' : 'n8n')
      rows.push(`<div class="item">${dot(color as any)}<span class="name">${name}</span><span class="st">${st}</span></div>`)
    } catch {
      rows.push(`<div class="item">${dot('gray')}<span class="name">${m.name}</span><span class="st">stopped</span></div>`)
    }
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    html,body{margin:0;padding:0;background:#202124;color:#e8eaed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'Noto Sans',sans-serif;font-size:12px}
    .root{padding:8px 10px;min-width:200px}
    .title{font-size:12px;font-weight:600;margin-bottom:6px;opacity:.9}
    .item{display:flex;align-items:center;gap:6px;line-height:20px}
    .name{flex:1}
    .st{opacity:.8}
  </style>
  </head><body><div class="root">
    <div class="title">AI-Server 快捷托盘</div>
    ${rows.join('')}
  </div></body></html>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

async function loadContentToWin(w: BrowserWindow) {
  const url = await renderHtml()
  try {
    await w.loadURL(url, { baseURLForDataURL: 'file://' + process.cwd().replace(/\\/g,'/') + '/' })
  } catch {}
  try {
    const script = `
      try {
        const root = document.querySelector('body');
        if (root) {
          root.addEventListener('mouseleave', () => { window.close(); });
        }
      } catch {}
    `
    await w.webContents.executeJavaScript(script).catch(()=>{})
  } catch {}
}

export async function toggleCustomTray() {
  if (win && !win.isDestroyed()) {
    win.close(); win = null; return
  }
  const display = screen.getPrimaryDisplay()
  const bounds = display.workArea
  win = new BrowserWindow({
    width: 240,
    height: 160,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  })
  // 放到右下角，贴近底部（0px 边距）
  const winW = 240
  const winH = 160
  const x = Math.max(0, bounds.x + bounds.width - (winW + 20))
  const y = Math.max(0, bounds.y + bounds.height - winH)
  win.setPosition(x, y)
  try { win.setIcon(path.resolve(process.cwd(), 'build', 'icon.ico')) } catch {}
  await loadContentToWin(win)
  win.once('ready-to-show', () => win?.show())
  win.on('blur', () => { try { win?.close() } catch {} })
}

export async function refreshCustomTray() {
  if (win && !win.isDestroyed() && win.isVisible()) {
    await loadContentToWin(win)
  }
}
