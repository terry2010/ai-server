import type { ModuleName, ModuleStatus, IpcResponse, ModuleType } from '../../shared/ipc-contract';
import { dockerRunning, pickComposeCommand } from './utils';
import { loadRegistry } from '../config/store';

export interface ModuleItem { name: string; type: ModuleType }

export function listModules(): ModuleItem[] {
  const reg = loadRegistry();
  return (reg.modules || []).map(m => ({ name: m.name, type: m.type }));
}

export async function startModule(name: ModuleName): Promise<IpcResponse> {
  // 占位：仅检查 docker 是否运行与 compose 可用
  const running = await dockerRunning();
  const compose = await pickComposeCommand();
  if (!running) return { success: false, message: 'Docker 未运行' };
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  // TODO: 根据注册表渲染 compose 并 up -d（下一步实现）
  return { success: true, message: `start ${name} (stub)` };
}

export async function stopModule(name: ModuleName): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  // TODO: `${compose} stop ${name}` 或 `down`（按依赖保护策略）
  return { success: true, message: `stop ${name} (stub)` };
}

export async function clearModuleCache(name: ModuleName): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  // TODO: `${compose} down -v` + 清理数据目录（按模块）
  return { success: true, message: `clear ${name} (stub)` };
}

export async function getModuleStatus(_name: ModuleName): Promise<IpcResponse<ModuleStatus>> {
  // 真实实现：查询容器状态并解析端口映射
  return { success: true, data: { running: false, status: 'stopped', ports: {} } };
}
