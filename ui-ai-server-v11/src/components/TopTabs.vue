<template>
  <div class="top-tabs">
    <!-- Mac 窗口控制按钮 -->
    <div class="mac-controls">
      <div class="mac-button close" @click="handleClose" title="关闭"></div>
      <div class="mac-button minimize" @click="handleMinimize" title="最小化"></div>
      <div class="mac-button maximize" @click="handleMaximize" title="全屏"></div>
    </div>
    
    <div class="app-logo">
      <div class="logo-icon">
        <robot-outlined />
      </div>
      <div class="logo-text">
        <span class="app-name">AI-Server</span>
        <span class="app-subtitle">管理平台</span>
      </div>
    </div>
    
    <div class="tabs-container">
      <a-tabs 
        v-model:activeKey="activeTab" 
        type="card" 
        class="custom-tabs"
        @change="handleTabChange"
      >
        <a-tab-pane key="home" tab="首页" />
        <a-tab-pane key="n8n">
          <template #tab>
            <span class="tab-content">
              n8n
              <span :class="['status-indicator', getStatusClass('n8n')]"></span>
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="dify">
          <template #tab>
            <span class="tab-content">
              Dify
              <span :class="['status-indicator', getStatusClass('dify')]"></span>
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="oneapi">
          <template #tab>
            <span class="tab-content">
              OneAPI
              <span :class="['status-indicator', getStatusClass('oneapi')]"></span>
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="ragflow">
          <template #tab>
            <span class="tab-content">
              RagFlow
              <span :class="['status-indicator', getStatusClass('ragflow')]"></span>
            </span>
          </template>
        </a-tab-pane>
      </a-tabs>
    </div>
    
    <div class="user-section">
      <a-dropdown>
        <template #overlay>
          <a-menu @click="handleUserMenuClick">
            <a-menu-item key="profile">
              <user-outlined />
              个人资料
            </a-menu-item>
            <a-menu-item key="account">
              <setting-outlined />
              账户设置
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout">
              <logout-outlined />
              退出登录
            </a-menu-item>
          </a-menu>
        </template>
        <div class="user-info">
          <a-avatar size="small" :src="userInfo.avatar">
            {{ userInfo.name.charAt(0) }}
          </a-avatar>
          <span class="user-name">{{ userInfo.name }}</span>
          <down-outlined class="dropdown-icon" />
        </div>
      </a-dropdown>
      
      <!-- Windows 窗口控制按钮 -->
      <div class="windows-controls">
        <div class="windows-button menu" @click="handleMenu" title="菜单">
          <menu-outlined />
        </div>
        <div class="windows-button minimize" @click="handleMinimize" title="最小化">
          <minus-outlined />
        </div>
        <div class="windows-button maximize" @click="handleMaximize" title="最大化">
          <border-outlined />
        </div>
        <div class="windows-button close" @click="handleClose" title="关闭">
          <close-outlined />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  DownOutlined,
  RobotOutlined,
  MenuOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const activeTab = ref('home')

// 模拟用户信息
const userInfo = ref({
  name: '管理员',
  avatar: ''
})

// 模拟服务状态
const serviceStatus = ref({
  n8n: 'running',
  dify: 'stopped',
  oneapi: 'running',
  ragflow: 'error'
})

const getStatusClass = (service: string) => {
  const status = serviceStatus.value[service as keyof typeof serviceStatus.value]
  return `status-${status}`
}

const handleTabChange = (key: string) => {
  activeTab.value = key
  router.push(`/${key === 'home' ? '' : key}`)
}

const handleUserMenuClick = ({ key }: { key: string }) => {
  switch (key) {
    case 'profile':
      router.push('/profile')
      break
    case 'account':
      router.push('/account')
      break
    case 'logout':
      router.push('/login')
      break
  }
}

// 窗口控制函数
const handleClose = () => {
  console.log('关闭窗口')
  // 在实际应用中，这里会调用 Electron 的窗口关闭 API
}

