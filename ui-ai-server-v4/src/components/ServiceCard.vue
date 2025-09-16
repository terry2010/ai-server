<template>
  <div class="service-card" :class="status">
    <div style="display:flex; justify-content: space-between; align-items:center;">
      <div class="flex" style="gap:8px; align-items:center;">
        <component :is="icon" v-if="icon" />
        <div style="font-weight:600; font-size:16px;">{{ name }}</div>
        <span class="status-indicator" :class="status" />
      </div>
      <div class="flex" style="gap:8px;">
        <a-button type="primary" v-if="status !== 'running'" @click="$emit('start')">启动</a-button>
        <a-button danger v-if="status === 'running'" @click="$emit('stop')">停止</a-button>
        <a-button @click="$emit('restart')">重启</a-button>
      </div>
    </div>
    <div class="flex" style="gap:16px; margin-top:16px; color:#595959;">
      <div>CPU: <b>{{ metrics.cpu }}</b></div>
      <div>内存: <b>{{ metrics.memory }}</b></div>
      <div>运行时长: <b>{{ metrics.uptime }}</b></div>
    </div>
  </div>
</template>
<script setup lang="ts">
export type ServiceStatus = 'running' | 'stopped' | 'error'

interface Metrics { cpu: string; memory: string; uptime: string }

withDefaults(defineProps<{ name: string; status: ServiceStatus; icon?: any; metrics: Metrics }>(), {
  metrics: () => ({ cpu: '—', memory: '—', uptime: '—' })
})

defineEmits<{ (e: 'start'): void; (e: 'stop'): void; (e: 'restart'): void }>()
</script>
