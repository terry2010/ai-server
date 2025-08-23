import type { ModuleName, ModuleStatus, IpcResponse, ModuleType } from '../../shared/ipc-contract';
import { IPC } from '../../shared/ipc-contract';
import { dockerRunning, pickComposeCommand, run, isTcpOpen } from './utils';
import { loadRegistry } from '../config/store';
import { getGlobalConfig } from '../config/store';
import * as path from 'node:path';
import type { WebContents } from 'electron';
import { waitHealth } from './health';
import { spawnStream } from './log-stream';
import { containerNameFor, serviceNameFor, servicesForModule } from './naming';
import { ensureExternalResources, ensureExternalInfraResources } from './resources';
import { getFeatureComposePath, resolveDefaultVar, materializeFeatureCompose } from './template';
import { checkPortsConflict } from './ports';
import { composeUp, composeStop, composeUpStream, composeStopStream, startContainerStream } from './compose-runner';

type LogEntry = { cmd: string; stdout?: string; stderr?: string };

async function execAndLog(cmd: string, logs: LogEntry[], cwd?: string) {
  const r = await run(cmd, cwd);
  logs.push({ cmd, stdout: r.stdout, stderr: r.stderr });
  return r;
}

// 向渲染进程发送一条标准输出日志（避免把纯文本当作命令执行）
function emitStdout(sender: WebContents, streamId: string, text: string) {
  try {
    sender.send(IPC.ModuleLogEvent, { streamId, event: 'stdout', chunk: text });
  } catch {}
}

// 实时日志流由 ./log-stream 提供

export interface ModuleItem { name: string; type: ModuleType }

// 命名工具由 ./naming 提供

export function listModules(): ModuleItem[] {
  const reg = loadRegistry();
  return (reg.modules || []).map(m => ({ name: m.name, type: m.type }));
}

// 外部资源确保由 ./resources 提供

// 外部基础资源确保由 ./resources 提供

// ===== 依赖环检测 =====
function detectDepCycle(mods: any[], start: string): { ok: true } | { ok: false; path: string[] } {
  const byName: Record<string, any> = {};
  for (const m of mods) byName[m.name] = m;
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];
  function dfs(n: string): boolean {
    if (stack.has(n)) { path.push(n); return true; }
    if (visited.has(n)) return false;
    visited.add(n); stack.add(n); path.push(n);
    const deps = (byName[n]?.dependsOn || []) as string[];
    for (const d of deps) {
      if (dfs(d)) return true;
    }
    stack.delete(n); path.pop();
    return false;
  }
  const has = dfs(start);
  if (has) {
    // 将栈中最后出现的重复节点作为环起点，裁剪路径
    const loopStart = path[path.length - 1];
    const firstIdx = path.indexOf(loopStart);
    const cyc = path.slice(firstIdx);
    return { ok: false, path: cyc };
  }
  return { ok: true };
}

