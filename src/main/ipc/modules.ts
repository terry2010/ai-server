import { ipcMain, BrowserWindow } from 'electron';
import { IPC, type ModuleName } from '../../shared/ipc-contract';
import { listModules, startModule, stopModule, clearModuleCache, firstStartModule, startModuleStream, stopModuleStream, firstStartModuleStream } from '../docker/modules';
import { getModuleStatus } from '../docker/status';
import { emitOpsLog } from '../logs/app-ops-log'
import { attachModuleContainers, detachModuleContainers } from '../docker/logs-attach';
import { getModuleLogs } from '../docker/logs';
import { getOpsLogs } from '../logs/app-ops-log'

ipcMain.handle(IPC.ModulesList, async () => ({ success: true, data: { items: listModules() } }));

ipcMain.handle(IPC.ModuleStart, async (_e, payload: { name: ModuleName }) => {
  console.info('[ipc] ModuleStart', payload)
  emitOpsLog(`[ipc] ModuleStart ${payload.name}`)
  const res = await startModule(payload.name);
  emitOpsLog(`[ops] start ${payload.name} => ${res.success ? 'OK' : 'FAIL'} ${res.message || ''}`)
  try {
    const status = await getModuleStatus(payload.name)
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.ModuleStatusEvent, { name: payload.name, status })
  } catch {}
  return res;
});

ipcMain.handle(IPC.ModuleStartStream, async (e, payload: { name: ModuleName; streamId: string }) => {
  return startModuleStream(payload.name, e.sender, payload.streamId);
});

ipcMain.handle(IPC.ModuleFirstStart, async (_e, payload: { name: ModuleName }) => {
  console.info('[ipc] ModuleFirstStart', payload)
  emitOpsLog(`[ipc] ModuleFirstStart ${payload.name}`)
  const res = await firstStartModule(payload.name);
  emitOpsLog(`[ops] firstStart ${payload.name} => ${res.success ? 'OK' : 'FAIL'} ${res.message || ''}`)
  try {
    const status = await getModuleStatus(payload.name)
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.ModuleStatusEvent, { name: payload.name, status })
  } catch {}
  return res;
});

ipcMain.handle(IPC.ModuleFirstStartStream, async (e, payload: { name: ModuleName; streamId: string }) => {
  return firstStartModuleStream(payload.name, e.sender, payload.streamId);
});

ipcMain.handle(IPC.ModuleStop, async (_e, payload: { name: ModuleName }) => {
  console.info('[ipc] ModuleStop', payload)
  emitOpsLog(`[ipc] ModuleStop ${payload.name}`)
  const res = await stopModule(payload.name);
  emitOpsLog(`[ops] stop ${payload.name} => ${res.success ? 'OK' : 'FAIL'} ${res.message || ''}`)
  try {
    const status = await getModuleStatus(payload.name)
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.ModuleStatusEvent, { name: payload.name, status })
  } catch {}
  return res;
});

ipcMain.handle(IPC.ModuleStopStream, async (e, payload: { name: ModuleName; streamId: string }) => {
  return stopModuleStream(payload.name, e.sender, payload.streamId);
});

// 客户端日志历史
ipcMain.handle(IPC.AppClientLogsGet, async (_e, payload?: { tail?: number }) => {
  try {
    const tail = payload?.tail ?? 500
    const data = getOpsLogs(tail)
    return { success: true, data }
  } catch (e: any) {
    return { success: false, code: 'E_RUNTIME', message: e?.message || String(e) }
  }
})

ipcMain.handle(IPC.ModuleStatus, async (_e, payload: { name: ModuleName }) => {
  return getModuleStatus(payload.name);
});

ipcMain.handle(IPC.ModuleClear, async (_e, payload: { name: ModuleName }) => {
  return clearModuleCache(payload.name);
});

ipcMain.handle(IPC.ModuleLogs, async (_e, payload?: { name?: ModuleName; tail?: number }) => {
  const name = payload?.name as ModuleName | undefined;
  const tail = typeof payload?.tail === 'number' ? payload!.tail : 200;
  return getModuleLogs(name, tail);
});

// 实时日志 attach / detach
ipcMain.handle(IPC.ModuleLogsAttach, async (e, payload: { name: ModuleName; streamId: string }) => {
  await attachModuleContainers(payload.name, e.sender, payload.streamId);
  return { success: true };
});

ipcMain.handle(IPC.ModuleLogsDetach, async (_e, payload: { name: ModuleName }) => {
  await detachModuleContainers(payload.name);
  return { success: true };
});
