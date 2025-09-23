import { ipcMain } from 'electron';
import { IPC, type IpcResponse } from '../../shared/ipc-contract';
import { dockerRunning } from '../docker/utils';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

function getDocker(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Docker = require('dockerode');
    const isWin = process.platform === 'win32';
    return isWin ? new Docker({ socketPath: '//./pipe/docker_engine' }) : new Docker({ socketPath: '/var/run/docker.sock' });
  } catch {
    return null;
  }
}

const VOLUME_NAMES = [
  'ai-server-mysql-data',
  'ai-server-redis-data',
  'ai-server-minio-data',
  'ai-server-es-data',
  'ai-server-postgres-data',
  'ai-server-logs',
];
// 额外的卷名前缀（尽量覆盖我们创建的卷，避免误删用户其他卷）
const VOLUME_PREFIXES = [
  'ai-server-', 'aiserver-',
  // 常见服务前缀（仅在 dangling 时删除，降低风险）
  'n8n-', 'dify-', 'oneapi-', 'ragflow-', 'qdrant-', 'es-', 'elasticsearch-', 'mysql-', 'redis-', 'minio-', 'postgres-'
];

async function removeRelatedVolumes(docker: any) {
  // 删除已知命名卷
  try {
    const vinfo = await docker.listVolumes();
    const vols: any[] = (vinfo?.Volumes || []);
    for (const v of vols) {
      const name = String(v?.Name || '');
      if (VOLUME_NAMES.includes(name)) {
        try { await docker.getVolume(name).remove({ force: true }); } catch {}
      }
    }
  } catch {}

  // 删除 dangling 卷（未被任何容器引用的卷）
  try {
    const vinfoDangling = await docker.listVolumes({ filters: { dangling: { true: true } } });
    const volsDangling: any[] = (vinfoDangling?.Volumes || []);
    for (const v of volsDangling) {
      const name = String(v?.Name || '');
      // 优先删除我们前缀的卷；其它 dangling 也可删除（一般为匿名卷）
      if (VOLUME_PREFIXES.some(p => name.startsWith(p)) || true) {
        try { await docker.getVolume(name).remove({ force: true }); } catch {}
      }
    }
  } catch {}
}
const NETWORK_NAME = 'ai-server-net';
const CONTAINER_KEYWORDS = ['ai-server', 'n8n', 'dify', 'oneapi', 'ragflow', 'postgres', 'mysql', 'redis', 'minio', 'qdrant', 'es', 'elasticsearch'];

function isRelatedContainer(info: any): boolean {
  const name = (info?.Names?.[0] || info?.Name || '').toLowerCase();
  if (name && CONTAINER_KEYWORDS.some(k => name.includes(k))) return true;
  // 检查网络
  const networks = info?.NetworkSettings?.Networks || {};
  if (Object.prototype.hasOwnProperty.call(networks, NETWORK_NAME)) return true;
  return false;
}

ipcMain.handle(IPC.DockerCheck, async () => {
  // 使用 dockerode 尝试连接来判断是否“可用/运行”
  const running = await dockerRunning();
  // 将“installed”语义等同于“可连接”，避免依赖 CLI
  const installed = running;
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

// 停止所有相关容器
ipcMain.handle(IPC.DockerStopAll, async (): Promise<IpcResponse> => {
  const docker = getDocker();
  if (!docker) return { success: false, message: 'Docker 不可用' };
  try {
    const list = await docker.listContainers({ all: true });
    for (const c of list) {
      if (!isRelatedContainer(c)) continue;
      if (c.State === 'running') {
        try { await docker.getContainer(c.Id).stop({ t: 10 }); } catch {}
      }
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
});

// 删除所有相关容器
ipcMain.handle(IPC.DockerRemoveAllContainers, async (): Promise<IpcResponse> => {
  const docker = getDocker();
  if (!docker) return { success: false, message: 'Docker 不可用' };
  try {
    const list = await docker.listContainers({ all: true });
    for (const c of list) {
      if (!isRelatedContainer(c)) continue;
      try { await docker.getContainer(c.Id).remove({ force: true }); } catch {}
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
});

// 删除所有数据卷
ipcMain.handle(IPC.DockerRemoveAllVolumes, async (): Promise<IpcResponse> => {
  const docker = getDocker();
  if (!docker) return { success: false, message: 'Docker 不可用' };
  try {
    await removeRelatedVolumes(docker);
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
});

// 删除自定义网络
ipcMain.handle(IPC.DockerRemoveCustomNetwork, async (): Promise<IpcResponse> => {
  const docker = getDocker();
  if (!docker) return { success: false, message: 'Docker 不可用' };
  try {
    const nets = await docker.listNetworks();
    const target = nets.find((n: any) => n?.Name === NETWORK_NAME);
    if (target) {
      try { await docker.getNetwork(target.Id).remove(); } catch {}
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
});

// 一键清理
ipcMain.handle(IPC.DockerNukeAll, async (): Promise<IpcResponse> => {
  const docker = getDocker();
  if (!docker) return { success: false, message: 'Docker 不可用' };
  try {
    // 停止容器
    await (async () => {
      const list = await docker.listContainers({ all: true });
      for (const c of list) {
        if (!isRelatedContainer(c)) continue;
        if (c.State === 'running') { try { await docker.getContainer(c.Id).stop({ t: 10 }); } catch {} }
      }
    })();
    // 删除容器
    await (async () => {
      const list = await docker.listContainers({ all: true });
      for (const c of list) { if (!isRelatedContainer(c)) continue; try { await docker.getContainer(c.Id).remove({ force: true }); } catch {} }
    })();
    // 删除卷（包含已知命名卷 + dangling 卷）
    await removeRelatedVolumes(docker);
    // 删除网络
    await (async () => {
      const nets = await docker.listNetworks();
      const target = nets.find((n: any) => n?.Name === NETWORK_NAME);
      if (target) { try { await docker.getNetwork(target.Id).remove(); } catch {} }
    })();
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
});
