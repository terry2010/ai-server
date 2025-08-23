import { ipcMain } from 'electron';
import { IPC, type EnvDiagnoseResult } from '../../shared/ipc-contract';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function isCommandAvailable(cmd: string) {
  try {
    await execAsync(`${cmd} --version`, { timeout: 5000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function getDockerVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync('docker --version', { timeout: 5000, windowsHide: true });
    return stdout?.trim();
  } catch {
    return undefined;
  }
}

async function isDockerRunning(): Promise<boolean> {
  try {
    // 以 docker info 判断 Engine 是否可用
    await execAsync('docker info', { timeout: 8000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function detectCompose(): Promise<'docker compose' | 'docker-compose' | null> {
  // 优先现代子命令
  if (await isCommandAvailable('docker compose')) return 'docker compose' as const;
  if (await isCommandAvailable('docker-compose')) return 'docker-compose' as const;
  return null;
}

async function diagnoseEnv(): Promise<EnvDiagnoseResult> {
  const installed = await isCommandAvailable('docker');
  const running = installed ? await isDockerRunning() : false;
  const compose = installed ? await detectCompose() : null;
  const version = installed ? await getDockerVersion() : undefined;
  const issues: string[] = [];
  if (!installed) issues.push('未检测到 docker 命令，请安装 Docker Desktop 或 Docker Engine');
  else if (!running) issues.push('Docker 已安装但未在运行，请启动 Docker Desktop 或 Docker 服务');
  return { docker: { installed, running, compose, version }, issues };
}

// 环境诊断：真实实现
ipcMain.handle(IPC.EnvDiagnose, async () => ({ success: true, data: await diagnoseEnv() }));

// 模块列表占位实现
ipcMain.handle(IPC.ModulesList, async () => ({ success: true, data: { items: [ { name: 'mysql', type: 'basic' }, { name: 'redis', type: 'basic' }, { name: 'dify', type: 'feature' } ] } }));

// 启停占位实现
ipcMain.handle(IPC.ModuleStart, async (_e, p) => ({ success: true, message: `start ${p?.name} (stub)` }));
ipcMain.handle(IPC.ModuleStop, async (_e, p) => ({ success: true, message: `stop ${p?.name} (stub)` }));
ipcMain.handle(IPC.ModuleStatus, async (_e, p) => ({ success: true, data: { running: false, status: 'stopped', ports: {} } }));
ipcMain.handle(IPC.ModuleClear, async (_e, p) => ({ success: true, message: `clear ${p?.name} (stub)` }));

// 配置读写占位
ipcMain.handle(IPC.ConfigGet, async () => ({ success: true, data: {} }));
ipcMain.handle(IPC.ConfigSet, async (_e, p) => ({ success: true, data: p }));
