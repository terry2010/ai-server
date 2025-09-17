<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import CarouselBanner from '../components/CarouselBanner.vue'
import OverviewCard from '../components/OverviewCard.vue'
import ServiceCard from '../components/ServiceCard.vue'
import { listModules, getModuleStatus, dockerCheck } from '../services/ipc'
import { IPC } from '../../shared/ipc-contract'
import { moduleStore } from '../stores/modules'

type ServiceType = 'n8n' | 'dify' | 'oneapi' | 'ragflow'
type Card = { serviceName: string; serviceDescription: string; serviceType: ServiceType; status: 'running'|'stopped'|'error'|'loading'; cpuUsage: number; memoryUsage: number; port: string; uptime: string }

function normalizeServices(arr: Card[]): Card[] {
  // 以 serviceType 去重，只保留最后一次
  const map = new Map<ServiceType, Card>()
  for (const item of arr) {
    const t = item.serviceType
    if (!order.includes(t)) continue
    map.set(t, {
      ...item,
      serviceName: t === 'dify' ? 'Dify' : t === 'oneapi' ? 'OneAPI' : t === 'ragflow' ? 'RagFlow' : 'n8n',
      serviceDescription: descriptionMap[t] || ''
    })
  }
  // 按固定顺序输出
  return order.filter(t => map.has(t)).map(t => map.get(t)!)
}

const descriptionMap: Record<ServiceType, string> = {
  n8n: '工作流自动化平台，用于连接各种应用和服务',
  dify: 'AI 应用开发平台，快速构建和部署 AI 应用',
  oneapi: 'OpenAI API 代理服务，统一管理多个 AI 模型接口',
  ragflow: 'RAG 知识库问答系统，基于文档的智能问答'
}

const order: ServiceType[] = ['n8n', 'dify', 'oneapi', 'ragflow']

const services = ref<Card[]>([])
const isRefreshing = ref(false)
let timer: number | undefined
const CACHE_KEY = 'moduleStatusCache.v1'
const CACHE_TTL_MS = 2 * 60 * 1000

function saveCache(cards: Card[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: cards })) } catch {}
}

function loadCache(): Card[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (obj && Array.isArray(obj.items) && typeof obj.ts === 'number') {
      if (Date.now() - obj.ts <= CACHE_TTL_MS) {
        // 兜底：老缓存可能缺少 serviceDescription，这里补齐
        const fixed = (obj.items as any[]).map((it) => ({
          ...it,
          serviceType: it.serviceType as ServiceType,
          serviceName: it.serviceType === 'dify' ? 'Dify' : it.serviceType === 'oneapi' ? 'OneAPI' : it.serviceType === 'ragflow' ? 'RagFlow' : 'n8n',
          serviceDescription: descriptionMap[it.serviceType as ServiceType] || ''
        }))
        return fixed as Card[]
      }
    }
  } catch {}
  return null
}

function extractFirstHostPort(portsRecord: Record<string, string>): string {
  // 从 docker ps 的 Ports 字符串中解析第一个本地端口  (示例: "0.0.0.0:15432->5432/tcp, :::15432->5432/tcp")
  for (const key of Object.keys(portsRecord)) {
    const s = portsRecord[key]
    const m = s.match(/(127\.0\.0\.1|0\.0\.0\.0|\[?:::\]?|\*)?:(\d+)->/)
    if (m && m[2]) return m[2]
  }
  return ''
}

