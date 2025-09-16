<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'

const activeTab = ref('home')

const services = [
  { key: 'n8n', name: 'n8n', status: 'running' },
  { key: 'dify', name: 'Dify', status: 'stopped' },
  { key: 'oneapi', name: 'OneAPI', status: 'running' },
  { key: 'ragflow', name: 'RagFlow', status: 'error' }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running': return '#34C759'
    case 'stopped': return '#8E8E93'
    case 'error': return '#FF3B30'
    default: return '#8E8E93'
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 顶部 Tab 导航栏 -->
    <div class="top-tabs">
      <div class="tab-container">
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'home' }"
          @click="activeTab = 'home'"
        >
          首页
        </div>
        <div 
          v-for="service in services" 
          :key="service.key"
          class="tab-item" 
          :class="{ active: activeTab === service.key }"
          @click="activeTab = service.key"
        >
          {{ service.name }}
          <span 
            class="status-dot" 
            :style="{ backgroundColor: getStatusColor(service.status) }"
          ></span>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.top-tabs {
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E7;
  padding: 0 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tab-container {
  display: flex;
  gap: 2px;
  max-width: none;
  margin: 0;
}

.tab-item {
  padding: 12px 20px;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #F2F2F7;
  color: #3C3C43;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  user-select: none;
  border: 1px solid #E5E5E7;
  border-bottom: none;
}

.tab-item:hover {
  background: #E5E5EA;
  color: #1C1C1E;
  transform: translateY(-1px);
}

.tab-item.active {
  background: #FFFFFF;
  color: #007AFF;
  border-color: #E5E5E7;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  z-index: 1;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(24, 144, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
  }
}

.main-content {
  flex: 1;
  padding: 0;
}
</style>
