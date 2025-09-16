<template>
  <div class="monitoring-view">
    <div class="monitoring-header">
      <h1 class="monitoring-title">性能监控</h1>
      <div class="monitoring-controls">
        <a-select v-model:value="timeRange" style="width: 120px" @change="updateCharts">
          <a-select-option value="1h">1小时</a-select-option>
          <a-select-option value="6h">6小时</a-select-option>
          <a-select-option value="24h">24小时</a-select-option>
          <a-select-option value="7d">7天</a-select-option>
        </a-select>
        
        <a-button @click="refreshData" type="primary" class="action-button refresh-btn">
          <template #icon><reload-outlined /></template>
          刷新
        </a-button>
        
        <a-button @click="toggleFullscreen" :type="isFullscreen ? 'default' : 'primary'" class="action-button">
          <template #icon>
            <fullscreen-outlined v-if="!isFullscreen" />
            <fullscreen-exit-outlined v-else />
          </template>
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </a-button>
      </div>
    </div>
    
    <div class="monitoring-content">
      <a-row :gutter="[24, 24]">
        <a-col :xs="24" :lg="12">
          <a-card title="系统资源使用率" class="monitor-card glass-effect">
            <div class="metrics-overview">
              <div class="metric-item">
                <div class="metric-label">CPU 使用率</div>
                <div class="metric-progress">
                  <a-progress :percent="systemMetrics.cpu" :stroke-color="getProgressColor(systemMetrics.cpu)" :show-info="false" />
                  <span class="metric-value">{{ systemMetrics.cpu }}%</span>
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">内存使用率</div>
                <div class="metric-progress">
                  <a-progress :percent="systemMetrics.memory" :stroke-color="getProgressColor(systemMetrics.memory)" :show-info="false" />
                  <span class="metric-value">{{ systemMetrics.memory }}%</span>
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">磁盘使用率</div>
                <div class="metric-progress">
                  <a-progress :percent="systemMetrics.disk" :stroke-color="getProgressColor(systemMetrics.disk)" :show-info="false" />
                  <span class="metric-value">{{ systemMetrics.disk }}%</span>
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">网络流量</div>
                <div class="metric-progress">
                  <a-progress :percent="systemMetrics.network" :stroke-color="getProgressColor(systemMetrics.network)" :show-info="false" />
                  <span class="metric-value">{{ systemMetrics.networkSpeed }} MB/s</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
        
        <a-col :xs="24" :lg="12">
          <a-card title="服务状态监控" class="monitor-card glass-effect">
            <div class="services-status">
              <div v-for="service in servicesStatus" :key="service.name" class="service-status-item">
                <div class="service-info">
                  <span class="service-name">{{ service.name }}</span>
                  <span :class="['service-status', `status-${service.status}`]">{{ getStatusText(service.status) }}</span>
                </div>
                <div class="service-metrics">
                  <span class="metric">CPU: {{ service.cpu }}%</span>
                  <span class="metric">内存: {{ service.memory }}%</span>
                  <span class="metric">响应时间: {{ service.responseTime }}ms</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
        
        <a-col :xs="24" :lg="12">
          <a-card title="CPU 使用趋势" class="monitor-card glass-effect">
            <div class="chart-container">
              <div class="mock-chart cpu-chart">
                <div class="chart-line"></div>
                <div class="chart-points">
                  <div v-for="i in 20" :key="i" class="chart-point" :style="getPointStyle(i, 'cpu')"></div>
                </div>
                <div class="chart-labels">
                  <span>{{ getTimeLabel(-20) }}</span>
                  <span>{{ getTimeLabel(-10) }}</span>
                  <span>{{ getTimeLabel(0) }}</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
        
        <a-col :xs="24" :lg="12">
          <a-card title="内存使用趋势" class="monitor-card glass-effect">
            <div class="chart-container">
              <div class="mock-chart memory-chart">
                <div class="chart-line"></div>
                <div class="chart-points">
                  <div v-for="i in 20" :key="i" class="chart-point" :style="getPointStyle(i, 'memory')"></div>
                </div>
                <div class="chart-labels">
                  <span>{{ getTimeLabel(-20) }}</span>
                  <span>{{ getTimeLabel(-10) }}</span>
                  <span>{{ getTimeLabel(0) }}</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const timeRange = ref('1h')
const isFullscreen = ref(false)

const systemMetrics = ref({ cpu: 45, memory: 62, disk: 38, network: 25, networkSpeed: 12.5 })

const servicesStatus = ref([
  { name: 'n8n', status: 'running', cpu: 15, memory: 32, responseTime: 120 },
  { name: 'Dify', status: 'stopped', cpu: 0, memory: 0, responseTime: 0 },
  { name: 'OneAPI', status: 'running', cpu: 8, memory: 18, responseTime: 85 },
  { name: 'RagFlow', status: 'error', cpu: 0, memory: 0, responseTime: 0 }
])

