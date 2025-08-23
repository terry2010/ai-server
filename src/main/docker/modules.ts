// 门面：对外导出模块编排能力（后续可逐步用该门面替换 index.ts 的直接引用）
import type { ModuleName, ModuleStatus, IpcResponse, ModuleType } from '../../shared/ipc-contract';
import {
  listModules as _listModules,
  startModule as _startModule,
  stopModule as _stopModule,
  firstStartModule as _firstStartModule,
  getModuleStatus as _getModuleStatus,
  startModuleStream as _startModuleStream,
  stopModuleStream as _stopModuleStream,
  firstStartModuleStream as _firstStartModuleStream,
  clearModuleCache as _clearModuleCache,
} from './index';

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
