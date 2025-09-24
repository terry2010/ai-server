<template>
  <div class="top-tabs">
    <!-- Mac 窗口控制按钮 -->
    <div class="mac-controls" v-show="windowControlsMode !== 'windows'">
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
    
    <div class="tabs-container" @dblclick="handleMaximize">
      <a-tabs 
        v-model:activeKey="activeTab" 
        type="card" 
        class="custom-tabs"
        @change="handleTabChange"
      >
        <a-tab-pane key="home" tab="首页" />
        <!-- 模块类 Tabs（带状态点，可拖拽，按运行/异常过滤） -->
        <a-tab-pane v-for="mod in moduleTabs" :key="mod">
          <template #tab>
            <span class="tab-content" :data-mod="mod">
              {{ getTabLabel(mod) }}
              <span :class="['status-indicator', getStatusClass(mod)]"></span>
            </span>
          </template>
        </a-tab-pane>
        <!-- 页面类 Tabs（guide/market）：不显示状态点，右侧显示关闭X，不参与拖拽与顺序持久化） -->
        <a-tab-pane v-for="p in pageTabs" :key="p">
          <template #tab>
            <span class="tab-content" :data-mod="p">
              {{ getTabLabel(p) }}
              <button class="closer" type="button" title="关闭" @click.stop="closePageTab(p)" @keydown.enter.stop.prevent="closePageTab(p)" @keydown.space.stop.prevent="closePageTab(p)">×</button>
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
      <div class="windows-controls" v-show="windowControlsMode !== 'mac'">
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
        <div class="windows-button maximize hit-area" @click="handleMaximize" :title="isMaximized ? '还原' : '最大化'">
          <component :is="isMaximized ? FullscreenExitOutlined : BorderOutlined" />
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
import Sortable from 'sortablejs'
import { useRouter, useRoute } from 'vue-router'
import { moduleStore } from '../stores/modules'
import { getModuleStatus, bvRelease } from '../services/ipc'
import { windowMinimize, windowMaximize, windowClose, windowGetState } from '../services/ipc'
import { IPC } from '../../shared/ipc-contract'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  DownOutlined,
  RobotOutlined,
  MenuOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const activeTab = ref('home')
const defaultModules = ['n8n','dify','oneapi','ragflow'] as const
// 维护一个“顺序”列表（包含所有模块）；实际渲染根据状态过滤
const orderTabs = ref<string[]>([...defaultModules])
const moduleTabs = ref<string[]>([])
// 页面类 Tabs：在线教程、AI市场（通过路由打开/关闭）
const pageTabs = ref<Array<'guide'|'market'>>([])
const showMenu = ref(false)
const menuBtn = ref<HTMLElement | null>(null)
const isMaximized = ref(false)
const windowControlsMode = ref<'all'|'mac'|'windows'>('all')
// 错误态去抖：错误需持续到某时间点才展示，避免短暂网络/探测抖动
const errTimers: Record<string, number> = {}
const errDeadline: Record<string, number> = {}
let dotsTimer: number | null = null

// 模拟用户信息
const userInfo = ref({
  name: '管理员',
  avatar: ''
})

const getStatusClass = (service: string) => {
  const status = (moduleStore.dots as any)[service] || 'stopped'
  return `status-${status}`
}

