<template>
  <div class="welcome-banner">
    <div class="banner-background">
      <div class="geometric-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
    </div>
    
    <div class="banner-content">
      <div class="welcome-section">
        <h1 class="welcome-title">欢迎使用 AI-Server 管理平台</h1>
        <p class="welcome-subtitle">统一管理和监控您的 AI 服务模块</p>
        
        <div class="system-overview">
          <div class="overview-item">
            <span class="overview-label">运行服务</span>
            <span class="overview-value">{{ runningServices }}/{{ totalServices }}</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">系统状态</span>
            <span class="overview-value status-text">{{ systemStatus }}</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">运行时间</span>
            <span class="overview-value">{{ uptime }}</span>
          </div>
        </div>
      </div>
      
      <div class="action-section">
        <div class="quick-actions">
          <a-button type="primary" size="large" class="action-btn" @click="startAllServices">
            <template #icon>
              <play-circle-outlined />
            </template>
            启动所有服务
          </a-button>
          
          <a-button size="large" class="action-btn" @click="refreshStatus">
            <template #icon>
              <reload-outlined />
            </template>
            刷新状态
          </a-button>
          
          <a-button size="large" class="action-btn" @click="viewLogs">
            <template #icon>
              <file-text-outlined />
            </template>
            查看日志
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  PlayCircleOutlined,
  ReloadOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

const runningServices = ref(2)
const totalServices = ref(4)
const systemStatus = ref('正常')
const uptime = ref('2小时 15分钟')

const startAllServices = () => {
  console.log('启动所有服务')
  // 这里添加启动所有服务的逻辑
}

const refreshStatus = () => {
  console.log('刷新状态')
  // 这里添加刷新状态的逻辑
}

const viewLogs = () => {
  console.log('查看日志')
  // 这里添加查看日志的逻辑
}

onMounted(() => {
  // 模拟实时更新运行时间
  setInterval(() => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    uptime.value = `${hours}小时 ${minutes}分钟`
  }, 60000)
})
</script>

<style scoped>
.welcome-banner {
  height: 160px;
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
}

.banner-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    var(--primary-color) 0%, 
    var(--primary-hover) 50%, 
    #40a9ff 100%);
  opacity: 0.95;
}

.geometric-shapes {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 80px;
  height: 80px;
  top: -20px;
  right: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 120px;
  height: 120px;
  top: 50%;
  right: -30px;
  animation-delay: 2s;
}

.shape-3 {
  width: 60px;
  height: 60px;
  bottom: -10px;
  left: 15%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.banner-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xl);
  color: var(--text-white);
}

.welcome-section {
  flex: 1;
}

.welcome-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  margin: 0 0 var(--spacing-sm) 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.welcome-subtitle {
  font-size: var(--text-base);
  margin: 0 0 var(--spacing-lg) 0;
  opacity: 0.9;
}

.system-overview {
  display: flex;
  gap: var(--spacing-xl);
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.overview-label {
  font-size: var(--text-sm);
  opacity: 0.8;
}

.overview-value {
  font-size: var(--text-lg);
  font-weight: 600;
}

.status-text {
  color: #4ade80;
}

.action-section {
  display: flex;
  align-items: center;
}

.quick-actions {
  display: flex;
  gap: var(--spacing-md);
}

.action-btn {
  border-radius: var(--radius-md);
  font-weight: 500;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all var(--transition-base);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.action-btn.ant-btn-primary {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: var(--text-white);
}

.action-btn.ant-btn-primary:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.4);
}

.action-btn:not(.ant-btn-primary) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-white);
}

.action-btn:not(.ant-btn-primary):hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
  }
  
  .system-overview {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .quick-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>
