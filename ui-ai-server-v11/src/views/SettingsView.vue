<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1 class="settings-title">{{ getSettingsTitle() }}</h1>
      <p class="settings-subtitle">{{ getSettingsSubtitle() }}</p>
    </div>
    
    <div class="settings-content">
      <a-card class="settings-card glass-effect">
        <template v-if="settingsType === 'system'">
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="系统名称">
                  <a-input v-model:value="systemSettings.name" placeholder="AI-Server 管理平台" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="系统端口">
                  <a-input-number v-model:value="systemSettings.port" :min="1000" :max="65535" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="日志级别">
                  <a-select v-model:value="systemSettings.logLevel">
                    <a-select-option value="debug">Debug</a-select-option>
                    <a-select-option value="info">Info</a-select-option>
                    <a-select-option value="warn">Warning</a-select-option>
                    <a-select-option value="error">Error</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="自动启动">
                  <a-switch v-model:checked="systemSettings.autoStart" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </template>
        
        <template v-else-if="settingsType === 'n8n'">
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="服务端口">
                  <a-input-number v-model:value="serviceSettings.port" :min="1000" :max="65535" style="width: 100%" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="数据库URL">
                  <a-input v-model:value="serviceSettings.dbUrl" placeholder="postgresql://..." />
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-form-item label="环境变量">
              <a-textarea v-model:value="serviceSettings.env" :rows="6" placeholder="NODE_ENV=production&#10;N8N_BASIC_AUTH_ACTIVE=true" />
            </a-form-item>
          </a-form>
        </template>
        
        <template v-else>
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="服务端口">
                  <a-input-number v-model:value="serviceSettings.port" :min="1000" :max="65535" style="width: 100%" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="API密钥">
                  <a-input-password v-model:value="serviceSettings.apiKey" placeholder="输入API密钥" />
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-form-item label="配置文件">
              <a-textarea v-model:value="serviceSettings.config" :rows="8" placeholder="配置内容..." />
            </a-form-item>
          </a-form>
        </template>
        
        <div class="settings-actions">
          <a-button type="primary" size="large" @click="saveSettings" class="action-button save-btn">
            <template #icon>
              <save-outlined />
            </template>
            保存设置
          </a-button>
          
          <a-button size="large" @click="resetSettings" class="action-button refresh-btn">
            <template #icon>
              <reload-outlined />
            </template>
            重置
          </a-button>
          
          <a-button size="large" @click="testConnection" class="action-button">
            <template #icon>
              <api-outlined />
            </template>
            测试连接
          </a-button>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  SaveOutlined,
  ReloadOutlined,
  ApiOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const route = useRoute()

const settingsType = computed(() => route.params.type as string)

const systemSettings = ref({
  name: 'AI-Server 管理平台',
  port: 8080,
  logLevel: 'info',
  autoStart: true
})

const serviceSettings = ref({
  port: 5678,
  dbUrl: 'postgresql://localhost:5432/n8n',
  apiKey: '',
  env: 'NODE_ENV=production\nN8N_BASIC_AUTH_ACTIVE=true',
  config: ''
})

const getSettingsTitle = () => {
  const titles = {
    'system': '系统设置',
    'n8n': 'n8n 设置',
    'dify': 'Dify 设置',
    'oneapi': 'OneAPI 设置',
    'ragflow': 'RagFlow 设置'
  }
  return titles[settingsType.value as keyof typeof titles] || '设置'
}

const getSettingsSubtitle = () => {
  const subtitles = {
    'system': '配置系统全局参数和行为',
    'n8n': '配置 n8n 工作流自动化平台',
    'dify': '配置 Dify AI 应用开发平台',
    'oneapi': '配置 OneAPI 代理服务',
    'ragflow': '配置 RagFlow 知识库问答系统'
  }
  return subtitles[settingsType.value as keyof typeof subtitles] || '配置服务参数'
}

const saveSettings = async () => {
  try {
    // 模拟保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))
    message.success('设置保存成功')
  } catch (error) {
    message.error('设置保存失败')
  }
}

const resetSettings = () => {
  // 重置设置到默认值
  if (settingsType.value === 'system') {
    systemSettings.value = {
      name: 'AI-Server 管理平台',
      port: 8080,
      logLevel: 'info',
      autoStart: true
    }
  } else {
    serviceSettings.value = {
      port: 5678,
      dbUrl: 'postgresql://localhost:5432/n8n',
      apiKey: '',
      env: 'NODE_ENV=production\nN8N_BASIC_AUTH_ACTIVE=true',
      config: ''
    }
  }
  message.info('设置已重置')
}

const testConnection = async () => {
  try {
    // 模拟测试连接
    await new Promise(resolve => setTimeout(resolve, 2000))
    message.success('连接测试成功')
  } catch (error) {
    message.error('连接测试失败')
  }
}

onMounted(() => {
  // 根据设置类型加载对应的配置
  console.log('加载设置:', settingsType.value)
})
</script>

<style scoped>
.settings-view {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.settings-title {
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.settings-subtitle {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

.settings-content {
  width: 100%;
}

.settings-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xl);
}

.settings-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-light);
}

.settings-actions .ant-btn {
  min-width: 120px;
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all var(--transition-base);
}

.settings-actions .ant-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.settings-actions .ant-btn-primary {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border: none;
  box-shadow: 0 0 20px rgba(0, 122, 255, 0.3);
}

.settings-actions .ant-btn-primary:hover {
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4), 0 0 30px rgba(0, 122, 255, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-view {
    padding: var(--spacing-lg);
  }
  
  .settings-actions {
    flex-direction: column;
  }
  
  .settings-actions .ant-btn {
    width: 100%;
  }
}

/* 统一按钮样式 */
.action-button {
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all var(--transition-base);
  font-size: var(--text-sm);
  height: 36px;
  position: relative;
  overflow: hidden;
}

.action-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.action-button:hover::before {
  left: 100%;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.save-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border: none;
  color: var(--text-white) !important;
  box-shadow: 0 0 20px rgba(24, 144, 255, 0.3);
}

.save-btn:hover {
  box-shadow: 0 8px 25px rgba(24, 144, 255, 0.4), 0 0 30px rgba(24, 144, 255, 0.2);
}

.refresh-btn {
  background: linear-gradient(135deg, var(--warning-color) 0%, #ffa940 100%);
  border: none;
  color: var(--text-white) !important;
  box-shadow: 0 0 20px rgba(250, 173, 20, 0.3);
}

.refresh-btn:hover {
  box-shadow: 0 8px 25px rgba(250, 173, 20, 0.4), 0 0 30px rgba(250, 173, 20, 0.2);
}
</style>
