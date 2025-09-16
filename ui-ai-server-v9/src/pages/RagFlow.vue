<template>
  <div class="glass service-toolbar">
    <div class="service-status">
      <StatusDot status="running" />
      <strong>RagFlow</strong>
      <span class="desc">运行中</span>
    </div>
    <a-space>
      <a-button>刷新</a-button>
      <a-button danger>停止</a-button>
    </a-space>
  </div>
</template>

<script setup lang="ts">
import StatusDot from '@/components/StatusDot.vue'
</script>

<style scoped>
.service-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  margin-top: 16px;
}
.service-status { display: flex; align-items: center; gap: 10px; }
.desc { color: #425466; }
</style>
