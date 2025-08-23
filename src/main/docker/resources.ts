import { run } from './utils';

type LogEntry = { cmd: string; stdout?: string; stderr?: string };

async function execAndLog(cmd: string, logs?: LogEntry[], cwd?: string) {
  const r = await run(cmd, cwd);
  logs?.push({ cmd, stdout: r.stdout, stderr: r.stderr });
  return r;
}

// 首次启动使用：创建网络与所有命名卷（与 infra 保持一致）
export async function ensureExternalResources(logs?: LogEntry[]): Promise<void> {
  // 网络
  try {
    const { stdout } = await run('docker network ls --format "{{.Name}}"');
    const names = new Set(stdout.split(/\r?\n/).filter(Boolean));
    if (!names.has('ai-server-net')) {
      if (logs) await execAndLog('docker network create ai-server-net', logs);
      else await run('docker network create ai-server-net');
    }
  } catch {}
  // 卷
  const volumes = [
    'ai-server-mysql-data',
    'ai-server-redis-data',
    'ai-server-minio-data',
    'ai-server-es-data',
    'ai-server-logs',
  ];
  try {
    const { stdout } = await run('docker volume ls --format "{{.Name}}"');
    const vset = new Set(stdout.split(/\r?\n/).filter(Boolean));
    for (const v of volumes) {
      if (!vset.has(v)) {
        if (logs) await execAndLog(`docker volume create ${v}`, logs);
        else await run(`docker volume create ${v}`);
      }
    }
  } catch {}
}

// 常规启动使用：确保外部基础资源存在（与首次启动相同，目前保持一致）
export async function ensureExternalInfraResources(logs?: LogEntry[]): Promise<void> {
  return ensureExternalResources(logs);
}
