import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-contract';

const memStore = new Map<string, any>();

ipcMain.handle(IPC.ConfigGet, async (_e, key?: string) => {
  if (!key) return { success: true, data: Object.fromEntries(memStore.entries()) };
  return { success: true, data: memStore.get(key) };
});

ipcMain.handle(IPC.ConfigSet, async (_e, payload: Record<string, any>) => {
  Object.entries(payload || {}).forEach(([k, v]) => memStore.set(k, v));
  return { success: true, data: payload };
});