// 统一设置模块状态（含错误态去抖：需稳定5秒）
function setModuleDot(name: string, raw: any) {
  const v = raw === 'parse_error' ? 'error' : (raw || 'stopped')
  if (v === 'error') {
    // 5秒后若仍是错误再落盘
    const now = Date.now()
    errDeadline[name] = now + 5000
    if (errTimers[name]) window.clearTimeout(errTimers[name])
    errTimers[name] = window.setTimeout(() => {
      if (Date.now() >= (errDeadline[name] || 0)) {
        (moduleStore.dots as any)[name] = 'error'
        recomputeVisibleTabs()
      }
    }, 5100)
  } else {
    // running/stopped 立即落盘并清理错误定时
    if (errTimers[name]) { window.clearTimeout(errTimers[name]); delete errTimers[name] }
    delete errDeadline[name]
    if ((moduleStore.dots as any)[name] !== v) {
      (moduleStore.dots as any)[name] = v
      recomputeVisibleTabs()
    }
  }
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
  // 页面类：从路由进入时，自动加入到 pageTabs
  if (lower === 'guide' || lower === 'market') {
    if (!pageTabs.value.includes(lower)) pageTabs.value.push(lower)
  }
  if (['home', ...moduleTabs.value, ...pageTabs.value].includes(lower)) {
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
  // 初始化窗口状态
  windowGetState().then(s => { isMaximized.value = !!s.isMaximized }).catch(() => {})
  // 订阅窗口状态变更事件
  try {
    const onState = (_e: any, s: any) => { isMaximized.value = !!s?.isMaximized }
    ;(window as any).api.on(IPC.WindowStateEvent, onState)
    onBeforeUnmount(() => {
      try { (window as any).api.off?.(IPC.WindowStateEvent, onState); (window as any).api.removeListener?.(IPC.WindowStateEvent, onState) } catch {}
    })
  } catch {}
  // 初始化 UI 窗口控制样式
  ;(window as any).api.invoke(IPC.ConfigGet, 'global').then((res: any) => {
    try {
      const mode = res?.data?.ui?.windowControlsMode
      windowControlsMode.value = (mode === 'mac' || mode === 'windows' || mode === 'all') ? mode : 'all'
      const order = res?.data?.ui?.tabOrder
      if (Array.isArray(order)) {
        const valid = order.filter((k: any) => defaultModules.includes(k))
        // 追加漏掉的模块
        const merged = Array.from(new Set([...(valid as string[]), ...defaultModules]))
        orderTabs.value = merged
      }
      recomputeVisibleTabs()
    } catch {}
  }).catch(() => {})
  // 监听设置页实时事件
  window.addEventListener('ui-window-controls-mode', (e: any) => {
    const m = e?.detail
    if (m === 'mac' || m === 'windows' || m === 'all') windowControlsMode.value = m
  })
  // 订阅模块状态事件：即便不在首页，也能实时更新顶部状态点
  try {
    const onStatus = (_e: any, payload: any) => {
      const name = String(payload?.name || '').toLowerCase()
      const resp = payload?.status
      if (!name || !resp?.success) return
      const st = resp.data as any
      setModuleDot(name, st.status)
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
      setModuleDot(n, st)
    } catch {}
  }
  // 初始化 Sortable 拖拽
  setTimeout(initSortable, 0)
  // 监听重置顺序事件
  window.addEventListener('ui-reset-tab-order', resetTabOrder)
  // 增加轻量轮询，避免外部启动模块后顶部未及时出现
  dotsTimer = window.setInterval(async () => {
    const names: string[] = ['n8n','dify','oneapi','ragflow']
    for (const n of names) {
      try {
        const resp = await getModuleStatus(n as any)
        const st = (resp as any)?.status
        setModuleDot(n, st)
      } catch {}
    }
  }, 8000)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
onBeforeUnmount(() => {
  try { window.removeEventListener('ui-reset-tab-order', resetTabOrder) } catch {}
  if (dotsTimer) { window.clearInterval(dotsTimer); dotsTimer = null }
})

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

// --- 拖拽排序：统一由 Sortable 管理 ---

function getTabLabel(k: string): string {
  if (k === 'n8n') return 'n8n'
  if (k === 'dify') return 'Dify'
  if (k === 'oneapi') return 'OneAPI'
  if (k === 'ragflow') return 'RagFlow'
  if (k === 'guide') return '在线教程'
  if (k === 'market') return 'AI市场'
  return k
}

// 使用 Sortable 直接对 Ant Tabs 的 nav 列表启用拖拽
let sortable: Sortable | null = null
function initSortable() {
  try {
    const list = document.querySelector('.custom-tabs .ant-tabs-nav-list') as HTMLElement | null
    if (!list || sortable) return
    sortable = Sortable.create(list, {
      animation: 150,
      draggable: '.ant-tabs-tab',
      onMove(evt: any) {
        const dragged = evt.dragged as HTMLElement
        const related = evt.related as HTMLElement | null
        // 禁止拖动首页（第一个）或放到首页前面
        if (dragged && dragged.parentElement && dragged.parentElement.firstElementChild === dragged) return false
        if (related && related.parentElement && related.parentElement.firstElementChild === related) return false
        return true
      },
      async onEnd() {
        const listEl = sortable!.el as HTMLElement
        const items = Array.from(listEl.querySelectorAll('.ant-tabs-tab')) as HTMLElement[]
        // 跳过第一个（首页），读取每个 tab 内部 .tab-content 的 data-mod
        const keys: string[] = []
        items.slice(1).forEach(li => {
          const span = li.querySelector('.tab-content') as HTMLElement | null
          const mod = span?.dataset?.mod
          if (mod) keys.push(mod)
        })
        if (keys.length > 0) {
          const prevKey = orderTabs.value.join('|')
          // 页面类顺序（不持久化，仅同步内存）
          const pages = keys.filter(k => k === 'guide' || k === 'market') as Array<'guide'|'market'>
          pageTabs.value = Array.from(new Set(pages))
          // 模块类顺序（仅持久化模块）
          const modSet = new Set(['n8n','dify','oneapi','ragflow'] as string[])
          const draggedMods = keys.filter(k => modSet.has(k))
          // 以当前的完整顺序为基准，将未出现在拖拽结果中的模块按原相对顺序追加，确保 4 个模块都在列表里
          const currentFull = orderTabs.value.length ? orderTabs.value.slice() : Array.from(defaultModules)
          const missing = currentFull.filter(k => !draggedMods.includes(k))
          const nextOrder = [...draggedMods, ...missing]
          orderTabs.value = nextOrder
          recomputeVisibleTabs()
          // 只保存模块顺序
          const nextKey = nextOrder.join('|')
          if (nextKey !== prevKey) {
            try {
              await (window as any).api.invoke(IPC.ConfigSet, { global: { ui: { tabOrder: nextOrder } } })
              message.success('顶部模块顺序已保存')
            } catch (err) {
              console.error('[tabs] save order fail', err)
              message.error('保存模块顺序失败')
            }
          }
        }
      }
    })
  } catch {}
}

function resetTabOrder() {
  orderTabs.value = [...defaultModules]
  recomputeVisibleTabs()
  try { (window as any).api.invoke(IPC.ConfigSet, { global: { ui: { tabOrder: orderTabs.value } } }) } catch {}
}

// 仅展示运行/异常的模块 Tab
function recomputeVisibleTabs() {
  const visible = orderTabs.value.filter(k => {
    const st = (moduleStore.dots as any)[k]
    return st === 'running' || st === 'error' || st === 'parse_error'
  })
  moduleTabs.value = visible
  // 若当前激活的模块已不可见，切回首页
  if (activeTab.value !== 'home' && ![...moduleTabs.value, ...pageTabs.value].includes(activeTab.value)) {
    activeTab.value = 'home'
    router.push({ name: 'home' })
  }
}

// 关闭页面类 Tab，并释放对应 BrowserView
async function closePageTab(key: 'guide'|'market') {
  try {
    // 若当前正在查看被关闭页，则先切回首页
    if (activeTab.value === key) {
      activeTab.value = 'home'
      router.push({ name: 'home' })
    }
    try {
      await bvRelease(key as any)
      message.success(`已关闭 ${getTabLabel(key)} 页`)
    } catch (err) {
      console.error('[tabs] release page fail', err)
      message.error('关闭页面失败')
    }
  } finally {
    pageTabs.value = pageTabs.value.filter(x => x !== key)
  }
}
</script>

<style scoped>
.top-tabs {
  margin: -1px 0 0 0;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 6px; /* 缩小左右留白以适配 40px 高度 */
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  position: relative;
  z-index: 1000;
  -webkit-app-region: drag; /* 允许在空白处拖动窗口 */
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-right: var(--spacing-xl);
  padding: var(--spacing-sm);
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-white);
  font-size: 16px;
  box-shadow: var(--shadow-md);
}

.logo-text { display: flex; flex-direction: column; }
.app-name { font-size: 14px; font-weight: 600; color: var(--text-primary); line-height: 1; }
.app-subtitle { font-size: 10px; color: var(--text-secondary); line-height: 1; }

.tabs-container { flex: 1; position: relative; z-index: 1500; }

.user-section { margin-left: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-lg); -webkit-app-region: no-drag; }
.user-info { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-base); background: rgba(0, 0, 0, 0.02); border: 1px solid var(--border-light); }
.user-info:hover { background: var(--bg-tertiary); box-shadow: var(--shadow-sm); }
.user-name { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); }
.dropdown-icon { font-size: 12px; color: var(--text-secondary); transition: transform var(--transition-base); }
.user-info:hover .dropdown-icon { transform: rotate(180deg); }

