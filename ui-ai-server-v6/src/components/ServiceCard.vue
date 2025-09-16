<template>
  <div :class="['service-card', 'card-hover', service.status]">
    <div class="card-header">
      <div class="service-info">
        <div class="service-icon">{{ service.icon }}</div>
        <div class="service-details">
          <h4 class="service-name">{{ service.displayName }}</h4>
          <p class="service-description">{{ service.description }}</p>
        </div>
      </div>
      <div class="status-indicator">
        <a-badge 
          :status="getBadgeStatus(service.status)" 
          :text="getStatusText(service.status)"
        />
      </div>
    </div>
    
    <div class="card-content">
      <!-- 性能指标 -->
      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-label">CPU使用率</div>
          <div class="metric-value">
            <a-progress 
              :percent="getCpuPercent(service.metrics.cpu)" 
              size="small"
              :stroke-color="getProgressColor(getCpuPercent(service.metrics.cpu))"
              :show-info="false"
            />
            <span class="metric-text">{{ service.metrics.cpu }}</span>
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">内存使用</div>
          <div class="metric-value">
            <span class="metric-text">{{ service.metrics.memory }}</span>
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">运行时间</div>
          <div class="metric-value">
            <span class="metric-text">{{ service.metrics.uptime }}</span>
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">请求数量</div>
          <div class="metric-value">
            <span class="metric-text">{{ formatNumber(service.metrics.requests) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 服务地址 -->
      <div class="service-url" v-if="service.status === 'running'">
        <a-typography-text copyable :content="service.url">
          <a :href="service.url" target="_blank" class="url-link">
            {{ service.url }}
            <LinkOutlined />
          </a>
        </a-typography-text>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="action-buttons">
        <a-button-group>
          <a-button 
            v-if="service.status === 'stopped' || service.status === 'error'"
            type="primary" 
            size="small"
            @click="$emit('start', service.id)"
            :loading="service.status === 'starting'"
          >
            <template #icon>
              <PlayCircleOutlined />
            </template>
            启动
          </a-button>
          
          <a-button 
            v-if="service.status === 'running'"
            danger 
            size="small"
            @click="$emit('stop', service.id)"
            :loading="service.status === 'stopping'"
          >
            <template #icon>
              <PauseCircleOutlined />
            </template>
            停止
          </a-button>
          
          <a-button 
            v-if="service.status === 'running'"
            size="small"
            @click="$emit('restart', service.id)"
          >
            <template #icon>
              <ReloadOutlined />
            </template>
            重启
          </a-button>
          
          <a-button 
            size="small"
            @click="$emit('view-details', service.id)"
          >
            <template #icon>
              <SettingOutlined />
            </template>
            详情
          </a-button>
        </a-button-group>
      </div>
      
      <div class="last-updated">
        <a-typography-text type="secondary" style="font-size: 12px;">
          更新于 {{ formatTime(service.lastUpdated) }}
        </a-typography-text>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  LinkOutlined
} from '@ant-design/icons-vue'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// Props
const props = defineProps({
  service: {
    type: Object,
    required: true
  }
})

// Emits
defineEmits(['start', 'stop', 'restart', 'view-details'])

// 方法
const getBadgeStatus = (status) => {
  const statusMap = {
    running: 'processing',
    stopped: 'default',
    error: 'error',
    starting: 'processing',
    stopping: 'warning'
  }
  return statusMap[status] || 'default'
}

const getStatusText = (status) => {
  const statusMap = {
    running: '运行中',
    stopped: '已停止',
    error: '异常',
    starting: '启动中',
    stopping: '停止中'
  }
  return statusMap[status] || '未知'
}

const getCpuPercent = (cpuStr) => {
  return parseInt(cpuStr.replace('%', '')) || 0
}

const getProgressColor = (percent) => {
  if (percent < 30) return '#52c41a'
  if (percent < 70) return '#faad14'
  return '#ff4d4f'
}

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatTime = (time) => {
  return dayjs(time).fromNow()
}
</script>

<style scoped>
.service-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-medium);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.service-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--status-stopped);
  transition: background-color 0.3s ease;
}

.service-card.running::before {
  background: var(--status-running);
}

.service-card.error::before {
  background: var(--status-error);
}

.service-card.starting::before,
.service-card.stopping::before {
  background: var(--status-warning);
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-heavy);
  border-color: var(--border-hover);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.service-info {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
}

.service-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.service-details {
  flex: 1;
  min-width: 0;
}

.service-name {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.service-description {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.status-indicator {
  flex-shrink: 0;
}

.card-content {
  margin-bottom: var(--spacing-lg);
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.metric-label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.metric-value {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.metric-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.service-url {
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
}

.url-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--primary-color);
  text-decoration: none;
  font-size: 14px;
}

.url-link:hover {
  color: var(--primary-hover);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.action-buttons {
  flex: 1;
}

.last-updated {
  flex-shrink: 0;
  margin-left: var(--spacing-md);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-card {
    padding: var(--spacing-md);
  }
  
  .card-header {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .service-info {
    width: 100%;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .card-footer {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }
  
  .last-updated {
    margin-left: 0;
    text-align: center;
  }
}

/* 加载状态动画 */
.service-card.starting .service-icon,
.service-card.stopping .service-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 状态特定样式 */
.service-card.running {
  border-color: rgba(24, 144, 255, 0.3);
}

.service-card.running .service-name {
  color: var(--primary-color);
}

.service-card.error {
  border-color: rgba(255, 77, 79, 0.3);
}

.service-card.error .service-name {
  color: var(--status-error);
}

.service-card.stopped {
  opacity: 0.8;
}

.service-card.stopped .service-name {
  color: var(--text-secondary);
}
</style>