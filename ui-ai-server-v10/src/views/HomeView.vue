<template>
  <div class="home-container">
    <!-- 顶部 Tab 导航栏 -->
    <div class="top-tabs">
      <div class="tab-item active">
        <span>首页</span>
      </div>
      <div class="tab-item" v-for="service in services" :key="service.name">
        <span>{{ service.name }}</span>
        <div class="status-dot" :class="service.status"></div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧菜单 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <div class="logo-icon">🚀</div>
            <span class="logo-text">AI Server</span>
          </div>
        </div>
        <div class="menu-items">
          <div class="menu-item active">
            <SettingOutlined />
            <span>系统设置</span>
          </div>
          <div class="menu-item">
            <ToolOutlined />
            <span>n8n 设置</span>
          </div>
          <div class="menu-item">
            <BuildOutlined />
            <span>Dify 设置</span>
          </div>
          <div class="menu-item">
            <ThunderboltOutlined />
            <span>OneAPI 设置</span>
          </div>
          <div class="menu-item">
            <DatabaseOutlined />
            <span>RagFlow 设置</span>
          </div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <!-- 通栏 Banner -->
        <div class="banner">
          <div class="banner-content">
            <div class="banner-left">
              <h1 class="welcome-title">欢迎使用 AI Server 管理平台</h1>
              <p class="welcome-subtitle">统一管理和监控您的 AI 服务模块</p>
              <div class="system-status">
                <div class="status-item">
                  <span class="status-label">运行中服务:</span>
                  <span class="status-value">{{ runningServices }}/{{ services.length }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">系统状态:</span>
                  <span class="status-value healthy">健康</span>
                </div>
              </div>
            </div>
            <div class="banner-right">
              <a-button type="primary" size="large" class="quick-action-btn">
                <PlayCircleOutlined />
                启动所有服务
              </a-button>
              <a-button size="large" class="quick-action-btn">
                <PauseCircleOutlined />
                停止所有服务
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
        <div class="services-grid">
          <div class="service-card" v-for="service in services" :key="service.name">
            <div class="card-header">
              <div class="service-icon" :style="{ background: service.color }">
                <component :is="service.icon" />
              </div>
              <div class="service-info">
                <h3 class="service-name">{{ service.name }}</h3>
                <p class="service-description">{{ service.description }}</p>
              </div>
              <div class="service-status">
                <div class="status-indicator" :class="service.status">
                  <div class="status-dot" :class="service.status"></div>
                  <span class="status-text">{{ getStatusText(service.status) }}</span>
                </div>
              </div>
            </div>
            
            <div class="card-content">
              <div class="metrics">
                <div class="metric-item">
                  <span class="metric-label">CPU</span>
                  <div class="metric-bar">
                    <div class="metric-fill" :style="{ width: service.cpu + '%' }"></div>
                  </div>
                  <span class="metric-value">{{ service.cpu }}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">内存</span>
                  <div class="metric-bar">
                    <div class="metric-fill" :style="{ width: service.memory + '%' }"></div>
                  </div>
                  <span class="metric-value">{{ service.memory }}%</span>
                </div>
              </div>
              
              <div class="service-actions">
                <a-button 
                  v-if="service.status === 'stopped'" 
                  type="primary" 
                  size="small"
                  @click="startService(service.name)"
                >
                  <PlayCircleOutlined />
                  启动
                </a-button>
                <a-button 
                  v-else-if="service.status === 'running'" 
                  danger 
                  size="small"
                  @click="stopService(service.name)"
                >
                  <PauseCircleOutlined />
                  停止
                </a-button>
                <a-button 
                  v-else 
                  size="small" 
                  disabled
                >
                  <LoadingOutlined />
                  处理中
                </a-button>
                <a-button size="small" ghost>
                  <SettingOutlined />
                  配置
                </a-button>
              </div>
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
  SettingOutlined,
  ToolOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  LoadingOutlined,
  ApiOutlined,
  RobotOutlined,
  CloudServerOutlined,
  BranchesOutlined
} from '@ant-design/icons-vue'

interface Service {
  name: string
  description: string
  status: 'running' | 'stopped' | 'error'
  cpu: number
  memory: number
  color: string
  icon: any
}