async function refreshStatus() {
  try {
    const mods = await listModules()
    const picked = mods
      .map(m => m.name.toLowerCase())
      .filter(n => order.includes(n as ServiceType)) as ServiceType[]
    // 如果还未初始化卡片，则先渲染 loading 占位
    if (services.value.length === 0) {
      services.value = picked.map((name) => ({
        serviceName: name === 'dify' ? 'Dify' : name === 'oneapi' ? 'OneAPI' : name === 'ragflow' ? 'RagFlow' : 'n8n',
        serviceDescription: descriptionMap[name],
        serviceType: name,
        status: 'loading',
        cpuUsage: 0,
        memoryUsage: 0,
        port: '',
        uptime: ''
      }) as Card)
    }
    // 查询真实状态
    const full = await Promise.all(picked.map(async (name) => {
      const st = await getModuleStatus(name)
      const port = extractFirstHostPort(st.ports)
      const status = (st.status === 'parse_error' ? 'error' : st.status) as 'running'|'stopped'|'error'
      const card: Card = {
        serviceName: name === 'dify' ? 'Dify' : name === 'oneapi' ? 'OneAPI' : name === 'ragflow' ? 'RagFlow' : 'n8n',
        serviceDescription: descriptionMap[name],
        serviceType: name,
        status,
        cpuUsage: 0,
        memoryUsage: 0,
        port: port || '',
        uptime: ''
      }
      return card
    }))
    // 按预设顺序去重排序
    services.value = normalizeServices(full)
    // 更新全局模块状态点与计数（基于规范化后的列表）
    moduleStore.total = services.value.length
    moduleStore.running = services.value.filter(f => f.status === 'running').length
    for (const f of services.value) moduleStore.dots[f.serviceType] = f.status as any
    // 写入缓存
    saveCache(services.value)
  } catch (e) {
    // 静默，首页可继续展示已有数据
    console.warn('refreshStatus error', e)
  } finally {
    ;(refreshStatus as any)._busy = false
  }
}

const route = useRoute()

onMounted(async () => {
  // 1) 先用缓存渲染，避免每次进入首页都长时间 loading
  let usedCache = false
  try {
    // 先立即尝试渲染缓存，不等待任何异步
    const cached0 = loadCache()
    if (cached0 && cached0.length) {
      services.value = normalizeServices(cached0)
      // 同步圆点与计数
      moduleStore.total = services.value.length
      moduleStore.running = services.value.filter(f => f.status === 'running').length
      for (const f of services.value) moduleStore.dots[f.serviceType] = f.status as any
      usedCache = true
    }
    const dk = await dockerCheck()
    const cached = loadCache()
    if (dk.running && cached && cached.length && !usedCache) {
      services.value = normalizeServices(cached)
      moduleStore.total = services.value.length
      moduleStore.running = services.value.filter(f => f.status === 'running').length
      for (const f of services.value) moduleStore.dots[f.serviceType] = f.status as any
      usedCache = true
    }
    if (!dk.running && !usedCache) {
      // Docker 未运行且没有可用缓存：渲染“全部 stopped”的占位，避免显示旧数据
      const list = await listModules()
      const place = list.map((m) => ({
        serviceName: (m.name as ServiceType) === 'dify' ? 'Dify' : (m.name as ServiceType) === 'oneapi' ? 'OneAPI' : (m.name as ServiceType) === 'ragflow' ? 'RagFlow' : 'n8n',
        serviceDescription: descriptionMap[m.name as ServiceType] || '',
        serviceType: m.name as ServiceType,
        status: 'stopped' as 'stopped',
        cpuUsage: 0,
        memoryUsage: 0,
        port: '',
        uptime: ''
      }))
      services.value = normalizeServices(place)
      moduleStore.total = services.value.length
      moduleStore.running = 0
      for (const f of services.value) moduleStore.dots[f.serviceType] = 'stopped' as any
    }
  } catch {}

  // 2) 订阅事件驱动更新（主进程在 start/stop 成功后会广播）
  try {
    const onStatus = (_e: any, payload: any) => {
      const name = String(payload?.name || '').toLowerCase() as ServiceType
      const resp = payload?.status
      if (!name || !resp?.success) return
      const st = resp.data as any
      const idx = services.value.findIndex(s => s.serviceType === name)
      const port = extractFirstHostPort(st.ports || {})
      const status = (st.status === 'parse_error' ? 'error' : st.status) as 'running'|'stopped'|'error'
      const card: Card = {
        serviceName: name === 'dify' ? 'Dify' : name === 'oneapi' ? 'OneAPI' : name === 'ragflow' ? 'RagFlow' : 'n8n',
        serviceDescription: descriptionMap[name],
        serviceType: name,
        status,
        cpuUsage: 0,
        memoryUsage: 0,
        port: port || '',
        uptime: ''
      }
      if (idx >= 0) services.value[idx] = card
      else services.value = normalizeServices([...services.value, card])
      // 重新规范化，防止重复，并更新圆点与计数、缓存
      services.value = normalizeServices(services.value)
      moduleStore.total = services.value.length
      moduleStore.running = services.value.filter(f => f.status === 'running').length
      for (const f of services.value) moduleStore.dots[f.serviceType] = f.status as any
      saveCache(services.value)
    }
    ;(window as any).api.on(IPC.ModuleStatusEvent, onStatus)
    // 组件卸载时清理监听，避免 MaxListenersExceededWarning
    onUnmounted(() => {
      try {
        (window as any).api.off?.(IPC.ModuleStatusEvent, onStatus)
        ;(window as any).api.removeListener?.(IPC.ModuleStatusEvent, onStatus)
      } catch {}
    })
  } catch {}

  // 3) 再拉一次最新状态覆盖
  await refreshStatus()
  // 首页常驻时改为 60s 轮询；非首页暂停
  // 初始定时器：根据当前路由决定频率
  const setTimer = () => {
    if (timer) { window.clearInterval(timer); timer = undefined as any }
    const isHome = ((route.name as string) || '').toLowerCase() === 'home'
    const interval = isHome ? 8000 : 60000
    timer = window.setInterval(() => {
      const nowIsHome = ((route.name as string) || '').toLowerCase() === 'home'
      if (nowIsHome) refreshStatus()
    }, interval)
  }
  setTimer()
  // 页面获得焦点/可见时，如果当前在首页，立即刷新一次，加速对命令行操作的反馈
  const onFast = () => {
    const isHome = ((route.name as string) || '').toLowerCase() === 'home'
    if (isHome) refreshStatus()
  }
  window.addEventListener('focus', onFast)
  document.addEventListener('visibilitychange', onFast)
  onUnmounted(() => {
    window.removeEventListener('focus', onFast)
    document.removeEventListener('visibilitychange', onFast)
  })
  // 监听路由变化，动态调整频率
  watch(() => route.name, () => setTimer())
})

