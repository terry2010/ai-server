<template>
  <div class="home-container">
    <!-- 左侧菜单 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">🚀</div>
          <span class="logo-text">AI Server</span>
        </div>
      </div>
      
      <div class="menu-section">
        <div class="menu-title">系统管理</div>
        <div 
          v-for="item in menuItems" 
          :key="item.key"
          :class="['menu-item', { active: activeMenu === item.key }]"
          @click="activeMenu = item.key"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-text">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-area">
      <!-- 通栏Banner -->
      <div class="banner">
        <div class="banner-content">
          <div class="banner-left">
            <h1 class="welcome-title">欢迎使用 AI Server</h1>
            <p class="welcome-subtitle">统一管理您的AI服务，让工作更高效</p>
            <div class="system-stats">
              <div class="stat-item">
                <span class="stat-label">运行服务</span>
                <span class="stat-value">{{ runningServices }}/{{ totalServices }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">系统状态</span>
                <span class="stat-value status-healthy">健康</span>
              </div>
            </div>
          </div>
          <div class="banner-right">
            <a-button type="primary" size="large" class="quick-action-btn">
              <template #icon>
                <PlayCircleOutlined />
              </template>
              启动所有服务
            </a-button>
          </div>
        </div>
        <div class="banner-decoration">
          <div class="decoration-circle circle-1"></div>
          <div class="decoration-circle circle-2"></div>
          <div class="decoration-circle circle-3"></div>
        </div>
      </div>

      <!-- 服务模块卡片区域 -->
      <div class="services-section">
        <div class="section-header">
          <h2 class="section-title">服务模块</h2>
          <a-button type="text" class="refresh-btn">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新状态
          </a-button>
        </div>
        
        <div class="services-grid">
          <div 
            v-for="service in services" 
            :key="service.key"
            :class="['service-card', service.status]"
          >
            <div class="card-header">
              <div class="service-info">
                <div class="service-icon">{{ service.icon }}</div>
                <div class="service-details">
                  <h3 class="service-name">{{ service.name }}</h3>
                  <p class="service-description">{{ service.description }}</p>
                </div>
              </div>
              <div :class="['status-indicator', service.status]">
                <span class="status-dot"></span>
                <span class="status-text">{{ getStatusText(service.status) }}</span>
              </div>
            </div>
            
            <div class="card-content">
              <div class="metrics">
                <div class="metric-item">
                  <span class="metric-label">CPU</span>
                  <span class="metric-value">{{ service.metrics.cpu }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">内存</span>
                  <span class="metric-value">{{ service.metrics.memory }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">运行时间</span>
                  <span class="metric-value">{{ service.metrics.uptime }}</span>
                </div>
              </div>
            </div>
            
            <div class="card-actions">
              <a-button 
                v-if="service.status === 'stopped'" 
                type="primary" 
                size="small"
                @click="startService(service.key)"
              >
                <template #icon>
                  <PlayCircleOutlined />
                </template>
                启动
              </a-button>
              <a-button 
                v-else-if="service.status === 'running'" 
                danger 
                size="small"
                @click="stopService(service.key)"
              >
                <template #icon>
                  <PauseCircleOutlined />
                </template>
                停止
              </a-button>
              <a-button 
                v-else 
                type="default" 
                size="small"
                @click="restartService(service.key)"
              >
                <template #icon>
                  <ReloadOutlined />
                </template>
                重启
              </a-button>
              <a-button type="text" size="small">
                <template #icon>
                  <SettingOutlined />
                </template>
                配置
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined, 
  SettingOutlined 
} from '@ant-design/icons-vue'

const activeMenu = ref('dashboard')

const menuItems = ref([
  { key: 'dashboard', label: '系统概览', icon: '📊' },
  { key: 'system', label: '系统设置', icon: '⚙️' },
  { key: 'n8n', label: 'n8n 设置', icon: '🔧' },
  { key: 'dify', label: 'Dify 设置', icon: '🛠️' },
  { key: 'oneapi', label: 'OneAPI 设置', icon: '⚡' },
  { key: 'ragflow', label: 'RagFlow 设置', icon: '🌊' }
])

const services = ref([
  {
    key: 'n8n',
    name: 'n8n',
    description: '工作流自动化平台',
    icon: '🔄',
    status: 'running',
    metrics: {
      cpu: '15%',
      memory: '256MB',
      uptime: '2h 30m'
    }
  },
  {
    key: 'dify',
    name: 'Dify',
    description: 'LLM应用开发平台',
    icon: '🤖',
    status: 'stopped',
    metrics: {
      cpu: '0%',
      memory: '0MB',
      uptime: '--'
    }
  },
  {
    key: 'oneapi',
    name: 'OneAPI',
    description: 'API统一管理网关',
    icon: '🔌',
    status: 'running',
    metrics: {
      cpu: '8%',
      memory: '128MB',
      uptime: '1h 45m'
    }
  },
  {
    key: 'ragflow',
    name: 'RagFlow',
    description: 'RAG知识库系统',
    icon: '📚',
    status: 'error',
    metrics: {
      cpu: '0%',
      memory: '0MB',
      uptime: '--'
    }
  }
])

const runningServices = computed(() => 
  services.value.filter(s => s.status === 'running').length
)

const totalServices = computed(() => services.value.length)

const getStatusText = (status: string) => {
  const statusMap = {
    running: '运行中',
    stopped: '已停止',
    error: '异常'
  }
  return statusMap[status as keyof typeof statusMap] || '未知'
}

const startService = (key: string) => {
  console.log('启动服务:', key)
}

const stopService = (key: string) => {
  console.log('停止服务:', key)
}

const restartService = (key: string) => {
  console.log('重启服务:', key)
}
</script>

<style scoped>
.home-container {
  display: flex;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 左侧菜单样式 */
.sidebar {
  width: 260px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
  padding: 24px 0;
  overflow-y: auto;
}

.sidebar-header {
  padding: 0 24px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 32px;
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1890ff;
}

.menu-section {
  padding: 0 12px;
}

.menu-title {
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  padding: 0 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  margin: 4px 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #666;
  font-weight: 500;
  user-select: none;
}

.menu-item:hover {
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.1) 0%, rgba(64, 169, 255, 0.05) 100%);
  color: #1890ff;
  transform: translateX(4px);
}

.menu-item.active {
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  transform: translateX(8px);
}

.menu-icon {
  font-size: 18px;
  width: 20px;
  text-align: center;
}

.menu-text {
  font-size: 14px;
}

/* 主内容区域样式 */
.main-area {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* Banner样式 */
.banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px;
  margin: 24px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.banner-left {
  color: white;
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(45deg, #ffffff, #e6f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-subtitle {
  font-size: 16px;
  margin: 0 0 24px 0;
  opacity: 0.9;
}

.system-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.status-healthy {
  color: #52c41a;
}

.quick-action-btn {
  height: 48px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.quick-action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.banner-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 120px;
  height: 120px;
  top: -60px;
  right: 100px;
  animation: float 6s ease-in-out infinite;
}

.circle-2 {
  width: 80px;
  height: 80px;
  bottom: -40px;
  right: 200px;
  animation: float 4s ease-in-out infinite reverse;
}

.circle-3 {
  width: 60px;
  height: 60px;
  top: 50%;
  right: 50px;
  animation: float 5s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* 服务区域样式 */
.services-section {
  padding: 0 24px 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #262626;
  margin: 0;
}

.refresh-btn {
  color: #1890ff;
  font-weight: 500;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.service-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.service-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #d9d9d9;
  transition: all 0.3s ease;
}

.service-card.running::before {
  background: linear-gradient(90deg, #52c41a, #73d13d);
}

.service-card.error::before {
  background: linear-gradient(90deg, #ff4d4f, #ff7875);
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(24, 144, 255, 0.15);
  border-color: rgba(24, 144, 255, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.service-info {
  display: flex;
  gap: 12px;
}

.service-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f9ff, #e6f7ff);
  border-radius: 10px;
}

.service-details h3 {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 4px 0;
}

.service-details p {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.running {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.status-indicator.stopped {
  background: rgba(140, 140, 140, 0.1);
  color: #8c8c8c;
}

.status-indicator.error {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-indicator.running .status-dot {
  animation: pulse 2s infinite;
}

.metrics {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions .ant-btn {
  border-radius: 8px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
  }
  
  .banner-content {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
}
</style>