// 使用 dockerode 创建网络与卷
type LogEntry = { cmd: string; stdout?: string; stderr?: string };

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

// 首次启动使用：创建网络与所有命名卷（与 infra 保持一致）
export async function ensureExternalResources(_logs?: LogEntry[]): Promise<void> {
  const docker = getDocker();
  if (!docker) return;
  // 网络 ai-server-net
  try {
    const nets = await docker.listNetworks();
    const exists = Array.isArray(nets) && nets.some((n: any) => n?.Name === 'ai-server-net');
    if (!exists) {
      await docker.createNetwork({ Name: 'ai-server-net', Driver: 'bridge' });
    }
  } catch {}

  // 卷集合
  const volumes = [
    'ai-server-mysql-data',
    'ai-server-redis-data',
    'ai-server-minio-data',
    'ai-server-es-data',
    'ai-server-postgres-data',
    'ai-server-logs',
  ];
  try {
    const vinfo = await docker.listVolumes();
    const existSet = new Set<string>((vinfo?.Volumes || []).map((v: any) => String(v?.Name || '')));
    for (const name of volumes) {
      if (!existSet.has(name)) {
        await docker.createVolume({ Name: name });
      }
    }
  } catch {}
}

// 常规启动使用：确保外部基础资源存在（与首次启动相同，目前保持一致）
export async function ensureExternalInfraResources(logs?: LogEntry[]): Promise<void> {
  return ensureExternalResources(logs);
}
