<template>
  <div id="app" class="app-container">
    <!-- 顶部Tab导航栏 -->
    <div class="top-tabs">
      <div class="tab-container">
        <div 
          v-for="tab in tabs" 
          :key="tab.key"
          :class="['tab-item', { active: activeTab === tab.key }]"
          @click="handleTabClick(tab)"
        >
          <span class="tab-text">{{ tab.label }}</span>
          <span v-if="tab.status" :class="['status-dot', tab.status]"></span>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const activeTab = ref('home')

const tabs = ref([
  { key: 'home', label: '首页', route: '/' },
  { key: 'n8n', label: 'n8n', status: 'running', route: '/n8n' },
  { key: 'dify', label: 'Dify', status: 'stopped', route: '/dify' },
  { key: 'oneapi', label: 'OneAPI', status: 'running', route: '/oneapi' },
  { key: 'ragflow', label: 'RagFlow', status: 'error', route: '/ragflow' }
])

// 监听路由变化，更新活动Tab
watch(() => route.path, (newPath) => {
  const tab = tabs.value.find(t => t.route === newPath)
  if (tab) {
    activeTab.value = tab.key
  }
}, { immediate: true })

// Tab点击处理
const handleTabClick = (tab: any) => {
  activeTab.value = tab.key
  router.push(tab.route)
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.top-tabs {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.tab-container {
  display: flex;
  gap: 4px;
  max-width: 1200px;
  margin: 0 auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #666;
  background: transparent;
  position: relative;
  user-select: none;
}

.tab-item:hover {
  background: rgba(24, 144, 255, 0.08);
  color: #1890ff;
  transform: translateY(-1px);
}

.tab-item.active {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  transform: translateY(-2px);
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
}

.tab-text {
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  position: relative;
}

.status-dot.running {
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.6);
  animation: pulse 2s infinite;
}

.status-dot.stopped {
  background: #8c8c8c;
}

.status-dot.error {
  background: #ff4d4f;
  animation: blink 1s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 8px rgba(82, 196, 26, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(82, 196, 26, 0.8);
  }
  100% {
    box-shadow: 0 0 8px rgba(82, 196, 26, 0.6);
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

.main-content {
  height: calc(100vh - 60px);
  overflow-y: auto;
}

/* 滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>