export async function firstStartModule(name: ModuleName): Promise<IpcResponse> {
  const logs: LogEntry[] = [];
  const running = await dockerRunning();
  const compose = await pickComposeCommand();
  if (!running) return { success: false, code: 'E_RUNTIME', message: 'Docker 未运行' };
  if (!compose) return { success: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  try {
    await ensureExternalResources(logs);
  } catch (e: any) {
    return { success: false, code: 'E_PREFLIGHT_RESOURCE', message: `初始化外部资源失败: ${String(e?.message ?? e)}`, data: { logs } };
  }
  // 后续沿用正常启动流程（依赖解析、健康检查等）
  const res = await startModule(name);
  // 合并 logs（startModule 内也会带 logs，这里以 startModule 为准）
  return res;
}

export async function startModule(name: ModuleName): Promise<IpcResponse> {
  const logs: LogEntry[] = [];
  // 确保外部网络与命名卷存在（幂等）
  await ensureExternalInfraResources(logs);
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const reg = loadRegistry();
  const modules = reg.modules || [];
  const target = modules.find(m => m.name === name);
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` };
  // 依赖环检测
  {
    const cyc = detectDepCycle(modules as any[], name);
    if (!cyc.ok) return { success: false, code: 'E_DEP_CYCLE', message: `依赖存在环: ${cyc.path.join(' -> ')}` };
  }

  const deps = (target.dependsOn || []) as ModuleName[];

  // 2.1 端口占用校验（基于注册表 ports 的默认值与绑定地址）
  const checkList = [...deps, name];
  const runningNames = await listRunningContainerNames();
  {
    const r = await checkPortsConflict(modules as any[], checkList, runningNames, containerNameFor);
    if (!r.ok) {
      const { bind, hostPort, modName } = r as any;
      return { success: false, code: 'E_PORT_CONFLICT', message: `端口已被占用: ${bind}:${hostPort}（模块: ${modName}）。请在设置中修改宿主机端口或释放后重试。` };
    }
  }

  // 3) 启动基础服务（infra compose）
  if (deps.length > 0) {
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    // 先计算哪些依赖需要 compose up，哪些可以直接 docker start 或已在运行
    const runningSet = await listRunningContainerNames();
    const allSet = await listAllContainerNames();
    const needUp: string[] = [];
    for (const dep of deps) {
      const cname = containerNameFor(dep);
      if (runningSet.has(cname)) continue; // 已在运行，跳过
      if (allSet.has(cname)) {
        // 已存在但未运行，直接启动容器
        await execAndLog(`docker start ${cname}`, logs);
      } else {
        needUp.push(serviceNameFor(dep));
      }
    }
    if (needUp.length > 0) {
      const r = await composeUp(infraCompose, needUp);
      if (!r.ok) return { success: false, code: r.code as any, message: r.message || '启动依赖失败', data: { logs } };
    }
    // 3.1 等待依赖健康（基于注册表 healthCheck）
    for (const dep of deps) {
      const depItem = modules.find(m => m.name === dep);
      if (!depItem) continue;
      const hc = (depItem as any).healthCheck;
      const ok = await waitHealth(hc);
      if (!ok) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `依赖未就绪: ${dep}` };
    }
  }

  // 4) 启动模块自身（feature compose 或 infra 同文件）
  if (target.type === 'feature') {
    const tpl = materializeFeatureCompose(name);
    if (!tpl.ok) return { success: false, code: (tpl as any).code, message: (tpl as any).message, data: { logs } };
    const featureCompose = (tpl as any).path;
    const r = await composeUp(featureCompose, servicesForModule(name));
    if (!r.ok) return { success: false, code: r.code as any, message: r.message || '启动模块失败', data: { logs } };
  } else {
    // basic 模块：走 infra 文件（同样避免与现存容器冲突）
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    const cname = containerNameFor(name);
    const runningSet = await listRunningContainerNames();
    const allSet = await listAllContainerNames();
    if (runningSet.has(cname)) {
      // 已在运行，跳过 compose
    } else if (allSet.has(cname)) {
      await execAndLog(`docker start ${cname}`, logs);
    } else {
      const r = await composeUp(infraCompose, [serviceNameFor(name)]);
      if (!r.ok) return { success: false, code: r.code as any, message: r.message || '启动模块失败', data: { logs } };
    }
  }

  // 5) 等待模块健康
  const ok = await waitHealth((target as any).healthCheck);
  if (!ok) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `模块未就绪: ${name}` , data: { logs } };

  return { success: true, message: `start ${name} OK`, data: { logs } };
}

export async function stopModule(name: ModuleName): Promise<IpcResponse> {
  const logs: LogEntry[] = [];
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const reg = loadRegistry();
  const modules = reg.modules || [];
  const target = modules.find(m => m.name === name);
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` };

  if (target.type === 'feature') {
    const tpl = materializeFeatureCompose(name);
    if (!tpl.ok) return { success: false, code: (tpl as any).code, message: (tpl as any).message, data: { logs } };
    const featureCompose = (tpl as any).path;
    const svc = servicesForModule(name);
    const r = await composeStop(featureCompose, svc);
    if (!r.ok) {
      // 兜底：直接 docker stop 每个容器
      for (const s of svc) {
        try { await execAndLog(`docker stop ${containerNameFor(s)}`, logs); } catch {}
      }
    }
  } else {
    // basic 模块：在停止前进行占用检查——若仍被运行中的 feature 依赖，阻止
    const reg2 = loadRegistry();
    const modules2 = reg2.modules || [];
    const users = modules2.filter(m => m.type === 'feature' && (m.dependsOn || []).includes(name));
    if (users.length > 0) {
      const runningSet = await listRunningContainerNames();
      const inUse = users.some(u => {
        const svcs = servicesForModule(u.name as ModuleName);
        return svcs.some(s => runningSet.has(containerNameFor(s)));
      });
      if (inUse) {
        logs.push({ cmd: `[dep] block stop basic ${name}: in use by ${users.map(u=>u.name).join(', ')}` });
        return { success: false, code: 'E_IN_USE', message: `基础服务 ${name} 仍被运行中的功能模块依赖，已阻止停止。` };
      }
    }
    // 通过占用检查后再 stop（不 down，避免误删共享资源）
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    {
      const r = await composeStop(infraCompose, [serviceNameFor(name)]);
      if (!r.ok) return { success: false, code: r.code as any, message: r.message || '停止模块失败', data: { logs } };
    }
  }
  // 兜底：仅对 basic 模块执行单容器 stop
  if (target.type !== 'feature') {
    try {
      const cname = containerNameFor(name);
      const set = await listRunningContainerNames();
      if (set.has(cname)) await execAndLog(`docker stop ${cname}`, logs);
    } catch {}
  }
  // 依赖感知回收（可选）：仅当全局开关 autoStopUnusedDeps=true 才尝试停止未被占用的基础服务
  try {
    const { autoStopUnusedDeps } = getGlobalConfig() as any;
    if (autoStopUnusedDeps) {
      const deps = (target.dependsOn || []) as ModuleName[];
      if (deps.length > 0) {
        const runningNames = await listRunningContainerNames();
        const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
        for (const dep of deps) {
          const users = modules.filter(m => m.name !== name && m.type === 'feature' && (m.dependsOn || []).includes(dep));
          // 精确判断：是否存在运行中的依赖者（任一服务容器在运行即视为占用）
          const inUse = users.some(u => {
            const svcs = servicesForModule(u.name as ModuleName);
            return svcs.some(s => runningNames.has(containerNameFor(s)));
          });
          if (!inUse) {
            logs.push({ cmd: `[dep] auto-stop unused basic ${dep}` });
            await execAndLog(`${compose} -f ${infraCompose} stop ${serviceNameFor(dep)}`, logs);
          } else {
            logs.push({ cmd: `[dep] keep basic ${dep}: in use by ${users.map(u=>u.name).join(', ')}` });
          }
        }
      }
    }
  } catch {}

  return { success: true, message: `stop ${name} OK`, data: { logs } };
}

