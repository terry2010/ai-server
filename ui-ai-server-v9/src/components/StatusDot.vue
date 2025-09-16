<template>
  <span class="status-dot" :class="status" :title="title" />
</template>

<script setup lang="ts">
const props = defineProps<{ status: 'running' | 'stopped' | 'error' }>()
const title = {
  running: '运行中',
  stopped: '已停止',
  error: '异常',
}[props.status]
</script>

<style scoped>
.status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.status-dot.running { background: var(--accent); animation: pulse 2s infinite; }
.status-dot.stopped { background: #8c8c8c; }
.status-dot.error { background: #ff4d4f; animation: blink 1.2s infinite; }
</style>
