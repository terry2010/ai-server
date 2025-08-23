/*
 * 配置存储与注册表加载（Win10 兼容）
 */
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('electron');
import type { ModuleSchema, RegistryLoadResult, GlobalConfig, FirstRunState } from './schema';

const INTERNAL_REGISTRY_DIR = path.resolve(process.cwd(), 'src/main/config/registry');

function readJsonSafe(file: string): any | undefined {
  try {
    if (!fs.existsSync(file)) return undefined;
    const txt = fs.readFileSync(file, 'utf-8');
    return JSON.parse(txt);
  } catch {
    return undefined;
  }
}

function listJsonFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json')).map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let cachedRegistry: RegistryLoadResult | null = null;

export function getUserDataDir() {
  const dir = app.getPath('userData');
  ensureDir(dir);
  return dir;
}

export function getUserModulesDir() {
  const dir = path.join(getUserDataDir(), 'modules');
  ensureDir(dir);
  return dir;
}

export function loadRegistry(): RegistryLoadResult {
  if (cachedRegistry) return cachedRegistry;
  const internalFiles = listJsonFiles(INTERNAL_REGISTRY_DIR);
  const userFiles = listJsonFiles(getUserModulesDir());

  const modulesMap = new Map<string, ModuleSchema>();

  // 内置注册表
  for (const f of internalFiles) {
    const obj = readJsonSafe(f);
    if (obj?.name) modulesMap.set(obj.name, obj);
  }
  // 用户覆盖
  for (const f of userFiles) {
    const obj = readJsonSafe(f);
    if (obj?.name) modulesMap.set(obj.name, { ...(modulesMap.get(obj.name) || {} as any), ...obj });
  }

  const modules = Array.from(modulesMap.values());
  const byName: Record<string, ModuleSchema> = {};
  modules.forEach(m => (byName[m.name] = m));
  cachedRegistry = { modules, byName };
  return cachedRegistry;
}

const GLOBAL_CONFIG_FILE = () => path.join(getUserDataDir(), 'config.json');

export function getGlobalConfig(): GlobalConfig {
  const def: GlobalConfig = { bindAddress: '127.0.0.1', autoStartDeps: true, autoSuggestNextPort: true, logToConsole: true };
  const obj = readJsonSafe(GLOBAL_CONFIG_FILE());
  return { ...def, ...(obj?.global || {}) } as GlobalConfig;
}

export function setGlobalConfig(patch: Partial<GlobalConfig>) {
  const cur = readJsonSafe(GLOBAL_CONFIG_FILE()) || {};
  const next = { ...cur, global: { ...(cur.global || {}), ...patch } };
  fs.writeFileSync(GLOBAL_CONFIG_FILE(), JSON.stringify(next, null, 2));
}

export function getFirstRunState(): FirstRunState {
  const obj = readJsonSafe(GLOBAL_CONFIG_FILE()) || {};
  return obj.firstRun || {};
}

export function patchFirstRunState(patch: Partial<FirstRunState>) {
  const cur = readJsonSafe(GLOBAL_CONFIG_FILE()) || {};
  const next = { ...cur, firstRun: { ...(cur.firstRun || {}), ...patch } };
  fs.writeFileSync(GLOBAL_CONFIG_FILE(), JSON.stringify(next, null, 2));
}

export function resetRegistryCache() {
  cachedRegistry = null;
}
