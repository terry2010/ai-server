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
        <div class="user-info" @mouseenter="showMenu = false">
          <a-avatar size="small" :src="userInfo.avatar">
            {{ userInfo.name.charAt(0) }}
          </a-avatar>
          <span class="user-name">{{ userInfo.name }}</span>
          <down-outlined class="dropdown-icon" />
        </div>
      </a-dropdown>
      
      <!-- Windows 窗口控制按钮 -->
      <div class="windows-controls">
        <div class="menu-wrapper">
          <div class="windows-button menu hit-area" title="菜单" @click="toggleMenu" ref="menuBtn">
            <menu-outlined />
          </div>
          <div v-if="showMenu" class="custom-menu" @click.stop>
            <div class="custom-menu-item">示例菜单项一</div>
            <div class="custom-menu-item">示例菜单项二</div>
            <div class="custom-menu-divider"></div>
            <div class="custom-menu-item">关于 AI-Server</div>
          </div>
        </div>
        <div class="windows-button minimize hit-area" @click="handleMinimize" title="最小化">
          <minus-outlined />
        </div>
        <div class="windows-button maximize hit-area" @click="handleMaximize" title="最大化">
          <border-outlined />
        </div>
        <div class="windows-button close hit-area" @click="handleClose" title="关闭">
          <close-outlined />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { moduleStore } from '../stores/modules'
import { getModuleStatus } from '../services/ipc'
import { windowMinimize, windowMaximize, windowClose } from '../services/ipc'
import { IPC } from '../../shared/ipc-contract'
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
const route = useRoute()
const activeTab = ref('home')
const showMenu = ref(false)
const menuBtn = ref<HTMLElement | null>(null)

// 模拟用户信息
const userInfo = ref({
  name: '管理员',
  avatar: ''
})

const getStatusClass = (service: string) => {
  const status = (moduleStore.dots as any)[service] || 'loading'
  return `status-${status}`
}

const handleTabChange = (key: string) => {
  activeTab.value = key
  if (key === 'home') router.push({ name: 'home' })
  else router.push({ name: key as any })
}

// 根据当前路由同步顶部选中项
function syncTabWithRoute() {
  const name = (route.name as string) || ''
  const lower = name.toLowerCase()
  if (['home','n8n','dify','oneapi','ragflow'].includes(lower)) {
    activeTab.value = lower === '' ? 'home' : lower
  }
}

onMounted(syncTabWithRoute)
watch(() => route.name, syncTabWithRoute)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function onDocClick(e: MouseEvent) {
  const t = e.target as Node
  if (!menuBtn.value) { showMenu.value = false; return }
  if (menuBtn.value.contains(t)) return
  const menuEl = document.querySelector('.custom-menu')
  if (menuEl && menuEl.contains(t)) return
  showMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  // 订阅模块状态事件：即便不在首页，也能实时更新顶部状态点
  try {
    const onStatus = (_e: any, payload: any) => {
      const name = String(payload?.name || '').toLowerCase()
      const resp = payload?.status
      if (!name || !resp?.success) return
      const st = resp.data as any
      ;(moduleStore.dots as any)[name] = (st.status === 'parse_error' ? 'error' : st.status)
    }
    ;(window as any).api.on(IPC.ModuleStatusEvent, onStatus)
    onBeforeUnmount(() => {
      try {
        (window as any).api.off?.(IPC.ModuleStatusEvent, onStatus)
        ;(window as any).api.removeListener?.(IPC.ModuleStatusEvent, onStatus)
      } catch {}
    })
  } catch {}
})

// 启动时主动拉取一次初始状态，避免首次进入时状态点为空/未更新
onMounted(async () => {
  const names: string[] = ['n8n','dify','oneapi','ragflow']
  for (const n of names) {
    try {
      const resp = await getModuleStatus(n as any)
      const st = (resp as any)?.status
      ;(moduleStore.dots as any)[n] = st === 'parse_error' ? 'error' : (st || 'stopped')
    } catch {}
  }
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

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

// 窗口控制函数（后续可接 IPC）
const handleClose = () => { windowClose() }
const handleMinimize = () => { windowMinimize() }
const handleMaximize = () => { windowMaximize() }
const handleMenu = () => { /* 示例菜单通过 a-dropdown 在右侧 user-section 已体现 */ }
</script>

<style scoped>
.top-tabs {
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 8px; /* 两侧留白，避免过于贴边，同时保留较大点击区 */
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
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

.logo-text { display: flex; flex-direction: column; }
.app-name { font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); line-height: 1.2; }
.app-subtitle { font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.2; }

.tabs-container { flex: 1; }

.user-section { margin-left: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-lg); }
.user-info { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-base); background: rgba(0, 0, 0, 0.02); border: 1px solid var(--border-light); }
.user-info:hover { background: var(--bg-tertiary); box-shadow: var(--shadow-sm); }
.user-name { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); }
.dropdown-icon { font-size: 12px; color: var(--text-secondary); transition: transform var(--transition-base); }
.user-info:hover .dropdown-icon { transform: rotate(180deg); }

