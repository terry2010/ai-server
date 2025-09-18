export type ModuleName = 'dify' | 'ragflow' | 'n8n' | 'oneapi' | string;
export type ModuleType = 'basic' | 'feature';

export interface IpcResponse<T = any> {
  success: boolean;
  // 标准化错误码（成功时可为空）
  code?: ErrorCode;
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
export interface ModuleStatus { running: boolean; status: 'running' | 'stopped' | 'error' | 'parse_error'; ports: Record<string, string>; usedBy?: string[] }

// 统一错误码（与文档第11章保持一致，按需增补）
export type ErrorCode =
  | 'E_COMPOSE_NOT_FOUND'
  | 'E_TEMPLATE_MISSING'
  | 'E_VAR_MISSING'
  | 'E_PORT_CONFLICT'
  | 'E_DEP_CYCLE'
  | 'E_HEALTH_TIMEOUT'
  | 'E_RUNTIME'
  | 'E_PREFLIGHT_RESOURCE'
  | 'E_EXT_CONN_FAIL'
  | 'E_IMAGE_PULL'
  | 'E_INIT_SCRIPT'
  | 'E_FIRST_RUN_ABORTED'
  | 'E_IN_USE';

export const IPC = {
  EnvDiagnose: 'ai/env/diagnose',
  DockerCheck: 'ai/docker/checkDocker',
  DockerStart: 'ai/docker/startDocker',
  ModulesList: 'ai/modules/list',
  ModuleStart: 'ai/module/start',
  ModuleStartStream: 'ai/module/startStream',
  ModuleFirstStart: 'ai/module/firstStart',
  ModuleFirstStartStream: 'ai/module/firstStartStream',
  ModuleStop: 'ai/module/stop',
  ModuleStopStream: 'ai/module/stopStream',
  ModuleStatus: 'ai/module/status',
  ModuleClear: 'ai/module/clear',
  ModuleLogs: 'ai/module/logs',
  ModuleLogsAttach: 'ai/module/logsAttach',
  ModuleLogsDetach: 'ai/module/logsDetach',
  AppClientLogsGet: 'ai/logs/client/get',
  ConfigGet: 'ai/config/get',
  ConfigSet: 'ai/config/set',
  ModuleLogEvent: 'ai/module/log',
  ModuleStatusEvent: 'ai/module/statusEvent',
  WindowMinimize: 'ai/window/minimize',
  WindowMaximize: 'ai/window/maximize',
  WindowClose: 'ai/window/close',
} as const;
