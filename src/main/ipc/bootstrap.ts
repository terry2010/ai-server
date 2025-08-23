import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-contract';

// 环境诊断占位实现
ipcMain.handle(IPC.EnvDiagnose, async () => ({ success: true, data: { docker: { installed: false, running: false, compose: null }, issues: [] } }));

// 模块列表占位实现
ipcMain.handle(IPC.ModulesList, async () => ({ success: true, data: { items: [ { name: 'mysql', type: 'basic' }, { name: 'redis', type: 'basic' }, { name: 'dify', type: 'feature' } ] } }));

// 启停占位实现
ipcMain.handle(IPC.ModuleStart, async (_e, p) => ({ success: true, message: `start ${p?.name} (stub)` }));
ipcMain.handle(IPC.ModuleStop, async (_e, p) => ({ success: true, message: `stop ${p?.name} (stub)` }));
ipcMain.handle(IPC.ModuleStatus, async (_e, p) => ({ success: true, data: { running: false, status: 'stopped', ports: {} } }));
ipcMain.handle(IPC.ModuleClear, async (_e, p) => ({ success: true, message: `clear ${p?.name} (stub)` }));

// 配置读写占位
ipcMain.handle(IPC.ConfigGet, async () => ({ success: true, data: {} }));
ipcMain.handle(IPC.ConfigSet, async (_e, p) => ({ success: true, data: p }));