export async function clearModuleCache(name: ModuleName): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  // TODO: `${compose} down -v` + 清理数据目录（按模块）
  return { success: true, message: `clear ${name} (stub)` };
}

export async function getModuleStatus(name: ModuleName): Promise<IpcResponse<ModuleStatus>> {
  // 返回模块（可能由多个服务组成）的聚合状态与端口
  try {
    const reg = loadRegistry();
    const mods = reg.modules || [];
    const self = mods.find(m => m.name === name);
    if (!self) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` };

    // 收集需要检查的容器名
    const services = self.type === 'feature' ? servicesForModule(name) : [name];
    const containers = services.map(s => containerNameFor(s));

    // docker ps 列表用于端口映射收集
    const { stdout } = await run('docker ps --format "{{.Names}}|{{.Ports}}"');
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const ports: Record<string, string> = {};
    const states: string[] = [];

    for (const cname of containers) {
      // 端口（仅当容器在运行集中时才有）
      const match = lines.find(l => l.startsWith(cname + '|'));
      if (match) {
        const parts = match.split('|');
        const portStr = parts[1] || '';
        if (portStr) ports[cname] = portStr;
      }
      // 精确状态
      let state = 'stopped';
      try {
        const { stdout: s2 } = await run(`docker inspect -f "{{.State.Status}}" ${cname}`);
        state = (s2.trim() || 'stopped').toLowerCase();
      } catch {}
      states.push(state);
    }

    // 计算聚合状态
    let status: ModuleStatus['status'] = 'stopped';
    if (states.length > 0 && states.every(s => s === 'running')) status = 'running';
    else if (states.some(s => s === 'restarting' || s === 'exited' || s === 'dead')) status = 'error';
    else status = 'stopped';
    const running = status === 'running';

    // usedBy 计算（仅当该模块为基础服务时才有意义）
    let usedBy: string[] | undefined = undefined;
    if (self && self.type === 'basic') {
      const runningSet = await listRunningContainerNames();
      const users = mods.filter(m => m.type === 'feature' && (m.dependsOn || []).includes(name));
      const activeUsers = users.filter(u => {
        const svcs = servicesForModule(u.name as ModuleName);
        return svcs.some(s => runningSet.has(containerNameFor(s)));
      }).map(u => u.name);
      usedBy = activeUsers;
    }

    return { success: true, data: { running, status, ports, usedBy } };
  } catch (e: any) {
    return { success: false, code: 'E_RUNTIME', message: String(e?.message ?? e) };
  }
}

// waitHealth 已迁移至 ./health

// 服务名解析由 ./naming 提供

// 变量解析由 ./template 提供

async function listRunningContainerNames(): Promise<Set<string>> {
  try {
    const { stdout } = await run('docker ps --format "{{.Names}}"');
    const set = new Set<string>();
    stdout.trim().split(/\r?\n/).forEach(l => l && set.add(l));
    return set;
  } catch {
    return new Set();
  }
}

// 包含所有容器（运行中与已退出），用于避免 compose 与现存容器同名冲突
async function listAllContainerNames(): Promise<Set<string>> {
  try {
    const { stdout } = await run('docker ps -a --format "{{.Names}}"');
    const set = new Set<string>();
    stdout.trim().split(/\r?\n/).forEach(l => l && set.add(l));
    return set;
  } catch {
    return new Set();
  }
}

// ===== 实时日志流版本 =====
export async function startModuleStream(name: ModuleName, sender: WebContents, streamId: string): Promise<IpcResponse> {
  // 确保外部网络与命名卷存在（幂等）
  await ensureExternalInfraResources();
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const reg = loadRegistry();
  const modules = reg.modules || [];
  const target = modules.find(m => m.name === name);
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` };
  // 依赖环检测
  {
    const cyc = detectDepCycle(modules as any[], name);
    if (!cyc.ok) return { success: false, code: 'E_DEP_CYCLE', message: `依赖存在环: ${cyc.path.join(' -> ')}` };
  }

  const deps = (target.dependsOn || []) as ModuleName[];

  // 端口占用校验
  {
    const checkList = [...deps, name];
    const runningNames = await listRunningContainerNames();
    const r = await checkPortsConflict(modules as any[], checkList, runningNames, containerNameFor);
    if (!r.ok) {
      const { bind, hostPort, modName } = r as any;
      return { success: false, code: 'E_PORT_CONFLICT', message: `端口已被占用: ${bind}:${hostPort}（模块: ${modName}）。请在设置中修改宿主机端口或释放后重试。` };
    }
  }

  // 启动依赖
  if (deps.length > 0) {
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    const runningSet = await listRunningContainerNames();
    const allSet = await listAllContainerNames();
    const needUp: string[] = [];
    for (const dep of deps) {
      const cname = containerNameFor(dep);
      if (runningSet.has(cname)) continue;
      if (allSet.has(cname)) {
        await spawnStream(`docker start ${cname}`, sender, streamId);
      } else {
        needUp.push(serviceNameFor(dep));
      }
    }
    if (needUp.length > 0) {
      const r = await composeUpStream(infraCompose, needUp, sender, streamId);
      if (!r.ok) return { success: false, code: r.code as any, message: r.message || '启动依赖失败' };
    }
    for (const dep of deps) {
      const depItem = modules.find(m => m.name === dep);
      if (!depItem) continue;
      const hc = (depItem as any).healthCheck;
      const ok = await waitHealth(hc);
      if (!ok) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `依赖未就绪: ${dep}` };
    }
  }

  // 启动自身
  if (target.type === 'feature') {
    const tpl = materializeFeatureCompose(name);
    if (!tpl.ok) return { success: false, code: (tpl as any).code, message: (tpl as any).message };
    const featureCompose = (tpl as any).path;
    const r = await composeUpStream(featureCompose, servicesForModule(name), sender, streamId);
    if (!r.ok) return { success: false, code: r.code as any, message: r.message || '启动模块失败' };
  } else {
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    const cname = containerNameFor(name);
    const runningSet = await listRunningContainerNames();
    const allSet = await listAllContainerNames();
    if (runningSet.has(cname)) {
      // 已在运行
    } else if (allSet.has(cname)) {
      const r = await startContainerStream(cname, sender, streamId);
      if (!r.ok) return { success: false, code: r.code as any, message: r.message || '启动容器失败' };
    } else {
      const r = await composeUpStream(infraCompose, [serviceNameFor(name)], sender, streamId);
      if (!r.ok) return { success: false, code: r.code as any, message: r.message || '启动模块失败' };
    }
  }
  const ok = await waitHealth((target as any).healthCheck);
  if (!ok) return { success: false, code: 'E_HEALTH_TIMEOUT', message: `模块未就绪: ${name}` };
  return { success: true, message: `start ${name} OK` };
}

