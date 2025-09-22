import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import router from './router'
import { IPC } from '../shared/ipc-contract'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

app.mount('#app')

// 全局控制台调试：打印主进程推送的模块启动/停止日志
try {
  const api: any = (window as any).api
  if (api?.on) {
    api.on(IPC.ModuleLogEvent, (_e: any, p: any) => {
      try {
        const level = (p?.level || p?.event || 'info').toLowerCase()
        const stream = p?.streamId || 'ops'
        const msg = typeof p?.chunk === 'string' ? p.chunk : JSON.stringify(p)
        const text = `[ModuleLog/${stream}] ${msg}`
        if (level === 'error') console.error(text)
        else if (level === 'warn' || level === 'warning') console.warn(text)
        else console.log(text)
      } catch (e) { console.log('[ModuleLog]', p) }
    })
    // 主进程触发的 UI 跳转（用于 Tray 菜单“系统设置”等）
    api.on(IPC.UIGoto, (_e: any, p: any) => {
      try { router.push(String(p?.path || '/settings')) } catch {}
    })
    // 后台预加载模块页面（创建/加载 BrowserView，但不切换焦点）
    api.on(IPC.PreloadModulePage, async (_e: any, p: any) => {
      try {
        const name = String(p?.module || '').toLowerCase()
        if (!name) return
        await (window as any).api.invoke(IPC.BVLoadHome, { name })
        console.log('[ui] preload module page ok <-', name)
      } catch (e) {
        console.warn('[ui] preload module page fail <-', p, e)
      }
    })

    // 订阅模块状态事件：当模块变为 running 且尚未预加载过时，后台加载 BrowserView
    const preloaded = new Set<string>()
    api.on(IPC.ModuleStatusEvent, async (_e: any, payload: any) => {
      try {
        const name = String(payload?.name || '').toLowerCase()
        const st = payload?.status?.data?.status || payload?.status?.status
        if (!name || st !== 'running' || preloaded.has(name)) return
        await (window as any).api.invoke(IPC.BVLoadHome, { name })
        preloaded.add(name)
        console.log('[ui] preload by status running <-', name)
      } catch (err) {
        console.warn('[ui] preload by status running fail <-', payload, err)
      }
    })
  }
} catch {}
