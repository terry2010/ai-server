<template>
  <div class="flex" style="gap:12px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #f0f0f0;">
    <div
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{ active: activeKey === tab.key }"
      @click="$emit('change', tab.key)"
      @mouseenter="hoverKey = tab.key"
      @mouseleave="hoverKey = ''"
      :style="activeKey === tab.key || hoverKey === tab.key ? 'color:#fff' : ''"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.status" style="margin-left:8px;">
        <span :style="{ color: statusColor(tab.status) }">●</span>
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

export type ServiceStatus = 'running' | 'stopped' | 'error'

interface TabItem { key: string; label: string; status?: ServiceStatus }

defineProps<{ tabs: TabItem[]; activeKey: string }>()

defineEmits<{ (e: 'change', key: string): void }>()

const hoverKey = ref('')

function statusColor(s: ServiceStatus) {
  if (s === 'running') return '#1890ff'
  if (s === 'stopped') return '#8c8c8c'
  return '#ff4d4f'
}
</script>
