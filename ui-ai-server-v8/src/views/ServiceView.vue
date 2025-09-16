<template>
  <div class="service-view">
    <div class="service-header">
      <div class="service-info">
        <div class="service-icon">{{ serviceConfig.icon }}</div>
        <div class="service-details">
          <h1 class="service-title">{{ serviceConfig.name }}</h1>
          <p class="service-description">{{ serviceConfig.description }}</p>
        </div>
      </div>
      <div class="service-controls">
        <a-button 
          v-if="serviceStatus === 'stopped'" 
          type="primary" 
          size="large"
          @click="startService"
        >
          <template #icon>
            <PlayCircleOutlined />
          </template>
          启动服务
        </a-button>
        <a-button 
          v-else-if="serviceStatus === 'running'" 
          danger 
          size="large"
          @click="stopService"
        >
          <template #icon>
            <PauseCircleOutlined />
          </template>
          停止服务
        </a-button>
        <a-button 
          v-else 
          type="default" 
          size="large"
          @click="restartService"
        >
          <template #icon>
            <ReloadOutlined />
          </template>
          重启服务
        </a-button>
      </div>
    </div>

    <div class="service-content">
      <a-row :gutter="24">
        <a-col :span="8">
          <div class="status-card">
            <h3>服务状态</h3>
            <div :class="['status-display', serviceStatus]">
              <span class="status-dot"></span>
              <span class="status-text">{{ getStatusText(serviceStatus) }}</span>
            </div>
            <div class="metrics-grid">
              <div class="metric">
                <span class="metric-label">CPU使用率</span>
                <span class="metric-value">{{ metrics.cpu }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">内存使用</span>
                <span class="metric-value">{{ metrics.memory }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">运行时间</span>
                <span class="metric-value">{{ metrics.uptime }}</span>
              </div>
            </div>
          </div>
        </a-col>
        
        <a-col :span="16">
          <div class="config-card">
            <h3>服务配置</h3>
            <a-form layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="服务端口">
                    <a-input-number 
                      v-model:value="config.port" 
                      :min="1000" 
                      :max="65535" 
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="数据库类型">
                    <a-select v-model:value="config.database" style="width: 100%">
                      <a-select-option value="sqlite">SQLite</a-select-option>
                      <a-select-option value="mysql">MySQL</a-select-option>
                      <a-select-option value="postgres">PostgreSQL</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="环境变量">
                <a-textarea 
                  v-model:value="config.env" 
                  :rows="4" 
                  placeholder="KEY=VALUE"
                />
              </a-form-item>
              <a-form-item>
                <a-space>
                  <a-button type="primary" @click="saveConfig">保存配置</a-button>
                  <a-button @click="resetConfig">重置</a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined 
} from '@ant-design/icons-vue'

interface Props {
  service: string
}

const props = defineProps<Props>()

const serviceConfigs = {
  n8n: {
    name: 'n8n',
    description: '工作流自动化平台',
    icon: '🔄'
  },
  dify: {
    name: 'Dify',
    description: 'LLM应用开发平台',
    icon: '🤖'
  },
  oneapi: {
    name: 'OneAPI',
    description: 'API统一管理网关',
    icon: '🔌'
  },
  ragflow: {
    name: 'RagFlow',
    description: 'RAG知识库系统',
    icon: '📚'
  }
}

const serviceConfig = computed(() => 
  serviceConfigs[props.service as keyof typeof serviceConfigs]
)

const serviceStatus = ref('running')
const metrics = ref({
  cpu: '15%',
  memory: '256MB',
  uptime: '2h 30m'
})

const config = ref({
  port: 5678,
  database: 'sqlite',
  env: 'NODE_ENV=production\nDEBUG=false'
})

const getStatusText = (status: string) => {
  const statusMap = {
    running: '运行中',
    stopped: '已停止',
    error: '异常'
  }
  return statusMap[status as keyof typeof statusMap] || '未知'
}

const startService = () => {
  console.log('启动服务:', props.service)
  serviceStatus.value = 'running'
}

const stopService = () => {
  console.log('停止服务:', props.service)
  serviceStatus.value = 'stopped'
}

const restartService = () => {
  console.log('重启服务:', props.service)
  serviceStatus.value = 'running'
}

const saveConfig = () => {
  console.log('保存配置:', config.value)
}

const resetConfig = () => {
  config.value = {
    port: 5678,
    database: 'sqlite',
    env: 'NODE_ENV=production\nDEBUG=false'
  }
}
</script>

<style scoped>
.service-view {
  padding: 24px;
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.service-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.service-icon {
  font-size: 48px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.service-title {
  font-size: 32px;
  font-weight: 700;
  color: #262626;
  margin: 0 0 8px 0;
}

.service-description {
  font-size: 16px;
  color: #8c8c8c;
  margin: 0;
}

.service-controls .ant-btn {
  height: 48px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
}

.service-content {
  margin-top: 24px;
}

.status-card, .config-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  height: 100%;
}

.status-card h3, .config-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 24px 0;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
  font-size: 16px;
  font-weight: 600;
}

.status-display.running {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.status-display.stopped {
  background: rgba(140, 140, 140, 0.1);
  color: #8c8c8c;
}

.status-display.error {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
}

.status-display.running .status-dot {
  animation: pulse 2s infinite;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.metric-label {
  font-size: 14px;
  color: #8c8c8c;
  font-weight: 500;
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.ant-form-item {
  margin-bottom: 16px;
}

.ant-btn {
  border-radius: 8px;
  font-weight: 500;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 8px currentColor;
  }
  50% {
    box-shadow: 0 0 16px currentColor;
  }
  100% {
    box-shadow: 0 0 8px currentColor;
  }
}
</style>