let updateInterval: number

const getProgressColor = (v: number) => v < 50 ? '#52c41a' : v < 80 ? '#faad14' : '#ff4d4f'
const getStatusText = (s: string) => ({ running: '运行中', stopped: '已停止', error: '异常' } as any)[s] || '未知'
const getPointStyle = (i: number, t: string) => { const b = t === 'cpu' ? 45 : 62; const v = Math.max(0, Math.min(100, b + Math.sin(i * 0.3) * 15 + Math.random() * 10)); return { left: `${(i - 1) * 5}%`, bottom: `${v}%` } }
const getTimeLabel = (o: number) => { const n = new Date(); n.setMinutes(n.getMinutes() + o); return n.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
const updateCharts = () => { message.info(`已切换到 ${timeRange.value} 时间范围`) }
const refreshData = () => { systemMetrics.value = { cpu: Math.floor(Math.random()*100), memory: Math.floor(Math.random()*100), disk: Math.floor(Math.random()*100), network: Math.floor(Math.random()*100), networkSpeed: Math.floor(Math.random()*1000) }; servicesStatus.value.forEach(s => { if (s.status==='running'){ s.cpu=Math.floor(Math.random()*50); s.memory=Math.floor(Math.random()*80); s.responseTime=Math.floor(Math.random()*200)+50 } }); message.success('监控数据已刷新') }
const toggleFullscreen = () => { if (!document.fullscreenElement){ document.documentElement.requestFullscreen(); isFullscreen.value = true } else { document.exitFullscreen(); isFullscreen.value = false } }
const startAutoUpdate = () => { updateInterval = setInterval(() => { systemMetrics.value.cpu = Math.max(0, Math.min(100, systemMetrics.value.cpu + (Math.random()-0.5)*10)); systemMetrics.value.memory = Math.max(0, Math.min(100, systemMetrics.value.memory + (Math.random()-0.5)*5)); }, 3000) as unknown as number }

onMounted(() => { startAutoUpdate() })
onUnmounted(() => { if (updateInterval) clearInterval(updateInterval) })
</script>

<style scoped>
.monitoring-view { padding: var(--spacing-xl); min-height: 100vh; }
.monitoring-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl); }
.monitoring-title { font-size: var(--text-2xl); font-weight: 600; color: var(--text-primary); margin: 0; }
.monitoring-controls { display: flex; gap: var(--spacing-md); align-items: center; }
.monitor-card { border-radius: var(--radius-xl); border: 1px solid var(--border-light); box-shadow: var(--shadow-lg); height: 100%; }
.metrics-overview { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.metric-item { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.metric-label { font-size: var(--text-sm); color: var(--text-secondary); font-weight: 500; }
.metric-progress { display: flex; align-items: center; gap: var(--spacing-md); }
.metric-value { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); min-width: 50px; }
.services-status { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.service-status-item { padding: var(--spacing-md); border-radius: var(--radius-md); background: var(--bg-tertiary); border: 1px solid var(--border-light); }
.service-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); }
.service-name { font-weight: 600; color: var(--text-primary); }
.service-status { padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 500; }
.status-running { background-color: var(--success-color); color: var(--text-white); }
.status-stopped { background-color: var(--text-tertiary); color: var(--text-primary); }
.status-error { background-color: var(--error-color); color: var(--text-white); }
.service-metrics { display: flex; gap: var(--spacing-md); font-size: var(--text-xs); color: var(--text-secondary); }
.chart-container { height: 200px; position: relative; }
.mock-chart { width: 100%; height: 100%; position: relative; background: linear-gradient(to top, var(--bg-tertiary) 0%, transparent 100%); border-radius: var(--radius-md); overflow: hidden; }
.chart-line { position: absolute; inset: 0; background: linear-gradient(45deg, var(--primary-color), var(--info-color)); opacity: 0.1; clip-path: polygon(0% 70%, 10% 65%, 20% 60%, 30% 55%, 40% 50%, 50% 45%, 60% 40%, 70% 35%, 80% 30%, 90% 25%, 100% 20%, 100% 100%, 0% 100%); }
.chart-points { position: absolute; inset: 0; }
.chart-point { position: absolute; width: 6px; height: 6px; background: var(--primary-color); border-radius: 50%; box-shadow: 0 0 8px rgba(0, 122, 255, 0.5); transform: translate(-50%, 50%); }
.chart-labels { position: absolute; bottom: -20px; left: 0; right: 0; display: flex; justify-content: space-between; font-size: var(--text-xs); color: var(--text-secondary); }

@media (max-width: 768px) { .monitoring-view { padding: var(--spacing-lg); } .monitoring-header { flex-direction: column; gap: var(--spacing-md); align-items: stretch; } .monitoring-controls { justify-content: center; } .service-metrics { flex-direction: column; gap: var(--spacing-xs); } }
</style>
