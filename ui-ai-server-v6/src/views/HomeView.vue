<template>
  <div class="home-view">
    <a-layout class="home-layout">
      <!-- 左侧菜单栏 -->
      <a-layout-sider 
        :width="240" 
        class="sidebar"
        :collapsed="collapsed"
        :collapsible="true"
        @collapse="onCollapse"
      >
        <div class="sidebar-content">
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="inline"
            class="sidebar-menu"
            @click="handleMenuClick"
          >
            <a-menu-item key="dashboard">
              <template #icon>
                <DashboardOutlined />
              </template>
              <span>系统概览</span>
            </a-menu-item>
            
            <a-menu-divider />
            
            <a-menu-item-group title="服务管理">
              <a-menu-item key="n8n-settings">
                <template #icon>
                  <SettingOutlined />
                </template>
                <span>n8n 设置</span>
              </a-menu-item>
              <a-menu-item key="dify-settings">
                <template #icon>
                  <RobotOutlined />
                </template>
                <span>Dify 设置</span>
              </a-menu-item>
              <a-menu-item key="oneapi-settings">
                <template #icon>
                  <ThunderboltOutlined />
                </template>
                <span>OneAPI 设置</span>
              </a-menu-item>
              <a-menu-item key="ragflow-settings">
                <template #icon>
                  <BookOutlined />
                </template>
                <span>RagFlow 设置</span>
              </a-menu-item>
            </a-menu-item-group>
            
            <a-menu-divider />
            
            <a-menu-item key="system-settings">
              <template #icon>
                <ControlOutlined />
              </template>
              <span>系统设置</span>
            </a-menu-item>
            <a-menu-item key="logs">
              <template #icon>
                <FileTextOutlined />
              </template>
              <span>系统日志</span>
            </a-menu-item>
          </a-menu>
        </div>
      </a-layout-sider>
      
      <!-- 右侧内容区 -->
      <a-layout-content class="main-content">
        <!-- 通栏Banner -->
        <div class="banner-section">
          <div class="banner-content">
            <div class="banner-left">
              <h2 class="welcome-title">欢迎使用 AI-Server 管理平台</h2>
              <p class="welcome-subtitle">统一管理您的AI服务，实时监控系统状态</p>
              <div class="stats-overview">
                <div class="stat-item">
                  <div class="stat-number">{{ systemStats.total }}</div>
                  <div class="stat-label">总服务数</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number running">{{ systemStats.running }}</div>
                  <div class="stat-label">运行中</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">{{ systemStats.totalRequests }}</div>
                  <div class="stat-label">今日请求</div>
                </div>
              </div>
            </div>
            <div class="banner-right">
              <div class="quick-actions">
                <a-button type="primary" size="large" @click="startAllServices">
                  <template #icon>
                    <PlayCircleOutlined />
                  </template>
                  启动所有服务
                </a-button>
                <a-button size="large" @click="refreshStatus">
                  <template #icon>
                    <ReloadOutlined />
                  </template>
                  刷新状态
                </a-button>
              </div>
            </div>
          </div>
          <!-- 装饰性几何图形 -->
          <div class="banner-decoration">
            <div class="decoration-circle circle-1"></div>
            <div class="decoration-circle circle-2"></div>
            <div class="decoration-circle circle-3"></div>
          </div>
        </div>
        
        <!-- 服务卡片区域 -->
        <div class="services-section">
          <div class="section-header">
            <h3 class="section-title">AI服务模块</h3>
            <div class="section-actions">
              <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
                <a-radio-button value="grid">网格视图</a-radio-button>
                <a-radio-button value="list">列表视图</a-radio-button>
              </a-radio-group>
            </div>
          </div>
          
          <div :class="['services-grid', viewMode]">
            <ServiceCard
              v-for="service in services"
              :key="service.id"
              :service="service"
              @start="handleStartService"
              @stop="handleStopService"
              @restart="handleRestartService"
              @view-details="handleViewDetails"
            />
          </div>
        </div>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useServicesStore } from '../stores/services'
