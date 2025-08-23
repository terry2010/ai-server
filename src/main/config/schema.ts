import type { ModuleType } from '../../shared/ipc-contract';

export type HealthType = 'tcp' | 'http' | 'container_healthy';

export interface HealthCheck {
  type: HealthType;
  target?: string; // tcp: host:port, http: url
  interval?: number;
  timeout?: number;
  retries?: number;
}

export interface PortMapping { container: number; host: number | string; bind?: string }
export interface VolumeMapping { host: string; container: string }

export interface ModuleSchema {
  name: string;
  type: ModuleType; // 'basic' | 'feature'
  dependsOn?: string[];
  profiles?: string[];
  image?: string;
  env?: Record<string, string>;
  ports?: PortMapping[];
  volumes?: VolumeMapping[];
  variables?: Record<string, string>;
  healthCheck?: HealthCheck;
  compose?: { templateRef?: string; fragment?: any };
  lifecycle?: { preUp?: string[]; postUp?: string[]; preDown?: string[] };
}

export interface GlobalConfig {
  bindAddress: string; // default 127.0.0.1
  autoStartDeps: boolean;
  autoSuggestNextPort: boolean;
}

export interface FirstRunState {
  firstRunDone?: boolean;
  schemaVersion?: number;
  lastInitAt?: string;
  lastError?: string | null;
}

export interface RegistryLoadResult {
  modules: ModuleSchema[];
  byName: Record<string, ModuleSchema>;
}

export function validateModuleSchema(mod: ModuleSchema): string[] {
  const issues: string[] = [];
  if (!mod?.name) issues.push('name is required');
  if (mod?.type !== 'basic' && mod?.type !== 'feature') issues.push('type must be basic|feature');
  if (mod?.compose && !mod.compose.templateRef && !mod.compose.fragment) issues.push('compose.templateRef|fragment required');
  return issues;
}

export function validateRegistry(mods: ModuleSchema[]): { issues: string[]; graph: string[][] } {
  const issues: string[] = [];
  const nameSet = new Set<string>();
  for (const m of mods) {
    const errs = validateModuleSchema(m);
    if (errs.length) issues.push(`[${m.name || '?'}] ${errs.join(', ')}`);
    if (nameSet.has(m.name)) issues.push(`duplicate module name: ${m.name}`);
    nameSet.add(m.name);
  }
  // 简单检测循环依赖（DFS）
  const graph = (mods || []).map(m => [m.name, ...(m.dependsOn || [])]);
  const map = new Map<string, string[]>();
  graph.forEach(([n, ...deps]) => map.set(n, deps));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function dfs(n: string): boolean {
    if (visiting.has(n)) return true; // cycle
    if (visited.has(n)) return false;
    visiting.add(n);
    for (const d of map.get(n) || []) {
      if (!map.has(d)) continue;
      if (dfs(d)) return true;
    }
    visiting.delete(n);
    visited.add(n);
    return false;
  }
  for (const [n] of graph) {
    if (dfs(n)) issues.push(`E_DEP_CYCLE: ${n}`);
  }
  return { issues, graph };
}

export function toRegistry(mods: ModuleSchema[]): RegistryLoadResult {
  const byName: Record<string, ModuleSchema> = {};
  for (const m of mods) byName[m.name] = m;
  return { modules: mods, byName };
}
