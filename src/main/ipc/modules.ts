import { ipcMain } from 'electron';
import { IPC, type ModuleName } from '../../shared/ipc-contract';
import { listModules, startModule, stopModule, getModuleStatus, clearModuleCache } from '../docker';
import { firstStartModule } from '../docker';

ipcMain.handle(IPC.ModulesList, async () => ({ success: true, data: { items: listModules() } }));

ipcMain.handle(IPC.ModuleStart, async (_e, payload: { name: ModuleName }) => {
  return startModule(payload.name);
});

ipcMain.handle(IPC.ModuleFirstStart, async (_e, payload: { name: ModuleName }) => {
  return firstStartModule(payload.name);
});

ipcMain.handle(IPC.ModuleStop, async (_e, payload: { name: ModuleName }) => {
  return stopModule(payload.name);
});

ipcMain.handle(IPC.ModuleStatus, async (_e, payload: { name: ModuleName }) => {
  return getModuleStatus(payload.name);
});

ipcMain.handle(IPC.ModuleClear, async (_e, payload: { name: ModuleName }) => {
  return clearModuleCache(payload.name);
});