onUnmounted(() => { if (timer) window.clearInterval(timer) })

async function handleRefresh() {
  try {
    isRefreshing.value = true
    // 所有模块先进入 loading
    services.value = services.value.map(s => ({
      ...s,
      serviceDescription: s.serviceDescription || descriptionMap[s.serviceType],
      status: 'loading'
    }))
    await refreshStatus()
  } finally {
    isRefreshing.value = false
  }
}
</script>

<template>
  <div class="home-view">
    <CarouselBanner />
    <OverviewCard :loading="isRefreshing" @refresh="handleRefresh" />
    
    <div class="services-section">
      <div class="services-grid">
        <ServiceCard
          v-for="service in services"
          :key="service.serviceType"
          :service-name="service.serviceName"
          :service-description="service.serviceDescription"
          :service-type="service.serviceType"
          :status="service.status"
          :cpu-usage="service.cpuUsage"
          :memory-usage="service.memoryUsage"
          :port="service.port"
          :uptime="service.uptime"
          @status-changed="refreshStatus"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view { padding: var(--spacing-lg); min-height: 100vh; }
.services-section { margin-top: var(--spacing-xl); }
.section-title { font-size: var(--text-2xl); font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-xl); text-align: center; }
.services-grid { display: grid; gap: 20px; padding: 16px; max-width: 1550px; margin: 0 auto; justify-content: center; grid-template-columns: repeat(3, 1fr); }
@media (max-width: 1440px) { .services-grid { grid-template-columns: repeat(2, 1fr); max-width: 1000px; gap: 20px; } }
@media (max-width: 1280px) { .services-grid { max-width: 900px; gap: 20px; } }
@media (min-width: 2200px) { .services-grid { grid-template-columns: repeat(4, 1fr); max-width: 2060px; gap: 24px; } }
@media (max-width: 768px) { .home-view { padding: var(--spacing-md); } .services-grid { grid-template-columns: 1fr; gap: var(--spacing-lg); max-width: 400px; } }
@media (max-width: 480px) { .services-grid { padding: 8px; max-width: calc(100vw - 32px); } }
</style>
