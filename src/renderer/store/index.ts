import { defineStore } from 'pinia';
import type { ModuleItem, ModuleStatus } from '../../shared/ipc-contract';

export const useModuleStore = defineStore('modules', {
  state: () => ({
    basic: [] as ModuleItem[],
    feature: [] as ModuleItem[],
    status: new Map<string, ModuleStatus>(),
    loading: false,
  }),
});
