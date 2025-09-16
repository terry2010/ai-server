<template>
  <div id="app">
    <a-layout class="main-layout">
      <!-- 顶部导航栏 -->
      <a-layout-header class="header">
        <div class="header-content">
          <!-- 左侧Logo和标题 -->
          <div class="logo-section">
            <div class="logo">🚀</div>
            <h1 class="title">AI-Server管理平台</h1>
          </div>
          
          <!-- 中部Tab导航 -->
          <div class="nav-tabs">
            <div 
              v-for="tab in navTabs" 
              :key="tab.key"
              :class="['nav-tab', { active: currentTab === tab.key }]"
              @click="switchTab(tab)"
            >
              <span class="tab-text">{{ tab.label }}</span>
              <span 
                v-if="tab.status" 
                :class="['status-dot', tab.status]"
              ></span>
            </div>
          </div>
          
          <!-- 右侧操作区 -->
          <div class="header-actions">
            <a-badge :count="3" size="small">
              <a-button type="text" shape="circle" size="large">
                <template #icon>
                  <BellOutlined />
                </template>
              </a-button>
            </a-badge>
            <a-dropdown>
              <a-button type="text" shape="circle" size="large">
                <template #icon>
                  <UserOutlined />
                </template>
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="profile">个人设置</a-menu-item>
                  <a-menu-item key="logout">退出登录</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </a-layout-header>
      
      <!-- 主体内容区 -->
      <a-layout class="content-layout">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </a-layout>
    </a-layout>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useServicesStore } from './stores/services'
import { BellOutlined, UserOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const servicesStore = useServicesStore()

// 当前激活的Tab
const currentTab = ref('home')

// 导航Tab配置
const navTabs = computed(() => [
  {
    key: 'home',
    label: '首页',
    route: '/',
    status: null
  },
  {
    key: 'n8n',
    label: 'n8n',
    route: '/n8n',
    status: servicesStore.getServiceById('n8n')?.status
  },
  {
    key: 'dify',
    label: 'Dify',
    route: '/dify',
    status: servicesStore.getServiceById('dify')?.status
  },
  {
    key: 'oneapi',
    label: 'OneAPI',
    route: '/oneapi',
    status: servicesStore.getServiceById('oneapi')?.status
  },
  {
    key: 'ragflow',
    label: 'RagFlow',
    route: '/ragflow',
    status: servicesStore.getServiceById('ragflow')?.status
  }
])

// 切换Tab
const switchTab = (tab) => {
  currentTab.value = tab.key
  router.push(tab.route)
}

// 监听路由变化
const updateCurrentTab = () => {
  const routeToTab = {
    '/': 'home',
    '/n8n': 'n8n',
    '/dify': 'dify',
    '/oneapi': 'oneapi',
    '/ragflow': 'ragflow',
    '/settings': 'settings'
  }
  currentTab.value = routeToTab[route.path] || 'home'
}

onMounted(() => {
  updateCurrentTab()
  // 启动实时数据更新
  servicesStore.startRealTimeUpdates()
})

// 监听路由变化
router.afterEach(() => {
  updateCurrentTab()
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
}

.header {
  padding: 0;
  height: 64px;
  line-height: 64px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-light);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 var(--spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.logo {
  font-size: 28px;
  line-height: 1;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-tabs {
  display: flex;
  gap: var(--spacing-sm);
  flex: 1;
  justify-content: center;
  max-width: 600px;
}

.nav-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 80px;
  justify-content: center;
}

.nav-tab:hover {
  background: var(--gradient-bg-light);
  color: var(--primary-color);
  transform: translateY(-2px);
}

.nav-tab.active {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  color: white;
  box-shadow: var(--shadow-medium);
}

.tab-text {
  font-size: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-left: var(--spacing-xs);
}

.status-dot.running {
  background-color: var(--status-running);
  animation: pulse 2s infinite;
}

.status-dot.stopped {
  background-color: var(--status-stopped);
}

.status-dot.error {
  background-color: var(--status-error);
  animation: blink 1s infinite;
}

.status-dot.starting,
.status-dot.stopping {
  background-color: var(--status-warning);
  animation: spin 1s linear infinite;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.content-layout {
  background: var(--bg-secondary);
}

/* 动画效果 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(24, 144, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0.3;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .header-content {
    padding: 0 var(--spacing-md);
  }
  
  .nav-tabs {
    max-width: 500px;
  }
  
  .nav-tab {
    min-width: 70px;
    padding: var(--spacing-sm) var(--spacing-md);
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 var(--spacing-sm);
  }
  
  .title {
    font-size: 16px;
  }
  
  .nav-tabs {
    gap: var(--spacing-xs);
  }
  
  .nav-tab {
    min-width: 60px;
    padding: var(--spacing-xs) var(--spacing-sm);
  }
  
  .tab-text {
    font-size: 12px;
  }
}
</style>