const services = ref<Service[]>([
  {
    name: 'n8n',
    description: '工作流自动化平台',
    status: 'running',
    cpu: 15,
    memory: 32,
    color: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
    icon: BranchesOutlined
  },
  {
    name: 'Dify',
    description: 'AI 应用开发平台',
    status: 'running',
    cpu: 28,
    memory: 45,
    color: 'linear-gradient(135deg, #4ECDC4, #6EDDD6)',
    icon: RobotOutlined
  },
  {
    name: 'OneAPI',
    description: 'API 网关服务',
    status: 'stopped',
    cpu: 0,
    memory: 0,
    color: 'linear-gradient(135deg, #45B7D1, #6BC5E8)',
    icon: ApiOutlined
  },
  {
    name: 'RagFlow',
    description: 'RAG 知识库服务',
    status: 'error',
    cpu: 5,
    memory: 12,
    color: 'linear-gradient(135deg, #96CEB4, #A8D8C4)',
    icon: CloudServerOutlined
  }
])

const runningServices = computed(() => {
  return services.value.filter(service => service.status === 'running').length
})

const getStatusText = (status: string) => {
  const statusMap = {
    running: '运行中',
    stopped: '已停止',
    error: '异常'
  }
  return statusMap[status as keyof typeof statusMap] || '未知'
}

const startService = (serviceName: string) => {
  console.log(`启动服务: ${serviceName}`)
  // 这里可以添加启动服务的逻辑
}

const stopService = (serviceName: string) => {
  console.log(`停止服务: ${serviceName}`)
  // 这里可以添加停止服务的逻辑
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 顶部 Tab 导航栏 */
.top-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 20px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  margin-right: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  color: #666;
}

.tab-item:hover {
  background: rgba(24, 144, 255, 0.08);
  color: #1890ff;
}

.tab-item.active {
  background: #1890ff;
  color: white;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-dot.running {
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.6);
  animation: pulse 2s infinite;
}

.status-dot.stopped {
  background: #d9d9d9;
}

.status-dot.error {
  background: #ff4d4f;
  animation: blink 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

/* 主内容区域 */
.main-content {
  display: flex;
  height: calc(100vh - 60px);
}

/* 左侧菜单 */
.sidebar {
  width: 240px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.08);
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.menu-items {
  padding: 20px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 0 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #666;
  font-weight: 500;
}

.menu-item:hover {
  background: rgba(24, 144, 255, 0.08);
  color: #1890ff;
  transform: translateX(4px);
}

.menu-item.active {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: white;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

/* 右侧内容区 */
.content-area {
  flex: 1;
  overflow-y: auto;
}

/* 通栏 Banner */
.banner {
  position: relative;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 50%, #69c0ff 100%);
  padding: 40px;
  margin: 20px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(24, 144, 255, 0.3);
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
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.welcome-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 20px;
}

.system-status {
  display: flex;
  gap: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  opacity: 0.8;
}

.status-value {
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-value.healthy {
  background: rgba(82, 196, 26, 0.2);
}

.banner-right {
  display: flex;
  gap: 12px;
}

.quick-action-btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 22px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.banner-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
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
  right: -60px;
}

.circle-2 {
  width: 80px;
  height: 80px;
  top: 20px;
  right: 100px;
}

.circle-3 {
  width: 40px;
  height: 40px;
  bottom: 20px;
  right: 200px;
}

/* 服务模块卡片区域 */
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  padding: 20px;
}

.service-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.service-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.service-info {
  flex: 1;
}

.service-name {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.service-description {
  color: #8c8c8c;
  font-size: 14px;
}

.service-status {
  text-align: right;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.running {
  color: #52c41a;
}

.status-indicator.stopped {
  color: #8c8c8c;
}

.status-indicator.error {
  color: #ff4d4f;
}

.card-content {
  space-y: 16px;
}

.metrics {
  margin-bottom: 20px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.metric-label {
  width: 40px;
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.metric-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.metric-value {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: #595959;
  font-weight: 500;
}

.service-actions {
  display: flex;
  gap: 8px;
}

.service-actions .ant-btn {
  border-radius: 8px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .services-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
  }
  
  .banner-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
}
</style>