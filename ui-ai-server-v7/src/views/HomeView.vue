<script setup lang="ts">
import { ref } from 'vue'
import { 
  SettingOutlined, 
  ToolOutlined, 
  ThunderboltOutlined,
  RocketOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons-vue'

const activeMenu = ref('dashboard')

const menuItems = [
  { key: 'dashboard', label: '系统概览', icon: SettingOutlined },
  { key: 'n8n-settings', label: 'n8n 设置', icon: ToolOutlined },
  { key: 'dify-settings', label: 'Dify 设置', icon: RocketOutlined },
  { key: 'oneapi-settings', label: 'OneAPI 设置', icon: ThunderboltOutlined }
]

const services = [
  {
    name: 'n8n',
    displayName: 'n8n 工作流',
    status: 'running',
    description: '自动化工作流编排平台',
    cpu: '15%',
    memory: '256MB',
    uptime: '2h 30m',
    port: '5678'
  },
  {
    name: 'dify',
    displayName: 'Dify AI',
    status: 'stopped',
    description: 'LLM 应用开发平台',
    cpu: '0%',
    memory: '0MB',
    uptime: '0m',
    port: '3000'
  },
  {
    name: 'oneapi',
    displayName: 'OneAPI',
    status: 'running',
    description: 'OpenAI API 代理服务',
    cpu: '8%',
    memory: '128MB',
    uptime: '1h 45m',
    port: '3001'
  },
  {
    name: 'ragflow',
    displayName: 'RAGFlow',
    status: 'error',
    description: 'RAG 知识库管理系统',
    cpu: '0%',
    memory: '0MB',
    uptime: '0m',
    port: '9380'
  }
]

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'running':
      return { color: '#34C759', text: '运行中', icon: PlayCircleOutlined }
    case 'stopped':
      return { color: '#8E8E93', text: '已停止', icon: PauseCircleOutlined }
    case 'error':
      return { color: '#FF3B30', text: '异常', icon: PauseCircleOutlined }
    default:
      return { color: '#8E8E93', text: '未知', icon: PauseCircleOutlined }
  }
}

const handleServiceAction = (service: any, action: string) => {
  console.log(`${action} service: ${service.name}`)
  // 这里可以添加实际的服务控制逻辑
}
</script>

