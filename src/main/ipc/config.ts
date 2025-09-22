import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import { getGlobalConfig, setGlobalConfig, getFirstRunState, patchFirstRunState } from '../config/store';
import { ensureTray } from '../tray';

ipcMain.handle(IPC.ConfigGet, async (_e, key?: string) => {
  if (!key) {
    return { success: true, data: { global: getGlobalConfig(), firstRun: getFirstRunState() } };
  }
  if (key === 'global') return { success: true, data: getGlobalConfig() };
  if (key === 'firstRun') return { success: true, data: getFirstRunState() };
  return { success: false, message: 'unknown key' };
});

ipcMain.handle(IPC.ConfigSet, async (_e, payload: { global?: Record<string, any>; firstRun?: Record<string, any> }) => {
  if (payload?.global) setGlobalConfig(payload.global as any);
  if (payload?.firstRun) patchFirstRunState(payload.firstRun as any);
  try { ensureTray(); } catch {}
  return { success: true, data: { global: getGlobalConfig(), firstRun: getFirstRunState() } };
});
