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
  // 应用 UI 设置：Accept-Language 与 新窗口打开策略
  try {
    const g = getGlobalConfig() as any
    const ui = g?.ui || {}
    // 1) Accept-Language
    try {
      const { session } = require('electron')
      const ua = session.defaultSession.getUserAgent()
      const lang = String(ui.language || 'zh')
      const al = lang === 'en' ? 'en-US,en;q=0.9,zh;q=0.5' : 'zh-CN,zh;q=0.9,en;q=0.8'
      session.defaultSession.setUserAgent(ua, al)
    } catch {}
    // 2) 新窗口打开策略
    try {
      const { BVManager } = require('../browserview/manager')
      BVManager.applyUi?.({ newWindowMode: ui.newWindowMode })
    } catch {}
  } catch {}
  return { success: true, data: { global: getGlobalConfig(), firstRun: getFirstRunState() } };
});
