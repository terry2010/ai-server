// 门面：对外导出模块编排能力（已迁移到 operations/status 子模块）
import type { ModuleName, ModuleStatus, IpcResponse, ModuleType } from '../../shared/ipc-contract';
import {
  listModules as _listModules,
  startModule as _startModule,
  stopModule as _stopModule,
  firstStartModule as _firstStartModule,
  startModuleStream as _startModuleStream,
  stopModuleStream as _stopModuleStream,
  firstStartModuleStream as _firstStartModuleStream,
} from './operations';
import { getModuleStatus as _getModuleStatus } from './status';
import { clearModuleCache as _clearModuleCache } from './operations';

export type { ModuleName, ModuleStatus, IpcResponse, ModuleType };

export const listModules = _listModules;
export const startModule = _startModule;
export const stopModule = _stopModule;
export const firstStartModule = _firstStartModule;
export const getModuleStatus = _getModuleStatus;
export const startModuleStream = _startModuleStream;
export const stopModuleStream = _stopModuleStream;
export const firstStartModuleStream = _firstStartModuleStream;
export const clearModuleCache = _clearModuleCache;

export default {
  listModules,
  startModule,
  stopModule,
  firstStartModule,
  getModuleStatus,
  startModuleStream,
  stopModuleStream,
  firstStartModuleStream,
  clearModuleCache,
};
