<template>
  <div class="overview-card">
    <div class="overview-grid">
      <div class="overview-item">
        <div class="label">Docker 服务</div>
        <div class="value">
          <span :class="['dot', docker.running ? 'ok' : 'bad']"></span>
          <span>{{ docker.running ? '已启动' : '未启动' }}</span>
        </div>
        <div class="actions">
          <a-button v-if="!docker.running" type="primary" size="small" @click="startDocker" :loading="starting">启动 Docker</a-button>
        </div>
      </div>

      <div class="overview-item">
        <div class="label">运行服务</div>
        <div class="value">{{ store.running }}/{{ store.total }}</div>
      </div>

      <div class="overview-item">
        <div class="label">运行时间</div>
        <div class="value">{{ store.uptimeText || uptimeText }}</div>
      </div>

      <div class="overview-item right">
        <div class="actions">
          <a-button size="small" @click="$emit('refresh')">
            <template #icon><reload-outlined /></template>
            刷新状态
          </a-button>
          <a-button type="primary" size="small" @click="startAll" :loading="busy">
            <template #icon><play-circle-outlined /></template>
            启动所有服务
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'
import { dockerCheck, dockerStart } from '../services/ipc'
import { listModules, startModule } from '../services/ipc'
import { moduleStore as store } from '../stores/modules'

const docker = ref<{running:boolean,installed:boolean}>({ running: false, installed: true })
const starting = ref(false)
const busy = ref(false)
const uptimeText = ref('')

async function refreshDocker() {
  try { docker.value = await dockerCheck() } catch {}
}

async function startDocker() {
  starting.value = true
  try { await dockerStart(); await new Promise(r=>setTimeout(r,1500)); await refreshDocker() } finally { starting.value = false }
}

async function startAll() {
  busy.value = true
  try {
    const mods = await listModules()
    for (const m of mods) { try { await startModule(m.name) } catch {} }
  } finally { busy.value = false }
}

onMounted(async () => {
  await refreshDocker()
  // 简单的本地运行时间展示
  setInterval(() => {
    const d = new Date()
    uptimeText.value = `${d.getHours()}小时 ${d.getMinutes()}分钟`
  }, 60000)
})
</script>

<style scoped>
.overview-card { margin: var(--spacing-md) 0; border-radius: var(--radius-md); box-shadow: var(--shadow-md); background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 50%, #40a9ff 100%); color: var(--text-white); padding: 10px 16px; }
.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: center; min-height: 52px; }
.overview-item { display: flex; flex-direction: column; gap: 6px; }
.overview-item.right { align-items: flex-end; }
.label { opacity: .9; font-size: var(--text-xs); }
.value { font-size: var(--text-base); font-weight: 600; display: flex; align-items: center; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.ok { background: #52c41a; box-shadow: 0 0 8px rgba(82,196,26,.6); }
.dot.bad { background: #ff4d4f; box-shadow: 0 0 8px rgba(255,77,79,.6); }
.actions { display: flex; gap: 8px; }
@media (max-width: 768px) { .overview-grid { grid-template-columns: 1fr 1fr; } .overview-item.right { grid-column: 1 / -1; align-items: stretch; } }
</style>