.custom-tabs :deep(.ant-tabs-nav) { margin: 0; background: transparent; }
.custom-tabs :deep(.ant-tabs-nav-wrap),
.custom-tabs :deep(.ant-tabs-nav-list) { overflow: visible; }
.custom-tabs :deep(.ant-tabs-tab) { background: transparent; border: none; border-radius: 0 0 12px 12px !important; margin-right: 8px; padding: 8px 20px; color: var(--text-secondary); font-weight: 600; transition: all var(--transition-base); position: relative; overflow: visible; min-width: 110px; justify-content: center; background-clip: padding-box; -webkit-app-region: no-drag; z-index: 0; }
.custom-tabs :deep(.ant-tabs-tab:not(:first-child)) { height: 53px; padding: 0 24px; margin-top: -1px; }
.custom-tabs :deep(.ant-tabs-tab:not(:first-child) .tab-content) { margin-top: 0; }
.custom-tabs :deep(.ant-tabs-tab::before) { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, transparent 0%, rgba(0, 122, 255, 0.05) 100%); opacity: 0; transition: opacity var(--transition-base); border-bottom-left-radius: 12px !important; border-bottom-right-radius: 12px !important; border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; pointer-events: none; z-index: 0; }
.custom-tabs :deep(.ant-tabs-tab:hover) { background: var(--bg-tertiary); color: var(--text-primary); }
.custom-tabs :deep(.ant-tabs-tab:not(.ant-tabs-tab-active):hover) { background: rgba(0, 0, 0, 0.08); box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04); border-bottom-left-radius: 6px !important; border-bottom-right-radius: 6px !important; height: 49px; padding: 0 22px; }
.custom-tabs :deep(.ant-tabs-tab:hover .ant-tabs-tab-btn) { color: var(--text-primary) !important; }
.custom-tabs :deep(.ant-tabs-tab-active) { background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); color: var(--text-white) !重要; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.22); margin-bottom: -12px; z-index: 2000; position: relative; border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; border-bottom-left-radius: 12px !important; border-bottom-right-radius: 12px !重要; margin-top: 0; }
.custom-tabs :deep(.ant-tabs-tab-active:not(:first-child)) { margin-top: -5px; border-bottom-left-radius: 6px !important; border-bottom-right-radius: 6px !important; padding: 0 26px; height: 53px; box-shadow: 0 6px 10px rgba(0, 0, 0, 0.24); }
.custom-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) { color: var(--text-white) !important; }
.custom-tabs :deep(.ant-tabs-tab-active:hover) { filter: brightness(0.98); }
.custom-tabs :deep(.ant-tabs-tab-active:hover .ant-tabs-tab-btn) { color: var(--text-primary) !important; }
.custom-tabs :deep(.ant-tabs-ink-bar) { display: none; }

