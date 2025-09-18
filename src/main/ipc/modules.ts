import { ipcMain, BrowserWindow } from 'electron';
import { IPC, type ModuleName } from '../../shared/ipc-contract';
import { listModules, startModule, stopModule, clearModuleCache, firstStartModule, startModuleStream, stopModuleStream, firstStartModuleStream } from '../docker/modules';
import { getModuleStatus } from '../docker/status';
import { attachModuleContainers, detachModuleContainers } from '../docker/logs-attach';
import { getModuleLogs } from '../docker/logs';

ipcMain.handle(IPC.ModulesList, async () => ({ success: true, data: { items: listModules() } }));

ipcMain.handle(IPC.ModuleStart, async (_e, payload: { name: ModuleName }) => {
  console.info('[ipc] ModuleStart', payload)
  const res = await startModule(payload.name);
  try {
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.ModuleLogEvent, { streamId: 'ops', event: 'info', chunk: `[ops] start ${payload.name} => ${res.success ? 'OK' : 'FAIL'} ${res.message || ''}` })
  } catch {}
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
  const res = await firstStartModule(payload.name);
  try {
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.ModuleLogEvent, { streamId: 'ops', event: 'info', chunk: `[ops] firstStart ${payload.name} => ${res.success ? 'OK' : 'FAIL'} ${res.message || ''}` })
  } catch {}
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
  const res = await stopModule(payload.name);
  try {
    const wins = BrowserWindow.getAllWindows()
    for (const w of wins) w.webContents.send(IPC.ModuleLogEvent, { streamId: 'ops', event: 'info', chunk: `[ops] stop ${payload.name} => ${res.success ? 'OK' : 'FAIL'} ${res.message || ''}` })
  } catch {}
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