export async function stopModuleStream(name: ModuleName, sender: WebContents, streamId: string): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const reg = loadRegistry();
  const modules = reg.modules || [];
  const target = modules.find(m => m.name === name);
  if (!target) return { success: false, code: 'E_RUNTIME', message: `模块未注册: ${name}` };
  if (target.type === 'feature') {
    const tpl = materializeFeatureCompose(name);
    if (!tpl.ok) return { success: false, code: (tpl as any).code, message: (tpl as any).message };
    const featureCompose = (tpl as any).path;
    const svc = servicesForModule(name);
    const r = await composeStopStream(featureCompose, svc, sender, streamId);
    if (!r.ok) {
      // 兜底：直接 docker stop
      for (const s of svc) {
        try { await spawnStream(`docker stop ${containerNameFor(s)}`, sender, streamId); } catch {}
      }
      // 不返回错误，让上层依据容器状态刷新
    }
  } else {
    // basic 模块：在停止前进行占用检查——若仍被运行中的 feature 依赖，阻止
    const users = modules.filter(m => m.type === 'feature' && (m.dependsOn || []).includes(name));
    if (users.length > 0) {
      const runningSet = await listRunningContainerNames();
      const inUse = users.some(u => runningSet.has(containerNameFor(u.name)));
      if (inUse) {
        emitStdout(sender, streamId, `[dep] block stop basic ${name}: in use by ${users.map(u=>u.name).join(', ')}`);
        return { success: false, code: 'E_IN_USE', message: `基础服务 ${name} 仍被运行中的功能模块依赖，已阻止停止。` };
      }
    }
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    const r2 = await composeStopStream(infraCompose, [serviceNameFor(name)], sender, streamId);
    if (!r2.ok) return { success: false, code: r2.code as any, message: r2.message || '停止模块失败' };
  }
  // 兜底：仅 basic 模块执行单容器 stop
  if (target.type !== 'feature') {
    try {
      const cname = containerNameFor(name);
      const set = await listRunningContainerNames();
      if (set.has(cname)) await spawnStream(`docker stop ${cname}`, sender, streamId);
    } catch {}
  }
  // 依赖感知回收（可选）：仅当全局开关 autoStopUnusedDeps=true 才尝试停止未被占用的基础服务（仅 feature 停止时考虑）
  try {
    if (target.type === 'feature') {
      const { autoStopUnusedDeps } = getGlobalConfig() as any;
      if (autoStopUnusedDeps) {
        const deps = (target.dependsOn || []) as ModuleName[];
        if (deps.length > 0) {
          const runningNames = await listRunningContainerNames();
          const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
          for (const dep of deps) {
            const users = modules.filter(m => m.name !== name && m.type === 'feature' && (m.dependsOn || []).includes(dep));
            const inUse = users.some(u => runningNames.has(containerNameFor(u.name)));
            if (!inUse) {
              emitStdout(sender, streamId, `[dep] auto-stop unused basic ${dep}`);
              await composeStopStream(infraCompose, [serviceNameFor(dep)], sender, streamId);
            } else {
              emitStdout(sender, streamId, `[dep] keep basic ${dep}: in use by ${users.map(u=>u.name).join(', ')}`);
            }
          }
        }
      }
    }
  } catch {}
  return { success: true, message: `stop ${name} OK` };
}

export async function firstStartModuleStream(name: ModuleName, sender: WebContents, streamId: string): Promise<IpcResponse> {
  const running = await dockerRunning();
  const compose = await pickComposeCommand();
  if (!running) return { success: false, code: 'E_RUNTIME', message: 'Docker 未运行' };
  if (!compose) return { success: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  try {
    await ensureExternalResources();
  } catch (e: any) {
    return { success: false, code: 'E_PREFLIGHT_RESOURCE', message: `初始化外部资源失败: ${String(e?.message ?? e)}` };
  }
  return startModuleStream(name, sender, streamId);
}