.custom-tabs :deep(.ant-tabs-nav) { margin: 0; background: transparent; }
.custom-tabs :deep(.ant-tabs-tab) { background: transparent; border: none; border-radius: var(--radius-md) var(--radius-md) 0 0; margin-right: var(--spacing-sm); padding: var(--spacing-md) var(--spacing-lg); color: var(--text-secondary); font-weight: 500; transition: all var(--transition-base); position: relative; overflow: hidden; }
.custom-tabs :deep(.ant-tabs-tab::before) { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, transparent 0%, rgba(0, 122, 255, 0.05) 100%); opacity: 0; transition: opacity var(--transition-base); }
.custom-tabs :deep(.ant-tabs-tab:hover) { background: var(--bg-tertiary); color: var(--primary-color); transform: translateY(-2px) scale(1.02); }
.custom-tabs :deep(.ant-tabs-tab-active) { background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); color: var(--text-white) !important; box-shadow: var(--shadow-md); }
.custom-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) { color: var(--text-white) !important; }
.custom-tabs :deep(.ant-tabs-ink-bar) { display: none; }

.tab-content { display: flex; align-items: center; gap: var(--spacing-sm); }
.status-indicator { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.status-running { background-color: var(--success-color); animation: pulse 2s infinite; box-shadow: 0 0 4px var(--success-color); }
.status-stopped { background-color: var(--text-tertiary); }
.status-error { background-color: var(--error-color); animation: blink 1s infinite; box-shadow: 0 0 4px var(--error-color); }

@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.3; } }

.mac-controls { display: flex !important; align-items: center; gap: 8px; padding-left: 8px; visibility: visible; }
.mac-button { width: 12px; height: 12px; border-radius: 50%; background-color: #d9d9d9; position: relative; }
.mac-button.close { background-color: #ff5f57; }
.mac-button.minimize { background-color: #ffbd2e; }
.mac-button.maximize { background-color: #28ca42; }
/* 取消 hover 背景矩形，保持原生风格（不添加任何 :hover 背景） */
.mac-button:hover::after { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -52%); color: rgba(0,0,0,0.65); font-size: 10px; font-weight: 700; }
.mac-button.close:hover::after { content: '×'; }
.mac-button.minimize:hover::after { content: '−'; }
.mac-button.maximize:hover::after { content: '+'; }

/* Windows 窗口控制按钮 */
.windows-controls { display: flex; align-items: center; gap: 0; margin-right: 0; }
.hit-area { padding: 8px 12px; border-radius: 0; }
.hit-area:hover { background: var(--bg-tertiary); }
.windows-button.close.hit-area { margin-right: -8px; }
.windows-button { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all var(--transition-base); color: var(--text-secondary); font-size: 14px; }
.windows-button:hover { background-color: var(--bg-tertiary); color: var(--text-primary); }
.windows-button.close:hover { background-color: #e81123; color: white; }
.windows-button.maximize:hover,
.windows-button.minimize:hover { background-color: var(--bg-tertiary); }
.windows-button.menu:hover { background-color: var(--primary-color); color: white; }

/* 自定义菜单：无动画，出现在菜单按钮的左下方，距离更近 */
.menu-wrapper { position: relative; }
.custom-menu { position: absolute; right: 100%; top: calc(100% + 14px); transform: translateX(33px); background: #fff; border: 1px solid var(--border-light); border-radius: 8px; box-shadow: var(--shadow-lg); min-width: 180px; z-index: 9999; }
.custom-menu-item { padding: 8px 12px; cursor: pointer; white-space: nowrap; }
.custom-menu-item:hover { background: var(--bg-tertiary); }
.custom-menu-divider { height: 1px; background: var(--border-light); margin: 4px 0; }
</style>
