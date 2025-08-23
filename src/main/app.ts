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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = 'http://localhost:5174';
  if (process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development') {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.resolve(process.cwd(), 'dist/renderer/index.html'));
  }
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
  } catch (e) {
    console.error('[main] failed to load ipc handlers:', e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC 加载已移动至 app.whenReady() 内