import { message } from 'ant-design-vue'
import ServiceCard from '../components/ServiceCard.vue'
import {
  DashboardOutlined,
  SettingOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BookOutlined,
  ControlOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const servicesStore = useServicesStore()

// 响应式数据
const collapsed = ref(false)
const selectedKeys = ref(['dashboard'])
const viewMode = ref('grid')

// 计算属性
const services = computed(() => servicesStore.services)
const systemStats = computed(() => servicesStore.systemStats)

// 方法
const onCollapse = (collapsed) => {
  collapsed.value = collapsed
}

const handleMenuClick = ({ key }) => {
  selectedKeys.value = [key]
  
  // 根据菜单项跳转或执行操作
  switch (key) {
    case 'dashboard':
      // 当前就在首页，不需要跳转
      break
    case 'system-settings':
      router.push('/settings')
      break
    case 'n8n-settings':
      router.push('/n8n')
      break
    case 'dify-settings':
      router.push('/dify')
      break
    case 'oneapi-settings':
      router.push('/oneapi')
      break
    case 'ragflow-settings':
      router.push('/ragflow')
      break
    case 'logs':
      message.info('系统日志功能开发中...')
      break
    default:
      break
  }
}

const handleStartService = async (serviceId) => {
  try {
    await servicesStore.startService(serviceId)
    message.success(`正在启动 ${servicesStore.getServiceById(serviceId).displayName}...`)
  } catch (error) {
    message.error('启动服务失败')
  }
}

const handleStopService = async (serviceId) => {
  try {
    await servicesStore.stopService(serviceId)
    message.success(`正在停止 ${servicesStore.getServiceById(serviceId).displayName}...`)
  } catch (error) {
    message.error('停止服务失败')
  }
}

const handleRestartService = async (serviceId) => {
  try {
    await servicesStore.restartService(serviceId)
    message.success(`正在重启 ${servicesStore.getServiceById(serviceId).displayName}...`)
  } catch (error) {
    message.error('重启服务失败')
  }
}

const handleViewDetails = (serviceId) => {
  const service = servicesStore.getServiceById(serviceId)
  router.push(`/${service.name}`)
}

const startAllServices = async () => {
  const stoppedServices = servicesStore.stoppedServices
  if (stoppedServices.length === 0) {
    message.info('所有服务都已在运行中')
    return
  }
  
  try {
    for (const service of stoppedServices) {
      await servicesStore.startService(service.id)
    }
    message.success(`正在启动 ${stoppedServices.length} 个服务...`)
  } catch (error) {
    message.error('批量启动服务失败')
  }
}

const refreshStatus = () => {
  message.success('状态已刷新')
  // 这里可以添加实际的刷新逻辑
}

onMounted(() => {
  // 组件挂载时的初始化操作
})
</script>

<style scoped>
.home-view {
  height: calc(100vh - 64px);
}

.home-layout {
  height: 100%;
  background: var(--bg-secondary);
}

.sidebar {
  background: var(--bg-primary) !important;
  border-right: 1px solid var(--border-color);
  box-shadow: var(--shadow-light);
}

.sidebar-content {
  height: 100%;
  padding-top: var(--spacing-md);
}

.sidebar-menu {
  border: none !important;
  background: transparent !important;
}

.main-content {
  padding: 0;
  overflow-y: auto;
}

/* Banner样式 */
.banner-section {
  position: relative;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 50%, var(--secondary-color) 100%);
  color: white;
  padding: var(--spacing-xl) var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  overflow: hidden;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.banner-left {
  flex: 1;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 var(--spacing-sm) 0;
  color: white;
}

.welcome-subtitle {
  font-size: 16px;
  margin: 0 0 var(--spacing-lg) 0;
  opacity: 0.9;
}

.stats-overview {
  display: flex;
  gap: var(--spacing-xl);
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: var(--spacing-xs);
}

.stat-number.running {
  color: #52c41a;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.banner-right {
  flex-shrink: 0;
}

.quick-actions {
  display: flex;
  gap: var(--spacing-md);
}

/* Banner装饰 */
.banner-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: -100px;
  right: -50px;
  animation: float 6s ease-in-out infinite;
}

.circle-2 {
  width: 150px;
  height: 150px;
  top: 50px;
  right: 200px;
  animation: float 8s ease-in-out infinite reverse;
}

.circle-3 {
  width: 100px;
  height: 100px;
  bottom: -50px;
  right: 100px;
  animation: float 10s ease-in-out infinite;
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
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.services-grid {
  display: grid;
  gap: var(--spacing-lg);
}

.services-grid.grid {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.services-grid.list {
  grid-template-columns: 1fr;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .banner-content {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-lg);
  }
  
  .stats-overview {
    justify-content: center;
  }
  
  .services-section {
    padding: 0 var(--spacing-md) var(--spacing-md);
  }
}

@media (max-width: 768px) {
  .welcome-title {
    font-size: 24px;
  }
  
  .stats-overview {
    gap: var(--spacing-lg);
  }
  
  .stat-number {
    font-size: 24px;
  }
  
  .quick-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .services-grid.grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }
}
</style>