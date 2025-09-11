<script setup lang="ts">
import { ref } from 'vue'
import WelcomeBanner from '../components/WelcomeBanner.vue'
import ServiceCard from '../components/ServiceCard.vue'

// 模拟服务数据
const services = ref([
  {
    serviceName: 'n8n',
    serviceDescription: '工作流自动化平台，用于连接各种应用和服务',
    serviceType: 'n8n' as const,
    status: 'running' as const,
    cpuUsage: 15,
    memoryUsage: 32,
    port: '5678',
    uptime: '2小时 15分钟'
  },
  {
    serviceName: 'Dify',
    serviceDescription: 'AI 应用开发平台，快速构建和部署 AI 应用',
    serviceType: 'dify' as const,
    status: 'stopped' as const,
    cpuUsage: 0,
    memoryUsage: 0,
    port: '3000',
    uptime: '0分钟'
  },
  {
    serviceName: 'OneAPI',
    serviceDescription: 'OpenAI API 代理服务，统一管理多个 AI 模型接口',
    serviceType: 'oneapi' as const,
    status: 'running' as const,
    cpuUsage: 8,
    memoryUsage: 18,
    port: '3001',
    uptime: '1小时 45分钟'
  },
  {
    serviceName: 'RagFlow',
    serviceDescription: 'RAG 知识库问答系统，基于文档的智能问答',
    serviceType: 'ragflow' as const,
    status: 'error' as const,
    cpuUsage: 0,
    memoryUsage: 0,
    port: '9380',
    uptime: '0分钟'
  }
])
</script>

<template>
  <div class="home-view">
    <WelcomeBanner />
    
    <div class="services-section">
      <h2 class="section-title">服务模块</h2>
      <div class="services-grid">
        <ServiceCard
          v-for="service in services"
          :key="service.serviceName"
          :service-name="service.serviceName"
          :service-description="service.serviceDescription"
          :service-type="service.serviceType"
          :status="service.status"
          :cpu-usage="service.cpuUsage"
          :memory-usage="service.memoryUsage"
          :port="service.port"
          :uptime="service.uptime"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  padding: var(--spacing-lg);
  min-height: 100vh;
}

.services-section {
  margin-top: var(--spacing-xl);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-xl);
  justify-items: stretch;
  justify-content: center;
  max-width: calc(100vw - 240px - 32px);
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-view {
    padding: var(--spacing-md);
  }
  
  .services-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
}


</style>
