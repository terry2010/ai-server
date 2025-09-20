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
  }
} catch {}
