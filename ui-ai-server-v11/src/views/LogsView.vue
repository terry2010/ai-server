<template>
  <div class="logs-view">
    <div class="logs-header">
      <h1 class="logs-title">系统日志</h1>
      <div class="logs-controls">
        <a-select v-model:value="logLevel" style="width: 120px" @change="filterLogs">
          <a-select-option value="all">全部</a-select-option>
          <a-select-option value="error">错误</a-select-option>
          <a-select-option value="warn">警告</a-select-option>
          <a-select-option value="info">信息</a-select-option>
          <a-select-option value="debug">调试</a-select-option>
        </a-select>
        
        <a-button @click="clearLogs" danger>
          <template #icon>
            <delete-outlined />
          </template>
          清空日志
        </a-button>
        
        <a-button @click="refreshLogs" type="primary">
          <template #icon>
            <reload-outlined />
          </template>
          刷新
        </a-button>
      </div>
    </div>
    
    <div class="logs-content">
      <a-card class="logs-card glass-effect">
        <div class="log-container">
          <div 
            v-for="log in filteredLogs" 
            :key="log.id"
            :class="['log-entry', `log-${log.level}`]"
          >
            <div class="log-time">{{ log.timestamp }}</div>
            <div class="log-level">{{ log.level.toUpperCase() }}</div>
            <div class="log-service">{{ log.service }}</div>
            <div class="log-message">{{ log.message }}</div>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

interface LogEntry {
  id: number
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  service: string
  message: string
}

const logLevel = ref('all')
const logs = ref<LogEntry[]>([])

// 模拟日志数据
const generateMockLogs = () => {
  const services = ['n8n', 'dify', 'oneapi', 'ragflow', 'system']
  const levels: LogEntry['level'][] = ['error', 'warn', 'info', 'debug']
  const messages = [
    '服务启动成功',
    '数据库连接建立',
    '用户认证失败',
    '内存使用率过高',
    'API 请求处理完成',
    '配置文件加载失败',
    '定时任务执行',
    '缓存清理完成',
    '网络连接超时',
    '文件上传成功'
  ]

  const mockLogs: LogEntry[] = []
  for (let i = 0; i < 50; i++) {
    const now = new Date()
    now.setMinutes(now.getMinutes() - i * 2)
    
    mockLogs.push({
      id: i + 1,
      timestamp: now.toLocaleString('zh-CN'),
      level: levels[Math.floor(Math.random() * levels.length)],
      service: services[Math.floor(Math.random() * services.length)],
      message: messages[Math.floor(Math.random() * messages.length)]
    })
  }
  
  return mockLogs.sort((a, b) => b.id - a.id)
}

const filteredLogs = computed(() => {
  if (logLevel.value === 'all') {
    return logs.value
  }
  return logs.value.filter(log => log.level === logLevel.value)
})

const filterLogs = () => {
  message.info(`已筛选 ${logLevel.value} 级别日志`)
}

const clearLogs = () => {
  logs.value = []
  message.success('日志已清空')
}

const refreshLogs = () => {
  logs.value = generateMockLogs()
  message.success('日志已刷新')
}

onMounted(() => {
  logs.value = generateMockLogs()
})
</script>

<style scoped>
.logs-view {
  padding: var(--spacing-xl);
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.logs-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.logs-controls {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.logs-content {
  flex: 1;
  overflow: hidden;
}

.logs-card {
  height: 100%;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
}

.log-container {
  height: calc(100vh - 200px);
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.log-entry {
  display: grid;
  grid-template-columns: 180px 80px 100px 1fr;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  transition: background-color var(--transition-base);
}

.log-entry:hover {
  background-color: var(--bg-tertiary);
}

.log-time {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.log-level {
  font-weight: 600;
  text-align: center;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.log-error .log-level {
  background-color: var(--error-color);
  color: var(--text-white);
}

.log-warn .log-level {
  background-color: var(--warning-color);
  color: var(--text-white);
}

.log-info .log-level {
  background-color: var(--info-color);
  color: var(--text-white);
}

.log-debug .log-level {
  background-color: var(--text-tertiary);
  color: var(--text-primary);
}

.log-service {
  color: var(--primary-color);
  font-weight: 500;
}

.log-message {
  color: var(--text-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .logs-view {
    padding: var(--spacing-lg);
  }
  
  .logs-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }
  
  .logs-controls {
    justify-content: center;
  }
  
  .log-entry {
    grid-template-columns: 1fr;
    gap: var(--spacing-xs);
  }
  
  .log-container {
    height: calc(100vh - 250px);
  }
}
</style>
