<template>
  <div class="service-card glass-effect card-shadow" :class="{ 'card-running': isRunning }">
    <div class="card-header">
      <div class="service-info">
        <div class="service-icon">
          <component :is="serviceIcon" :style="{ color: iconColor }" />
        </div>
        <div class="service-details">
          <h3 class="service-name">{{ serviceName }}</h3>
          <p class="service-description">{{ serviceDescription }}</p>
        </div>
      </div>
      <div class="status-section">
        <span :class="['status-indicator', statusClass]"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>
    
    <div class="card-content">
      <div class="metrics-grid">
        <div class="metric-item">
          <span class="metric-label">CPU</span>
          <div class="metric-bar">
            <div class="metric-fill" :style="{ width: `${cpuUsage}%` }"></div>
          </div>
          <span class="metric-value">{{ cpuUsage }}%</span>
        </div>
        
        <div class="metric-item">
          <span class="metric-label">内存</span>
          <div class="metric-bar">
            <div class="metric-fill" :style="{ width: `${memoryUsage}%` }"></div>
          </div>
          <span class="metric-value">{{ memoryUsage }}%</span>
        </div>
        
        <div class="metric-item">
          <span class="metric-label">端口</span>
          <span class="metric-value port-value">{{ port }}</span>
        </div>
        
        <div class="metric-item">
          <span class="metric-label">运行时间</span>
          <span class="metric-value">{{ uptime }}</span>
        </div>
      </div>
    </div>
    
    <div class="card-actions">
      <a-button 
        v-if="!isRunning" 
        type="primary" 
        :loading="isLoading"
        @click="startService"
        class="action-button start-btn"
      >
        <template #icon>
          <play-circle-outlined />
        </template>
        启动
      </a-button>
      
      <a-button 
        v-else 
        danger 
        :loading="isLoading"
        @click="stopService"
        class="action-button stop-btn"
      >
        <template #icon>
          <pause-circle-outlined />
        </template>
        停止
      </a-button>
      
      <a-button @click="openService" class="action-button">
        <template #icon>
          <link-outlined />
        </template>
        打开
      </a-button>
      
      <a-button @click="viewLogs" class="action-button">
        <template #icon>
          <file-text-outlined />
        </template>
        日志
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  LinkOutlined,
  FileTextOutlined,
  ApiOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  DeploymentUnitOutlined
} from '@ant-design/icons-vue'

interface Props {
  serviceName: string
  serviceDescription: string
  serviceType: 'n8n' | 'dify' | 'oneapi' | 'ragflow'
  status: 'running' | 'stopped' | 'error'
  cpuUsage: number
  memoryUsage: number
  port: string
  uptime: string
}

const props = defineProps<Props>()
const isLoading = ref(false)

const isRunning = computed(() => props.status === 'running')
const statusClass = computed(() => `status-${props.status}`)

const statusText = computed(() => {
  switch (props.status) {
    case 'running': return '运行中'
    case 'stopped': return '已停止'
    case 'error': return '异常'
    default: return '未知'
  }
})

const serviceIcon = computed(() => {
  switch (props.serviceType) {
    case 'n8n': return ApiOutlined
    case 'dify': return RobotOutlined
    case 'oneapi': return ThunderboltOutlined
    case 'ragflow': return DeploymentUnitOutlined
    default: return ApiOutlined
  }
})

const iconColor = computed(() => {
  switch (props.serviceType) {
    case 'n8n': return '#FF6D6D'
    case 'dify': return '#722ED1'
    case 'oneapi': return '#FA8C16'
    case 'ragflow': return '#13C2C2'
    default: return 'var(--primary-color)'
  }
})

const startService = async () => {
  isLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log(`启动 ${props.serviceName} 服务`)
  } finally {
    isLoading.value = false
  }
}

const stopService = async () => {
  isLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log(`停止 ${props.serviceName} 服务`)
  } finally {
    isLoading.value = false
  }
}

const openService = () => {
  window.open(`http://localhost:${props.port}`, '_blank')
}

const viewLogs = () => {
  console.log(`查看 ${props.serviceName} 日志`)
}
</script>

<style scoped>
.service-card { width: 100%; height: 280px; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: var(--spacing-md); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; position: relative; overflow: hidden; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); }
.service-card:hover { transform: translateY(-4px); box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12); }
.service-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--primary-color), var(--primary-hover)); opacity: 0; transition: opacity var(--transition-base); }
.service-card:hover::before { opacity: 1; }
.card-running::before { opacity: 1; background: linear-gradient(90deg, #52c41a, #40a9ff, #52c41a); background-size: 200% 100%; animation: flowingLight 3s ease-in-out infinite; }
@keyframes flowingLight { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.service-info { display: flex; gap: var(--spacing-md); flex: 1; }
.service-icon { width: 48px; height: 48px; border-radius: var(--radius-lg); background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.12), inset -2px -2px 6px rgba(255, 255, 255, 0.6); border: 1px solid rgba(0, 0, 0, 0.06); transition: all var(--transition-base); }
.service-details { flex: 1; }
.service-name { font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); margin: 0 0 var(--spacing-xs) 0; }
.service-description { font-size: var(--text-sm); color: var(--text-secondary); margin: 0; line-height: 1.4; }

.status-section { display: flex; align-items: center; gap: var(--spacing-xs); }
.status-text { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); }

.card-content { flex: 1; }
.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
.metric-item { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.metric-label { font-size: var(--text-xs); color: var(--text-secondary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.metric-bar { height: 4px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden; }
.metric-fill { height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--primary-hover)); border-radius: 2px; transition: width var(--transition-base); }
.metric-value { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
.port-value { font-family: var(--font-mono); background: var(--bg-tertiary); padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--text-xs); }

.card-actions { display: flex; gap: var(--spacing-sm); padding-top: var(--spacing-md); border-top: 1px solid var(--border-light); }
.action-button { flex: 1; border-radius: var(--radius-md); font-weight: 500; transition: all var(--transition-base); font-size: var(--text-sm); height: 36px; position: relative; overflow: hidden; }
.action-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s; }
.action-button:hover::before { left: 100%; }
.action-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); }
.start-btn { background: linear-gradient(135deg, var(--success-color) 0%, #40a9ff 100%); border: none; color: var(--text-white) !important; box-shadow: 0 0 20px rgba(0, 122, 255, 0.3); }
.stop-btn { background: linear-gradient(135deg, var(--error-color) 0%, #ff7875 100%); border: none; color: var(--text-white) !important; box-shadow: 0 0 20px rgba(255, 59, 48, 0.3); }

/* 响应式 */
@media (max-width: 768px) {
  .service-card { height: auto; min-height: 240px; }
  .metrics-grid { grid-template-columns: 1fr; }
  .card-actions { flex-direction: column; }
}
</style>
