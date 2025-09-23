import { ipcMain, BrowserWindow } from 'electron';
import { IPC, type ModuleName } from '../../shared/ipc-contract';
import { listModules, startModule, stopModule, clearModuleCache, firstStartModule, startModuleStream, stopModuleStream, firstStartModuleStream } from '../docker/modules';
import { getModuleStatus } from '../docker/status';
import { emitOpsLog } from '../logs/app-ops-log'
import { attachModuleContainers, detachModuleContainers } from '../docker/logs-attach';
import { getModuleLogs } from '../docker/logs';
import { getOpsLogs } from '../logs/app-ops-log'
import { emitOpsLog as appendOpsLog } from '../logs/app-ops-log'

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
    // 同步给 Tray 缓存
    try { require('../tray').updateModuleStatusCache?.(payload.name, (status as any)?.data?.status) } catch {}
    // 刷新自绘托盘（若已打开）
    try { require('../tray-custom').refreshCustomTray?.() } catch {}
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
    try { require('../tray').updateModuleStatusCache?.(payload.name, (status as any)?.data?.status) } catch {}
    try { require('../tray-custom').refreshCustomTray?.() } catch {}
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
    // 同步给 Tray 缓存
    try { require('../tray').updateModuleStatusCache?.(payload.name, (status as any)?.data?.status) } catch {}
    try { require('../tray-custom').refreshCustomTray?.() } catch {}
  } catch {}
  return res;
});

ipcMain.handle(IPC.ModuleStopStream, async (e, payload: { name: ModuleName; streamId: string }) => {
  return stopModuleStream(payload.name, e.sender, payload.streamId);
});

// 渲染端追加一条客户端日志（用于记录点击按钮等用户操作）
ipcMain.handle(IPC.AppClientLogAppend, async (_e, payload: { level?: 'error'|'warn'|'info'|'debug'; message: string }) => {
  try {
    const level = (payload?.level || 'info') as any
    const msg = String(payload?.message || '')
    appendOpsLog(msg, level)
    return { success: true }
  } catch (e: any) {
    return { success: false, code: 'E_RUNTIME', message: e?.message || String(e) }
  }
})

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

// 日志请求合并/缓存
const moduleLogsPending = new Map<string, { promise: Promise<any>; tail: number }>()
const moduleLogsCache = new Map<string, { ts: number; data: any; tail: number }>()
const MODULE_LOGS_CACHE_TTL = 3000 // 3s 内命中缓存
const MODULE_LOGS_MIN_INTERVAL = 3000 // 至少间隔 3s 再次执行
const moduleLogsLastEnd = new Map<string, number>() // 上次成功完成时间

ipcMain.handle(IPC.ModuleLogs, async (_e, payload?: { name?: ModuleName; tail?: number }) => {
  const name = (payload?.name as ModuleName | undefined) || undefined
  const key = name || '*'
  const tail = Math.max(20, typeof payload?.tail === 'number' ? payload!.tail : 20)

  const now = Date.now()
  const cached = moduleLogsCache.get(key)
  const lastEnd = moduleLogsLastEnd.get(key) || 0

  // 若 2s 内有缓存且足够大，直接返回
  if (cached && (now - cached.ts) <= MODULE_LOGS_CACHE_TTL && cached.tail >= tail) {
    return { success: true, data: cached.data }
  }

  // 若距上次完成 < 1s 且缓存已满足所需 tail，则直接返回，避免抖动；否则放行以便扩容 tail
  if (lastEnd && (now - lastEnd) < MODULE_LOGS_MIN_INTERVAL && cached && cached.tail >= tail) {
    return { success: true, data: cached.data }
  }

  // 同名在飞请求：若新 tail 更大，则在其完成后追加一次更大 tail 的请求，并覆盖 pending；否则直接复用
  const pend = moduleLogsPending.get(key)
  if (pend) {
    if (tail > pend.tail) {
      const chained = pend.promise.then(async (res) => {
        // 若缓存已满足更大 tail，就不再追加
        const c2 = moduleLogsCache.get(key)
        if (c2 && c2.tail >= tail && (Date.now() - (c2.ts || 0)) <= MODULE_LOGS_CACHE_TTL) return { success: true, data: c2.data }
        const res2 = await getModuleLogs(name, tail)
        if (res2?.success) {
          moduleLogsCache.set(key, { ts: Date.now(), data: res2.data, tail })
          moduleLogsLastEnd.set(key, Date.now())
        }
        return res2
      }).finally(() => { moduleLogsPending.delete(key) })
      moduleLogsPending.set(key, { promise: chained, tail })
      return chained
    }
    return pend.promise
  }

  // 发起新的请求
  const p = getModuleLogs(name, tail).then(res => {
    try {
      if (res?.success) {
        moduleLogsCache.set(key, { ts: Date.now(), data: res.data, tail })
        moduleLogsLastEnd.set(key, Date.now())
      }
    } finally {
      moduleLogsPending.delete(key)
    }
    return res
  }).catch(err => {
    moduleLogsPending.delete(key)
    throw err
  })
  moduleLogsPending.set(key, { promise: p, tail })
  return p
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
