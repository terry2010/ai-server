// 运行时自检：确保在 Electron 主进程中运行
if (!process.versions || !process.versions.electron) {
  console.error('[main] Not running under Electron runtime, abort. process.versions=', process.versions);
  process.exit(1);
}

// 记录关键版本信息
console.log('[main] versions:', JSON.stringify(process.versions));

// 使用 CommonJS 引入，避免 bundler 的 ESM/CJS 互操作导致的空对象问题
// eslint-disable-next-line @typescript-eslint/no-var-requires
const electronModule = require('electron');
console.log('[main] electron keys =', Object.keys(electronModule));
const app = electronModule.app;
const BrowserWindow = electronModule.BrowserWindow;
// 重置注册表缓存，确保新模块能被加载
import { resetRegistryCache } from './config/store';
resetRegistryCache();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // 无边框窗口
    icon: require('node:path').resolve(process.cwd(), 'build', 'icon.ico'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  const devServerUrl = 'http://localhost:5174';
  if (process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development') {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.resolve(process.cwd(), 'dist/renderer/index.html'));
  }

  // 在无边框窗口下，默认菜单被移除，Ctrl+Shift+I 可能失效，这里手动支持
  win.webContents.on('before-input-event', (event: any, input: any) => {
    const isDev = process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development'
    if (!isDev) return
    const mod = process.platform === 'darwin' ? input.meta : input.control
    if (mod && input.shift && (input.key?.toLowerCase?.() === 'i')) {
      if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools()
      else win.webContents.openDevTools({ mode: 'detach' })
      event.preventDefault()
    }
  })

  // 广播窗口状态变更（最大化/还原）
  const sendState = () => {
    try {
      const electronModule = require('electron')
      const state = { isMaximized: win.isMaximized(), isFullScreen: win.isFullScreen() }
      const wins = electronModule.BrowserWindow.getAllWindows()
      for (const w of wins) w.webContents.send(require('./../shared/ipc-contract').IPC.WindowStateEvent, state)
    } catch {}
  }
  win.on('maximize', sendState)
  win.on('unmaximize', sendState)
  try {
    const { BVManager } = require('./browserview/manager')
    const resizeBV = () => { try { BVManager.resizeActive() } catch {} }
    win.on('resize', resizeBV)
    win.on('enter-full-screen', resizeBV)
    win.on('leave-full-screen', resizeBV)
    win.on('focus', resizeBV)
  } catch {}
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  // 尝试在 Electron 已就绪后加载 IPC 处理器，并打印调试信息
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electronModule = require('electron');
    console.log('[main] typeof require("electron") =', typeof electronModule);
    console.log('[main] has ipcMain =', !!electronModule.ipcMain);
    require('./ipc/env');
    require('./ipc/docker');
    require('./ipc/modules');
    require('./ipc/config');
    require('./ipc/window');
    try {
      const ev = require('./docker/events');
      ev.tryStart?.();
      console.log('[main] docker events watcher started');
    } catch (e) {
      console.warn('[main] start docker events watcher failed', e);
    }
    try { require('./ipc/browserview') } catch (e) { console.warn('[main] load browserview ipc failed', e) }
    try { require('./tray').ensureTray?.() } catch (e) { console.warn('[main] ensureTray failed', e) }

    // 应用启动后：若有模块已在运行，则后台预加载对应 BrowserView（不抢焦点）
    ;(async () => {
      try {
        const { listModules } = require('./docker/modules')
        const { getModuleStatus } = require('./docker/status')
        const { BVManager } = require('./browserview/manager')
        const mods: Array<{ name: string }> = listModules()
        const webModules = new Set(['n8n','dify','oneapi','ragflow'])
        for (const m of mods) {
          if (!webModules.has(String(m.name).toLowerCase())) continue
          try {
            const st = await getModuleStatus(m.name)
            const status = (st?.data?.status || st?.status)
            if (status === 'running') {
              await BVManager.loadHome(m.name)
            }
          } catch {}
        }
      } catch (e) { console.warn('[main] preload running modules failed', e) }
    })()
  } catch (e) {
    console.error('[main] failed to load ipc handlers:', e);
  }
});

app.on('window-all-closed', () => {
  try { require('./docker/events')?.stopWatch?.() } catch {}
  if (process.platform !== 'darwin') app.quit();
});

// IPC 加载已移动至 app.whenReady() 内
