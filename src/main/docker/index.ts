import type { ModuleName, ModuleStatus, IpcResponse, ModuleType } from '../../shared/ipc-contract';
import { dockerRunning, pickComposeCommand, run } from './utils';

export interface ModuleItem { name: string; type: ModuleType }

// TODO: 后续从配置或清单加载
const MODULES: ModuleItem[] = [
  { name: 'mysql', type: 'basic' },
  { name: 'redis', type: 'basic' },
  { name: 'dify', type: 'feature' },
];

export function listModules() {
  return MODULES;
}

export async function startModule(name: ModuleName): Promise<IpcResponse> {
  // 占位：仅检查 docker 是否运行与 compose 可用
  const running = await dockerRunning();
  const compose = await pickComposeCommand();
  if (!running) return { success: false, message: 'Docker 未运行' };
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  // 真实实现：根据模板生成 compose 文件并执行 `${compose} up -d <service>`
  // await run(`${compose} up -d ${name}`, cwd)
  return { success: true, message: `start ${name} (stub)` };
}

export async function stopModule(name: ModuleName): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  // 真实实现：`${compose} stop ${name}` 或 `down`
  return { success: true, message: `stop ${name} (stub)` };
}

export async function clearModuleCache(name: ModuleName): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  // 真实实现：`${compose} down -v` + 清理缓存目录
  return { success: true, message: `clear ${name} (stub)` };
}

export async function getModuleStatus(_name: ModuleName): Promise<IpcResponse<ModuleStatus>> {
  // 真实实现：查询容器状态并解析端口映射
  return { success: true, data: { running: false, status: 'stopped', ports: {} } };
}