.tab-content { display: flex; align-items: center; gap: var(--spacing-sm); -webkit-app-region: no-drag; position: relative; z-index: 1; }
.tab-content[draggable="true"] { cursor: grab; user-select: none; }
.tab-content.drag-over { outline: 2px dashed rgba(0,0,0,0.2); border-radius: 8px; }
.status-indicator { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.status-running { background-color: var(--success-color); animation: pulse 2s infinite; box-shadow: 0 0 4px var(--success-color); }
.status-stopped { background-color: var(--text-tertiary); }
.status-error { background-color: var(--error-color); animation: blink 1s infinite; box-shadow: 0 0 4px var(--error-color); }
/* 页面类 Tab 的关闭按钮样式 */
.closer { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; font-weight: 700; cursor: pointer; margin-left: 10px; -webkit-app-region: no-drag; font-size: 14px; line-height: 1; border: none; background: transparent; color: inherit; opacity: 0.65; transition: color var(--transition-base), background-color var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base); pointer-events: auto; }
.closer:hover { background: rgba(0, 0, 0, 0.12); box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05); opacity: 1; }
.custom-tabs :deep(.ant-tabs-tab-active .closer) { color: var(--text-white); opacity: 0.8; }
.custom-tabs :deep(.ant-tabs-tab-active:hover .closer) { color: var(--text-primary); }
.custom-tabs :deep(.ant-tabs-tab-active .closer:hover) { background: rgba(255, 255, 255, 0.2); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25); color: var(--text-primary); }
.closer:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }

@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.3; } }

.mac-controls { display: flex; align-items: center; gap: 8px; padding-left: 8px; visibility: visible; -webkit-app-region: no-drag; }
.mac-button { width: 12px; height: 12px; border-radius: 50%; background-color: #d9d9d9; position: relative; }
.mac-button.close { background-color: #ff5f57; }
.mac-button.minimize { background-color: #ffbd2e; }
.mac-button.maximize { background-color: #28ca42; }
/* 取消 hover 背景矩形，保持原生风格（不添加任何 :hover 背景） */
.mac-button:hover::after { content: attr(data-symbol); position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,0.7); font-size: 10px; font-weight: 700; line-height: 1; }
.mac-button.close:hover::after { content: '×'; }
.mac-button.minimize:hover::after { content: '−'; }
.mac-button.maximize:hover::after { content: '+'; }
.mac-button.close:hover::after { content: '×'; }
.mac-button.minimize:hover::after { content: '−'; }
.mac-button.maximize:hover::after { content: '+'; }

/* Windows 窗口控制按钮 */
.windows-controls { display: flex; align-items: center; gap: 4px; padding-right: 8px; -webkit-app-region: no-drag; }
.hit-area { padding: 6px 8px; border-radius: 0; }
.hit-area:hover { background: var(--bg-tertiary); }
.windows-button.close.hit-area { margin-right: -6px; }
.windows-button { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all var(--transition-base); color: var(--text-secondary); font-size: 13px; }
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
