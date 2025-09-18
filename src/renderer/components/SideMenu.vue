<template>
  <div class="side-menu glass-effect">
    <div class="menu-header">
      <h3 class="menu-title">AI-Server</h3>
      <p class="menu-subtitle">管理平台</p>
    </div>
    
    <a-menu
      v-model:selectedKeys="selectedKeys"
      mode="inline"
      class="custom-menu"
      @select="handleMenuSelect"
    >
      <a-menu-item key="dashboard" class="menu-item">
        <template #icon>
          <dashboard-outlined />
        </template>
        仪表盘
      </a-menu-item>
      
      <a-menu-divider />
      
      <a-menu-item key="system-settings" class="menu-item">
        <template #icon>
          <setting-outlined />
        </template>
        系统设置
      </a-menu-item>
      
      <a-menu-divider />
      
      <a-menu-item key="logs" class="menu-item">
        <template #icon>
          <file-text-outlined />
        </template>
        系统日志
      </a-menu-item>
      
      <a-menu-item key="monitoring" class="menu-item">
        <template #icon>
          <monitor-outlined />
        </template>
        性能监控
      </a-menu-item>
    </a-menu>
    
    <div class="menu-footer">
      <div class="system-info">
        <p class="info-item">
          <span class="info-label">版本:</span>
          <span class="info-value">v1.0.0</span>
        </p>
        <p class="info-item">
          <span class="info-label">状态:</span>
          <span class="status-indicator status-running"></span>
          <span class="info-value">运行中</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  DashboardOutlined,
  SettingOutlined,
  ToolOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  MonitorOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()

const selectedKeys = ref<string[]>(['dashboard'])

const handleMenuSelect = ({ key }: { key: string }) => {
  selectedKeys.value = [key]
  
  // 路由跳转逻辑
  if (key === 'dashboard') {
    router.push({ name: 'home' })
  } else if (key === 'system-settings') {
    router.push('/settings')
  } else if (key === 'logs') {
    if (String(route.name || '').toLowerCase() === 'logs') {
      window.dispatchEvent(new CustomEvent('reopen-logs'))
    } else {
      router.push('/logs')
    }
  } else if (key === 'monitoring') {
    router.push('/monitoring')
  } else {
    router.push(`/${key}`)
  }
}

// 根据路由变化同步选中项
watch(() => route.name, (n) => {
  const name = String(n || '').toLowerCase()
  if (name === 'home') selectedKeys.value = ['dashboard']
  else if (name === 'settings') selectedKeys.value = ['system-settings']
  else if (name === 'logs') selectedKeys.value = ['logs']
  else if (name === 'monitoring') selectedKeys.value = ['monitoring']
})
</script>

<style scoped>
.side-menu {
  width: 240px;
  height: calc(100vh - 40px);
  padding: var(--spacing-lg);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 40px;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.08);
}

.menu-header { padding: var(--spacing-lg) 0; text-align: center; border-bottom: 1px solid var(--border-light); margin-bottom: var(--spacing-lg); }
.menu-title { font-size: var(--text-xl); font-weight: 600; color: var(--text-primary); margin: 0; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.menu-subtitle { font-size: var(--text-sm); color: var(--text-secondary); margin: var(--spacing-xs) 0 0 0; }

.custom-menu { flex: 1; border: none; background: transparent; }
.custom-menu :deep(.ant-menu-item) { border-radius: var(--radius-md); margin: var(--spacing-xs) 0; padding: var(--spacing-md) var(--spacing-lg); height: auto; line-height: 1.5; transition: all var(--transition-base); color: var(--text-secondary); font-weight: 500; }
.custom-menu :deep(.ant-menu-item:hover) { background: linear-gradient(135deg, var(--primary-light) 0%, rgba(0, 122, 255, 0.1) 100%); color: var(--primary-color); transform: translateX(4px); }
.custom-menu :deep(.ant-menu-item-selected) { background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); color: var(--text-white) !important; box-shadow: var(--shadow-md); }
.custom-menu :deep(.ant-menu-item-selected:hover) { color: var(--text-primary) !important; }
.custom-menu :deep(.ant-menu-divider) { background-color: var(--border-light); margin: var(--spacing-md) 0; }

.menu-footer { padding-top: var(--spacing-lg); border-top: 1px solid var(--border-light); }
.system-info { padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--border-light); }
.info-item { display: flex; align-items: center; justify-content: space-between; margin: var(--spacing-xs) 0; font-size: var(--text-sm); }
.info-label { color: var(--text-secondary); }
.info-value { color: var(--text-primary); font-weight: 500; }
.status-indicator { width: 6px; height: 6px; border-radius: 50%; margin: 0 var(--spacing-xs); }

/* 响应式设计 */
@media (max-width: 768px) {
  .side-menu { transform: translateX(-100%); transition: transform var(--transition-base); }
  .side-menu.mobile-open { transform: translateX(0); }
}
</style>
