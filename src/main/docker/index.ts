import type { ModuleName, ModuleStatus, IpcResponse, ModuleType } from '../../shared/ipc-contract';
import { dockerRunning, pickComposeCommand, run, waitForTcp, waitForHttpOk, isTcpOpen } from './utils';
import { loadRegistry } from '../config/store';
import * as path from 'node:path';

export interface ModuleItem { name: string; type: ModuleType }

function containerNameFor(name: string) {
  // 约定 compose 中 container_name 为 ai-<name>
  return `ai-${name}`;
}

export function listModules(): ModuleItem[] {
  const reg = loadRegistry();
  return (reg.modules || []).map(m => ({ name: m.name, type: m.type }));
}

// 确保 external 资源存在（首次启动前调用）
async function ensureExternalResources(): Promise<void> {
  // 网络
  try {
    const { stdout } = await run('docker network ls --format "{{.Name}}"');
    const names = new Set(stdout.split(/\r?\n/).filter(Boolean));
    if (!names.has('ai-server-net')) {
      await run('docker network create ai-server-net');
    }
  } catch {}
  // 卷（与 infra compose 中保持一致）
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
      if (!vset.has(v)) await run(`docker volume create ${v}`);
    }
  } catch {}
}

export async function firstStartModule(name: ModuleName): Promise<IpcResponse> {
  const running = await dockerRunning();
  const compose = await pickComposeCommand();
  if (!running) return { success: false, message: 'Docker 未运行' };
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  try {
    await ensureExternalResources();
  } catch (e: any) {
    return { success: false, message: `初始化外部资源失败: ${String(e?.message ?? e)}` };
  }
  // 后续沿用正常启动流程（依赖解析、健康检查等）
  return startModule(name);
}

export async function startModule(name: ModuleName): Promise<IpcResponse> {
  // 1) 预检
  const running = await dockerRunning();
  const compose = await pickComposeCommand();
  if (!running) return { success: false, message: 'Docker 未运行' };
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };

  // 2) 解析注册表与依赖
  const reg = loadRegistry();
  const modules = reg.modules || [];
  const target = modules.find(m => m.name === name);
  if (!target) return { success: false, message: `模块未注册: ${name}` };

  const deps = (target.dependsOn || []) as ModuleName[];

  // 2.1 端口占用校验（基于注册表 ports 的默认值与绑定地址）
  const checkList = [...deps, name];
  const runningNames = await listRunningContainerNames();
  for (const modName of checkList) {
    const item = modules.find(m => m.name === modName);
    if (!item) continue;
    // 若依赖容器已在运行，则跳过它的端口占用校验（允许直接复用已运行实例）
    const cname = containerNameFor(modName);
    if (runningNames.has(cname) && modName !== name) continue;
    const ports = (item as any).ports as Array<{ container: number; host: string; bind?: string }> | undefined;
    if (!ports || ports.length === 0) continue;
    for (const p of ports) {
      const bind = resolveDefaultVar(p.bind ?? '${BIND_ADDRESS:127.0.0.1}', '127.0.0.1') ?? '127.0.0.1';
      const hostPortStr = resolveDefaultVar(String(p.host ?? ''), undefined);
      const hostPort = hostPortStr ? Number(hostPortStr) : undefined;
      if (!hostPort) continue;
      const occupied = await isTcpOpen(bind, hostPort, 800);
      if (occupied) {
        return { success: false, message: `端口已被占用: ${bind}:${hostPort}（模块: ${modName}）。请在设置中修改宿主机端口或释放后重试。` };
      }
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
        await run(`docker start ${cname}`);
      } else {
        needUp.push(serviceNameFor(dep));
      }
    }
    if (needUp.length > 0) {
      await run(`${compose} -f ${infraCompose} up -d --no-recreate ${needUp.join(' ')}`);
    }
    // 3.1 等待依赖健康（基于注册表 healthCheck）
    for (const dep of deps) {
      const depItem = modules.find(m => m.name === dep);
      if (!depItem) continue;
      const hc = (depItem as any).healthCheck;
      const ok = await waitHealth(hc);
      if (!ok) return { success: false, message: `依赖未就绪: ${dep}` };
    }
  }

  // 4) 启动模块自身（feature compose 或 infra 同文件）
  if (target.type === 'feature') {
    const featureCompose = path.join(process.cwd(), 'orchestration', 'modules', name, 'docker-compose.feature.yml');
    const cname = containerNameFor(name);
    const runningSet = await listRunningContainerNames();
    const allSet = await listAllContainerNames();
    if (runningSet.has(cname)) {
      // 已在运行，跳过 compose
    } else if (allSet.has(cname)) {
      await run(`docker start ${cname}`);
    } else {
      await run(`${compose} -f ${featureCompose} up -d --no-recreate ${serviceNameFor(name)}`);
    }
  } else {
    // basic 模块：走 infra 文件（同样避免与现存容器冲突）
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    const cname = containerNameFor(name);
    const runningSet = await listRunningContainerNames();
    const allSet = await listAllContainerNames();
    if (runningSet.has(cname)) {
      // 已在运行，跳过 compose
    } else if (allSet.has(cname)) {
      await run(`docker start ${cname}`);
    } else {
      await run(`${compose} -f ${infraCompose} up -d --no-recreate ${serviceNameFor(name)}`);
    }
  }

  // 5) 等待模块健康
  const ok = await waitHealth((target as any).healthCheck);
  if (!ok) return { success: false, message: `模块未就绪: ${name}` };

  return { success: true, message: `start ${name} OK` };
}