<template>
  <div class="home-container">
    <!-- 左侧菜单 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>AI-Server 管理平台</h3>
      </div>
      <div class="menu-list">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="menu-item"
          :class="{ active: activeMenu === item.key }"
          @click="activeMenu = item.key"
        >
          <component :is="item.icon" class="menu-icon" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧主内容 -->
    <div class="main-content">
      <!-- 通栏 Banner -->
      <div class="banner">
        <div class="banner-content">
          <div class="banner-left">
            <h1>欢迎使用 AI-Server 管理平台</h1>
            <p>统一管理和监控您的 AI 服务模块</p>
            <div class="system-stats">
              <div class="stat-item">
                <span class="stat-label">运行服务</span>
                <span class="stat-value">2/4</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">系统状态</span>
                <span class="stat-value status-normal">正常</span>
              </div>
            </div>
          </div>
          <div class="banner-right">
            <a-button type="primary" size="large">
              <template #icon><ReloadOutlined /></template>
              刷新状态
            </a-button>
          </div>
        </div>
        <!-- 装饰性几何图形 -->
        <div class="banner-decoration">
          <div class="decoration-circle"></div>
          <div class="decoration-triangle"></div>
        </div>
      </div>

      <!-- 服务模块卡片区域 -->
      <div class="services-section">
        <h2>服务模块</h2>
        <div class="services-grid">
          <div
            v-for="service in services"
            :key="service.name"
            class="service-card"
            :class="service.status"
          >
            <div class="card-header">
              <div class="service-info">
                <h3>{{ service.displayName }}</h3>
                <p>{{ service.description }}</p>
              </div>
              <div class="status-indicator">
                <component 
                  :is="getStatusConfig(service.status).icon" 
                  :style="{ color: getStatusConfig(service.status).color }"
                />
                <span 
                  class="status-text"
                  :style="{ color: getStatusConfig(service.status).color }"
                >
                  {{ getStatusConfig(service.status).text }}
                </span>
              </div>
            </div>

            <div class="card-metrics">
              <div class="metric-item">
                <span class="metric-label">CPU</span>
                <span class="metric-value">{{ service.cpu }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">内存</span>
                <span class="metric-value">{{ service.memory }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">运行时间</span>
                <span class="metric-value">{{ service.uptime }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">端口</span>
                <span class="metric-value">{{ service.port }}</span>
              </div>
            </div>

            <div class="card-actions">
              <a-button 
                v-if="service.status === 'stopped' || service.status === 'error'"
                type="primary" 
                @click="handleServiceAction(service, 'start')"
              >
                启动
              </a-button>
              <a-button 
                v-if="service.status === 'running'"
                @click="handleServiceAction(service, 'stop')"
              >
                停止
              </a-button>
              <a-button 
                v-if="service.status === 'running'"
                @click="handleServiceAction(service, 'restart')"
              >
                重启
              </a-button>
              <a-button @click="handleServiceAction(service, 'view')">
                <template #icon><EyeOutlined /></template>
                查看
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}

/* 左侧菜单样式 */
.sidebar {
  width: 240px;
  background: #FFFFFF;
  box-shadow: 1px 0 3px rgba(0, 0, 0, 0.05);
  z-index: 10;
  border-right: 1px solid #E5E5E7;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid #E5E5E7;
}

.sidebar-header h3 {
  margin: 0;
  color: #1C1C1E;
  font-size: 16px;
  font-weight: 600;
}

.menu-list {
  padding: 16px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #3C3C43;
}

.menu-item:hover {
  background: #F2F2F7;
  color: #1C1C1E;
}

.menu-item.active {
  background: #007AFF;
  color: #FFFFFF;
}

.menu-icon {
  font-size: 16px;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  overflow: auto;
}

/* Banner 样式 */
.banner {
  height: 120px;
  background: linear-gradient(135deg, #F2F2F7 0%, #E5E5EA 50%, #D1D1D6 100%);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid #E5E5E7;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 32px;
  position: relative;
  z-index: 2;
}

.banner-left h1 {
  color: #1C1C1E;
  font-size: 24px;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.banner-left p {
  color: #3C3C43;
  margin: 0 0 16px 0;
  font-size: 14px;
}

.system-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  color: #8E8E93;
  font-size: 12px;
}

.stat-value {
  color: #1C1C1E;
  font-size: 16px;
  font-weight: 600;
}

.stat-value.status-normal {
  color: #34C759;
}

/* Banner 装饰 */
.banner-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 100%;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  border: 2px solid rgba(60, 60, 67, 0.1);
  border-radius: 50%;
  animation: float 3s ease-in-out infinite;
}

.decoration-triangle {
  position: absolute;
  bottom: -10px;
  right: 60px;
  width: 0;
  height: 0;
  border-left: 30px solid transparent;
  border-right: 30px solid transparent;
  border-bottom: 40px solid rgba(60, 60, 67, 0.05);
  animation: float 4s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* 服务模块区域 */
.services-section {
  padding: 32px;
}

.services-section h2 {
  margin: 0 0 24px 0;
  color: #262626;
  font-size: 20px;
  font-weight: 600;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* 服务卡片样式 */
.service-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #E5E5E7;
  transition: all 0.2s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: #C7C7CC;
}

.service-card.running {
  border-left: 4px solid #34C759;
}

.service-card.stopped {
  border-left: 4px solid #8E8E93;
}

.service-card.error {
  border-left: 4px solid #FF3B30;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.service-info h3 {
  margin: 0 0 4px 0;
  color: #1C1C1E;
  font-size: 16px;
  font-weight: 600;
}

.service-info p {
  margin: 0;
  color: #8E8E93;
  font-size: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
}

.card-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #F2F2F7;
  border-radius: 8px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  color: #8E8E93;
  font-size: 12px;
}

.metric-value {
  color: #1C1C1E;
  font-size: 12px;
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
    text-align: center;
    gap: 16px;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
}
</style>
