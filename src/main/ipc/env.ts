import { ipcMain } from 'electron';
import { IPC, type EnvDiagnoseResult } from '../../shared/ipc-contract';
import { commandExists, dockerRunning, dockerVersion, pickComposeCommand } from '../docker/utils';

async function diagnoseEnv(): Promise<EnvDiagnoseResult> {
  const installed = await commandExists('docker');
  const running = installed ? await dockerRunning() : false;
  const compose = installed ? await pickComposeCommand() : null;
  const version = installed ? await dockerVersion() : undefined;
  const issues: string[] = [];
  if (!installed) issues.push('未检测到 docker 命令，请安装 Docker Desktop 或 Docker Engine');
  else if (!running) issues.push('Docker 已安装但未在运行，请启动 Docker Desktop 或 Docker 服务');
  return { docker: { installed, running, compose, version }, issues };
}

ipcMain.handle(IPC.EnvDiagnose, async () => ({ success: true, data: await diagnoseEnv() }));