export async function stopModule(name: ModuleName): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  const reg = loadRegistry();
  const modules = reg.modules || [];
  const target = modules.find(m => m.name === name);
  if (!target) return { success: false, message: `模块未注册: ${name}` };

  if (target.type === 'feature') {
    const featureCompose = path.join(process.cwd(), 'orchestration', 'modules', name, 'docker-compose.feature.yml');
    await run(`${compose} -f ${featureCompose} stop ${serviceNameFor(name)}`);
  } else {
    // basic 模块：直接 stop，但不自动 down，避免误删共享资源
    const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
    await run(`${compose} -f ${infraCompose} stop ${serviceNameFor(name)}`);
  }
  // 兜底：若容器仍在运行，直接 docker stop 容器名
  try {
    const cname = containerNameFor(name);
    const set = await listRunningContainerNames();
    if (set.has(cname)) {
      await run(`docker stop ${cname}`);
    }
  } catch {}
  // 依赖感知回收：若目标是 feature，则尝试回收其依赖中未被其它运行模块占用的 basic
  try {
    const deps = (target.dependsOn || []) as ModuleName[];
    if (deps.length > 0) {
      const runningNames = await listRunningContainerNames();
      const infraCompose = path.join(process.cwd(), 'orchestration', 'infra', 'docker-compose.infra.yml');
      for (const dep of deps) {
        const users = modules.filter(m => m.name !== name && (m.dependsOn || []).includes(dep));
        // 判断用户模块是否有运行中的容器（简单以服务名或容器名包含模块名匹配）
        const inUse = users.some(u => Array.from(runningNames).some(n => n.includes(serviceNameFor(u.name))));
        if (!inUse) {
          await run(`${compose} -f ${infraCompose} stop ${serviceNameFor(dep)}`);
        }
      }
    }
  } catch {}

  return { success: true, message: `stop ${name} OK` };
}

export async function clearModuleCache(name: ModuleName): Promise<IpcResponse> {
  const compose = await pickComposeCommand();
  if (!compose) return { success: false, message: '未检测到 docker compose/docker-compose' };
  // TODO: `${compose} down -v` + 清理数据目录（按模块）
  return { success: true, message: `clear ${name} (stub)` };
}

export async function getModuleStatus(name: ModuleName): Promise<IpcResponse<ModuleStatus>> {
  // 仅返回该模块对应容器的状态与端口
  try {
    const cname = containerNameFor(name);
    const { stdout } = await run('docker ps --format "{{.Names}}|{{.Ports}}"');
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const match = lines.find(l => l.startsWith(cname + '|'));
    // 端口（仅当容器在运行集中时才有）
    let n = cname; let portStr = '';
    if (match) {
      const parts = match.split('|'); n = parts[0]; portStr = parts[1] || '';
    }
    // 精确状态
    let state = 'stopped';
    try {
      const { stdout: s2 } = await run(`docker inspect -f "{{.State.Status}}" ${cname}`);
      state = s2.trim() || 'stopped';
    } catch {}
    const running = state.toLowerCase() === 'running';
    const ports: Record<string, string> = {};
    if (portStr) ports[n] = portStr;
    let status: ModuleStatus['status'] = 'stopped';
    if (state === 'running') status = 'running';
    else if (state === 'restarting') status = 'error';
    else if (state === 'exited' || state === 'dead') status = 'error';
    return { success: true, data: { running, status, ports } };
  } catch (e: any) {
    return { success: false, message: String(e?.message ?? e) };
  }
}

// 内部：根据 healthCheck 配置等待可用
async function waitHealth(hc: any): Promise<boolean> {
  if (!hc) return true;
  const { type, target, retries, interval, timeout } = hc;
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
  // 其他类型（如 container_healthy）后续实现
  return true;
}

function serviceNameFor(name: string) {
  // 与 compose 中的服务名保持一致：basic 用模块名同名，feature 可能同名（如 oneapi: oneapi）
  return name;
}

// 解析形如 ${VAR:default} 的默认值，或返回 fallback
function resolveDefaultVar(expr: string, fallback?: string): string | undefined {
  if (!expr) return fallback;
  const m = expr.match(/^\$\{[^:}]+:([^}]+)}/);
  if (m && m[1]) return m[1];
  // 若是纯数字字符串
  if (/^\d+$/.test(expr)) return expr;
  // 若是明确 IP
  if (/^\d+\.\d+\.\d+\.\d+$/.test(expr)) return expr;
  return fallback;
}

// 将字符串中的多个 ${VAR:default} 占位按默认值替换（不读取环境变量，先满足默认值场景）
function resolveVarsInString(s?: string): string | undefined {
  if (!s) return s;
  return s.replace(/\$\{[^:}]+:([^}]+)}/g, (_all, dflt) => String(dflt));
}

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
