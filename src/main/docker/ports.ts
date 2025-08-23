import { isTcpOpen } from './utils';
import { resolveDefaultVar } from './template';

export interface PortSpec { container: number; host: string; bind?: string }

export type CheckResult =
  | { ok: true }
  | { ok: false; bind: string; hostPort: number; modName: string };

// 校验给定模块列表（含依赖与自身）的宿主机端口是否被占用。
// runningNames: 已在运行的容器名集合；若依赖容器已运行可跳过其端口检查。
export async function checkPortsConflict(
  modules: Array<any>,
  checkList: string[],
  runningNames: Set<string>,
  containerNameFor: (name: string) => string,
): Promise<CheckResult> {
  for (const modName of checkList) {
    const item = modules.find(m => m.name === modName);
    if (!item) continue;
    const cname = containerNameFor(modName);
    if (runningNames.has(cname) && modName !== checkList[checkList.length - 1]) continue;
    const ports = (item as any).ports as PortSpec[] | undefined;
    if (!ports || ports.length === 0) continue;
    for (const p of ports) {
      const bind = resolveDefaultVar(p.bind ?? '${BIND_ADDRESS:127.0.0.1}', '127.0.0.1') ?? '127.0.0.1';
      const hostPortStr = resolveDefaultVar(String(p.host ?? ''), undefined);
      const hostPort = hostPortStr ? Number(hostPortStr) : undefined;
      if (!hostPort) continue;
      const occupied = await isTcpOpen(bind, hostPort, 800);
      if (occupied) {
        return { ok: false, bind, hostPort, modName };
      }
    }
  }
  return { ok: true };
}