const handleMinimize = () => {
  console.log('最小化窗口')
  // 在实际应用中，这里会调用 Electron 的窗口最小化 API
}

const handleMaximize = () => {
  console.log('最大化/全屏窗口')
  // 在实际应用中，这里会调用 Electron 的窗口最大化 API
}

const handleMenu = () => {
  console.log('打开菜单')
  // 在实际应用中，这里会显示应用菜单
}
</script>

<style scoped>
.top-tabs {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  padding: 0 var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  position: relative;
  z-index: 100;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-right: var(--spacing-xl);
  padding: var(--spacing-sm);
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-white);
  font-size: 20px;
  box-shadow: var(--shadow-md);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.app-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.app-subtitle {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.2;
}

.tabs-container {
  flex: 1;
}

.user-section {
  margin-left: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border-light);
}

.user-info:hover {
  background: var(--bg-tertiary);
  box-shadow: var(--shadow-sm);
}

.user-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.dropdown-icon {
  font-size: 12px;
  color: var(--text-secondary);
  transition: transform var(--transition-base);
}

.user-info:hover .dropdown-icon {
  transform: rotate(180deg);
}

.custom-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  background: transparent;
}

.custom-tabs :deep(.ant-tabs-tab) {
  background: transparent;
  border: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  margin-right: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--text-secondary);
  font-weight: 500;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.custom-tabs :deep(.ant-tabs-tab::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(0, 122, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.custom-tabs :deep(.ant-tabs-tab:hover) {
  background: var(--bg-tertiary);
  color: var(--primary-color);
  transform: translateY(-2px) scale(1.02);
}

.custom-tabs :deep(.ant-tabs-tab-active:hover) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  color: var(--text-white) !important;
  transform: translateY(-2px) scale(1.02);
}

.custom-tabs :deep(.ant-tabs-tab-active:hover .ant-tabs-tab-btn) {
  color: var(--text-white) !important;
}

.custom-tabs :deep(.ant-tabs-tab:hover::before) {
  opacity: 1;
}

.custom-tabs :deep(.ant-tabs-tab-active) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  color: var(--text-white) !important;
  box-shadow: var(--shadow-md);
}

.custom-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--text-white) !important;
}

.custom-tabs :deep(.ant-tabs-tab-active::before) {
  opacity: 0;
}

.custom-tabs :deep(.ant-tabs-ink-bar) {
  display: none;
}

.tab-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-running {
  background-color: var(--success-color);
  animation: pulse 2s infinite;
  box-shadow: 0 0 4px var(--success-color);
}

.status-stopped {
  background-color: var(--text-tertiary);
}

.status-error {
  background-color: var(--error-color);
  animation: blink 1s infinite;
  box-shadow: 0 0 4px var(--error-color);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
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

/* Mac 窗口控制按钮 */
.mac-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: var(--spacing-lg);
}

.mac-button {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  color: transparent;
}

.mac-button.close {
  background-color: #ff5f57;
}

.mac-button.minimize {
  background-color: #ffbd2e;
}

.mac-button.maximize {
  background-color: #28ca42;
}

.mac-button:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: rgba(0, 0, 0, 0.6);
}

.mac-button.close:hover::after {
  content: '×';
}

.mac-button.minimize:hover::after {
  content: '−';
}

.mac-button.maximize:hover::after {
  content: '+';
}

/* Windows 窗口控制按钮 */
.windows-controls {
  display: flex;
  align-items: center;
  margin-left: var(--spacing-md);
}

.windows-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-secondary);
  font-size: 14px;
}

.windows-button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.windows-button.close:hover {
  background-color: #e81123;
  color: white;
}

.windows-button.maximize:hover,
.windows-button.minimize:hover {
  background-color: var(--bg-tertiary);
}

.windows-button.menu:hover {
  background-color: var(--primary-color);
  color: white;
}
</style>
