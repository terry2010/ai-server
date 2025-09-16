<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1 class="page-title">系统设置</h1>
      <p class="page-description">管理AI-Server平台的全局配置和系统参数</p>
    </div>
    
    <div class="settings-content">
      <a-row :gutter="24">
        <a-col :span="16">
          <a-card title="基础设置" class="settings-card">
            <a-form layout="vertical">
              <a-form-item label="平台名称">
                <a-input v-model:value="settings.platformName" placeholder="请输入平台名称" />
              </a-form-item>
              
              <a-form-item label="管理员邮箱">
                <a-input v-model:value="settings.adminEmail" placeholder="请输入管理员邮箱" />
              </a-form-item>
              
              <a-form-item label="自动启动服务">
                <a-checkbox-group v-model:value="settings.autoStart">
                  <a-checkbox value="n8n">n8n</a-checkbox>
                  <a-checkbox value="dify">Dify</a-checkbox>
                  <a-checkbox value="oneapi">OneAPI</a-checkbox>
                  <a-checkbox value="ragflow">RagFlow</a-checkbox>
                </a-checkbox-group>
              </a-form-item>
              
              <a-form-item label="监控刷新间隔">
                <a-select v-model:value="settings.refreshInterval" style="width: 200px">
                  <a-select-option :value="1000">1秒</a-select-option>
                  <a-select-option :value="5000">5秒</a-select-option>
                  <a-select-option :value="10000">10秒</a-select-option>
                  <a-select-option :value="30000">30秒</a-select-option>
                </a-select>
              </a-form-item>
              
              <a-form-item>
                <a-space>
                  <a-button type="primary" @click="saveSettings">保存设置</a-button>
                  <a-button @click="resetSettings">重置</a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>
        
        <a-col :span="8">
          <a-card title="系统信息" class="info-card">
            <div class="info-list">
              <div class="info-item">
                <div class="info-label">平台版本</div>
                <div class="info-value">v1.0.0</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Node.js版本</div>
                <div class="info-value">v18.17.0</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">系统时间</div>
                <div class="info-value">{{ currentTime }}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">运行时长</div>
                <div class="info-value">2小时30分钟</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

const settings = ref({
  platformName: 'AI-Server管理平台',
  adminEmail: 'admin@example.com',
  autoStart: ['n8n', 'dify'],
  refreshInterval: 5000
})

const currentTime = ref('')
let timeInterval = null

const updateTime = () => {
  currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

const saveSettings = () => {
  message.success('设置已保存')
}

const resetSettings = () => {
  settings.value = {
    platformName: 'AI-Server管理平台',
    adminEmail: 'admin@example.com',
    autoStart: ['n8n', 'dify'],
    refreshInterval: 5000
  }
  message.info('设置已重置')
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.settings-view {
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.page-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.settings-content {
  margin-bottom: var(--spacing-lg);
}

.settings-card,
.info-card {
  margin-bottom: var(--spacing-lg);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.info-value {
  font-weight: 600;
  color: var(--text-primary);
}
</style>