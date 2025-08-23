import { ipcMain, app } from 'electron';
import { IPC, type IpcResponse } from '../../shared/ipc-contract';
import { commandExists, dockerRunning } from '../docker/utils';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

ipcMain.handle(IPC.DockerCheck, async () => {
  const installed = await commandExists('docker');
  const running = installed ? await dockerRunning() : false;
  return { success: true, data: { installed, running } };
});

ipcMain.handle(IPC.DockerStart, async (): Promise<IpcResponse> => {
  // 仅 Windows 尝试：常见安装路径启动 Docker Desktop
  try {
    if (process.platform === 'win32') {
      const candidate = 'C://Program Files//Docker//Docker//Docker Desktop.exe';
      if (existsSync(candidate)) {
        spawn(candidate, { detached: true, stdio: 'ignore' }).unref();
        return { success: true, message: '已尝试启动 Docker Desktop' };
      }
    }
    // 其他平台或未找到：提示手动启动
    return { success: false, message: '请手动启动 Docker Desktop 后重试' };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
});
