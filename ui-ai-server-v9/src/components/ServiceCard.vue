<template>
  <div class="service-card" :class="status">
    <div class="service-title">
      <component :is="icon" style="font-size: 18px; color: var(--accent)" />
      <span>{{ name }}</span>
      <StatusDot :status="status" />
    </div>
    <div class="service-metrics">
      <div>CPU：{{ metrics.cpu }}</div>
      <div>内存：{{ metrics.memory }}</div>
      <div>运行：{{ metrics.uptime }}</div>
    </div>
    <div class="service-actions">
      <a-button v-if="status !== 'running'" type="primary" @click="$emit('start')" class="btn-gradient">启动</a-button>
      <a-button v-else danger @click="$emit('stop')">停止</a-button>
      <a-button @click="$emit('restart')">重启</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatusDot from '@/components/StatusDot.vue'

interface Metrics { cpu: string; memory: string; uptime: string }

const props = defineProps<{
  name: string
  status: 'running' | 'stopped' | 'error'
  icon?: any
  metrics: Metrics
}>()

defineEmits<{
  (e: 'start'): void
  (e: 'stop'): void
  (e: 'restart'): void
}>()
</script>
