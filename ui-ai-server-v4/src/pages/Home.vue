<template>
  <div style="height: 100%; display:flex; flex-direction: column;">
    <!-- 顶部 Tab -->
    <TopTabs :tabs="tabs" :activeKey="activeTab" @change="onTabChange" />

    <div style="flex:1; display:flex; padding: 16px; gap: 16px;">
      <!-- 左侧菜单 -->
      <LeftMenu v-model="activeMenu" :items="menuItems" />

      <!-- 右侧主内容 -->
      <div style="flex:1; display:flex; flex-direction: column; gap: 16px;">
        <!-- Banner -->
        <HeroBanner />

        <!-- 服务卡片网格 -->
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
          <ServiceCard
            v-for="svc in services"
            :key="svc.name"
            :name="svc.name"
            :status="svc.status"
            :metrics="svc.metrics"
            @start="svc.status='running'"
            @stop="svc.status='stopped'"
            @restart="svc.status='running'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TopTabs from '../components/TopTabs.vue'
import LeftMenu from '../components/LeftMenu.vue'
import HeroBanner from '../components/HeroBanner.vue'
import ServiceCard from '../components/ServiceCard.vue'
import { useRouter } from 'vue-router'

type ServiceStatus = 'running' | 'stopped' | 'error'

const router = useRouter()

const tabs = [
  { key: 'home', label: '首页' },
  { key: 'n8n', label: 'n8n', status: 'running' as ServiceStatus },
  { key: 'Dify', label: 'Dify', status: 'running' as ServiceStatus },
  { key: 'OneAPI', label: 'OneAPI', status: 'stopped' as ServiceStatus },
  { key: 'RagFlow', label: 'RagFlow', status: 'running' as ServiceStatus }
]
const activeTab = ref('home')
function onTabChange(key: string) {
  activeTab.value = key
  if (key !== 'home') router.push('/' + key.toLowerCase())
}

const menuItems = [
  { key: 'sys', label: '系统设置', emoji: '⚙️' },
  { key: 'n8n', label: 'n8n 设置', emoji: '🔧' },
  { key: 'dify', label: 'Dify 设置', emoji: '🛠️' },
  { key: 'oneapi', label: 'OneAPI 设置', emoji: '⚡' }
]
const activeMenu = ref('sys')

const services = ref([
  { name: 'n8n', status: 'running' as ServiceStatus, metrics: { cpu: '12%', memory: '220MB', uptime: '2h 30m' } },
  { name: 'Dify', status: 'running' as ServiceStatus, metrics: { cpu: '18%', memory: '512MB', uptime: '1h 12m' } },
  { name: 'OneAPI', status: 'stopped' as ServiceStatus, metrics: { cpu: '—', memory: '—', uptime: '—' } },
  { name: 'RagFlow', status: 'running' as ServiceStatus, metrics: { cpu: '9%', memory: '180MB', uptime: '3h 02m' } }
])
</script>
