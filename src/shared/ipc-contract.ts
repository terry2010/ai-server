export type ModuleName = 'dify' | 'ragflow' | 'n8n' | 'oneapi' | string;
export type ModuleType = 'basic' | 'feature';

export interface IpcResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface EnvDiagnoseResult {
  docker: { installed: boolean; running: boolean; compose: 'docker compose' | 'docker-compose' | null; version?: string };
  node?: string;
  npm?: string;
  powershell?: string;
  issues: string[];
}

export interface ModuleItem { name: string; type: ModuleType; }
export interface ModuleStatus { running: boolean; status: 'running' | 'stopped' | 'error' | 'parse_error'; ports: Record<string, string>; }

export const IPC = {
  EnvDiagnose: 'ai/env/diagnose',
  DockerCheck: 'ai/docker/checkDocker',
  DockerStart: 'ai/docker/startDocker',
  ModulesList: 'ai/modules/list',
  ModuleStart: 'ai/module/start',
  ModuleStop: 'ai/module/stop',
  ModuleStatus: 'ai/module/status',
  ModuleClear: 'ai/module/clear',
  ConfigGet: 'ai/config/get',
  ConfigSet: 'ai/config/set',
} as const;
