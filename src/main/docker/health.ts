import { waitForTcp, waitForHttpOk, run } from './utils';

// 内部：根据 healthCheck 配置等待可用（从 index.ts 迁移）
export async function waitHealth(hc: any): Promise<boolean> {
  if (!hc) return true;
  const { type, target, retries, interval, timeout } = hc || {};
  if (type === 'tcp') {
    // target 形如 localhost:13306（支持 ${VAR:default} 占位）
    const tgt = resolveVarsInString(String(target))!;
    const [host, portStr] = tgt.split(':');
    const port = Number(portStr);
    return await waitForTcp(host, port, retries ?? 20, interval ?? 2000, timeout ?? 2000);
  }
  if (type === 'http') {
    const url = resolveVarsInString(String(target))!;
    return await waitForHttpOk(url, retries ?? 30, interval ?? 2000, timeout ?? 5000);
  }
  if (type === 'container_healthy') {
    const container = String(target);
    const tries = retries ?? 30; const gap = interval ?? 2000;
    for (let i = 0; i < tries; i++) {
      try {
        const { stdout } = await run(`docker inspect -f "{{.State.Health.Status}}" ${container}`);
        const s = stdout.trim();
        if (s === 'healthy') return true;
        if (s === 'unhealthy') return false;
      } catch {}
      await new Promise(r => setTimeout(r, gap));
    }
    return false;
  }
  return true;
}

// 与 template.ts 中保持一致：解析 ${VAR:default} 和 ${VAR:-default}
function resolveVarsInString(s?: string): string | undefined {
  if (!s) return s;
  // 将 ${VAR:-default} 或 ${VAR:default} 用默认值替换
  return s.replace(/\$\{[^:}]+:-?([^}]+)}/g, (_all, dflt) => String(dflt));
}
