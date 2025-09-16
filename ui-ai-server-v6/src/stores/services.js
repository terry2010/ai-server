import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useServicesStore = defineStore('services', () => {
  // 服务状态数据
  const services = ref([
    {
      id: 'n8n',
      name: 'n8n',
      displayName: 'n8n工作流',
      status: 'running', // running, stopped, error
      port: 5678,
      url: 'http://localhost:5678',
      description: '强大的工作流自动化平台',
      icon: '🔄',
      metrics: {
        cpu: '15%',
        memory: '256MB',
        uptime: '2h 30m',
        requests: 1234
      },
      lastUpdated: new Date()
    },
    {
      id: 'dify',
      name: 'dify',
      displayName: 'Dify对话AI',
      status: 'running',
      port: 3000,
      url: 'http://localhost:3000',
      description: '开源的LLM应用开发平台',
      icon: '🤖',
      metrics: {
        cpu: '8%',
        memory: '512MB',
        uptime: '1h 45m',
        requests: 856
      },
      lastUpdated: new Date()
    },
    {
      id: 'oneapi',
      name: 'oneapi',
      displayName: 'OneAPI接口',
      status: 'stopped',
      port: 3001,
      url: 'http://localhost:3001',
      description: 'OpenAI接口管理和代理服务',
      icon: '⚡',
      metrics: {
        cpu: '0%',
        memory: '0MB',
        uptime: '0m',
        requests: 0
      },
      lastUpdated: new Date()
    },
    {
      id: 'ragflow',
      name: 'ragflow',
      displayName: 'RagFlow知识库',
      status: 'error',
      port: 9380,
      url: 'http://localhost:9380',
      description: '基于深度文档理解的RAG引擎',
      icon: '📚',
      metrics: {
        cpu: '0%',
        memory: '0MB',
        uptime: '0m',
        requests: 0
      },
      lastUpdated: new Date()
    }
  ])

  // 计算属性
  const runningServices = computed(() => 
    services.value.filter(service => service.status === 'running')
  )

  const stoppedServices = computed(() => 
    services.value.filter(service => service.status === 'stopped')
  )

  const errorServices = computed(() => 
    services.value.filter(service => service.status === 'error')
  )

  const totalRequests = computed(() => 
    services.value.reduce((total, service) => total + service.metrics.requests, 0)
  )

  const systemStats = computed(() => ({
    total: services.value.length,
    running: runningServices.value.length,
    stopped: stoppedServices.value.length,
    error: errorServices.value.length,
    totalRequests: totalRequests.value
  }))

  // 方法
  const getServiceById = (id) => {
    return services.value.find(service => service.id === id)
  }

  const updateServiceStatus = (id, status) => {
    const service = getServiceById(id)
    if (service) {
      service.status = status
      service.lastUpdated = new Date()
      
      // 如果服务停止，重置指标
      if (status === 'stopped') {
        service.metrics = {
          cpu: '0%',
          memory: '0MB',
          uptime: '0m',
          requests: 0
        }
      }
    }
  }

  const startService = async (id) => {
    const service = getServiceById(id)
    if (service) {
      // 模拟启动过程
      service.status = 'starting'
      
      // 模拟异步启动
      setTimeout(() => {
        service.status = 'running'
        service.metrics = {
          cpu: Math.floor(Math.random() * 20) + 5 + '%',
          memory: Math.floor(Math.random() * 500) + 100 + 'MB',
          uptime: '刚刚启动',
          requests: 0
        }
        service.lastUpdated = new Date()
      }, 2000)
    }
  }

  const stopService = async (id) => {
    const service = getServiceById(id)
    if (service) {
      // 模拟停止过程
      service.status = 'stopping'
      
      // 模拟异步停止
      setTimeout(() => {
        service.status = 'stopped'
        service.metrics = {
          cpu: '0%',
          memory: '0MB',
          uptime: '0m',
          requests: 0
        }
        service.lastUpdated = new Date()
      }, 1500)
    }
  }

  const restartService = async (id) => {
    await stopService(id)
    setTimeout(() => {
      startService(id)
    }, 2000)
  }

  // 模拟实时数据更新
  const startRealTimeUpdates = () => {
    setInterval(() => {
      services.value.forEach(service => {
        if (service.status === 'running') {
          // 更新CPU使用率
          const currentCpu = parseInt(service.metrics.cpu)
          const newCpu = Math.max(1, currentCpu + (Math.random() - 0.5) * 10)
          service.metrics.cpu = Math.min(100, Math.floor(newCpu)) + '%'
          
          // 更新请求数
          service.metrics.requests += Math.floor(Math.random() * 5)
          
          service.lastUpdated = new Date()
        }
      })
    }, 5000) // 每5秒更新一次
  }

  return {
    services,
    runningServices,
    stoppedServices,
    errorServices,
    systemStats,
    getServiceById,
    updateServiceStatus,
    startService,
    stopService,
    restartService,
    startRealTimeUpdates
  }
})