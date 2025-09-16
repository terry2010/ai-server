<template>
  <div class="service-view">
    <div class="service-header">
      <div class="header-content">
        <div class="service-info">
          <div class="service-icon">📚</div>
          <div class="service-details">
            <h1 class="service-title">RagFlow 知识库</h1>
            <p class="service-description">基于深度文档理解的RAG引擎，智能知识管理</p>
          </div>
        </div>
        <div class="service-status">
          <a-badge :status="getBadgeStatus(service?.status)" :text="getStatusText(service?.status)" />
        </div>
      </div>
    </div>
    
    <div class="service-content">
      <a-row :gutter="24">
        <a-col :span="16">
          <a-card title="服务控制" class="control-card">
            <div class="control-section">
              <div class="control-buttons">
                <a-space size="large">
                  <a-button 
                    type="primary" 
                    size="large"
                    :loading="service?.status === 'starting'"
                    @click="handleStart"
                    v-if="service?.status === 'stopped' || service?.status === 'error'"
                  >
                    <template #icon><PlayCircleOutlined /></template>
                    启动服务
                  </a-button>
                  
                  <a-button 
                    danger 
                    size="large"
                    :loading="service?.status === 'stopping'"
                    @click="handleStop"
                    v-if="service?.status === 'running'"
                  >
                    <template #icon><PauseCircleOutlined /></template>
                    停止服务
                  </a-button>
                  
                  <a-button 
                    size="large"
                    @click="handleRestart"
                    v-if="service?.status === 'running'"
                  >
                    <template #icon><ReloadOutlined /></template>
                    重启服务
                  </a-button>
                  
                  <a-button 
                    size="large"
                    @click="openService"
                    v-if="service?.status === 'running'"
                  >
                    <template #icon><LinkOutlined /></template>
                    打开界面
                  </a-button>
                </a-space>
              </div>
              
              <div class="service-url" v-if="service?.status === 'running'">
                <a-typography-text copyable :content="service?.url">
                  服务地址: {{ service?.url }}
                </a-typography-text>
              </div>
            </div>
          </a-card>
        </a-col>
        
        <a-col :span="8">
          <a-card title="性能监控" class="metrics-card">
            <div class="metrics-list">
              <div class="metric-item">
                <div class="metric-label">CPU使用率</div>
                <div class="metric-value">
                  <a-progress :percent="getCpuPercent(service?.metrics?.cpu)" />
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">内存使用</div>
                <div class="metric-value">{{ service?.metrics?.memory }}</div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">运行时间</div>
                <div class="metric-value">{{ service?.metrics?.uptime }}</div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">请求数量</div>
                <div class="metric-value">{{ service?.metrics?.requests }}</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useServicesStore } from '../stores/services'
import { message } from 'ant-design-vue'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  LinkOutlined
} from '@ant-design/icons-vue'

const servicesStore = useServicesStore()
const service = computed(() => servicesStore.getServiceById('ragflow'))

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
  return parseInt(cpuStr?.replace('%', '')) || 0
}

const handleStart = async () => {
  await servicesStore.startService('ragflow')
  message.success('正在启动 RagFlow 服务...')
}

const handleStop = async () => {
  await servicesStore.stopService('ragflow')
  message.success('正在停止 RagFlow 服务...')
}

const handleRestart = async () => {
  await servicesStore.restartService('ragflow')
  message.success('正在重启 RagFlow 服务...')
}

const openService = () => {
  window.open(service.value?.url, '_blank')
}
</script>

<style scoped>
.service-view {
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.service-header {
  margin-bottom: var(--spacing-lg);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-medium);
}

.service-info {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.service-icon {
  font-size: 48px;
}

.service-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.service-description {
  margin: 0;
  color: var(--text-secondary);
}

.control-card,
.metrics-card {
  margin-bottom: var(--spacing-lg);
}

.control-section {
  text-align: center;
}

.control-buttons {
  margin-bottom: var(--spacing-lg);
}

.service-url {
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.metric-value {
  font-weight: 600;
  color: var(--text-primary);
}
</style>