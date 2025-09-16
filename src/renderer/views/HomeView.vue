<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CarouselBanner from '../components/CarouselBanner.vue'
import OverviewCard from '../components/OverviewCard.vue'
import ServiceCard from '../components/ServiceCard.vue'
import { listModules, getModuleStatus } from '../services/ipc'
import { moduleStore } from '../stores/modules'

type ServiceType = 'n8n' | 'dify' | 'oneapi' | 'ragflow'
type Card = { serviceName: string; serviceDescription: string; serviceType: ServiceType; status: 'running'|'stopped'|'error'|'loading'; cpuUsage: number; memoryUsage: number; port: string; uptime: string }

const descriptionMap: Record<ServiceType, string> = {
  n8n: '工作流自动化平台，用于连接各种应用和服务',
  dify: 'AI 应用开发平台，快速构建和部署 AI 应用',
  oneapi: 'OpenAI API 代理服务，统一管理多个 AI 模型接口',
  ragflow: 'RAG 知识库问答系统，基于文档的智能问答'
}

const order: ServiceType[] = ['n8n', 'dify', 'oneapi', 'ragflow']

const services = ref<Card[]>([])
let timer: number | undefined

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
    // 按预设顺序排序
    services.value = order
      .filter(n => full.some(f => f.serviceType === n))
      .map(n => full.find(f => f.serviceType === n)!)
    // 更新全局模块状态点与计数
    moduleStore.total = full.length
    moduleStore.running = full.filter(f => f.status === 'running').length
    for (const f of full) moduleStore.dots[f.serviceType] = f.status as any
  } catch (e) {
    // 静默，首页可继续展示已有数据
    console.warn('refreshStatus error', e)
  }
}

onMounted(async () => {
  await refreshStatus()
  timer = window.setInterval(refreshStatus, 8000)
})

onUnmounted(() => { if (timer) window.clearInterval(timer) })
</script>

<template>
  <div class="home-view">
    <CarouselBanner />
    <OverviewCard @refresh="refreshStatus" />
    
    <div class="services-section">
      <div class="services-grid">
        <ServiceCard
          v-for="service in services"
          :key="service.serviceName"
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
