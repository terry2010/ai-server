<template>
  <div class="overview-card">
    <div class="overview-grid">
      <!-- Docker 服务 与 状态 同一行 -->
      <div class="overview-item row">
        <div class="label">Docker 服务</div>
        <div class="value inline nowrap">
          <a-spin :spinning="loading">
            <span v-if="!loading" :class="['dot', docker.running ? 'ok' : 'bad']"></span>
            <span>{{ loading ? '加载中' : (docker.running ? '已启动' : '未启动') }}</span>
          </a-spin>
        </div>
        <div class="actions" style="margin-left:12px">
          <a-button v-if="!docker.running" type="primary" size="small" @click="startDocker" :loading="starting || loading" :disabled="loading">启动 Docker</a-button>
        </div>
      </div>

      <!-- 运行服务 x/n 同一行 -->
      <div class="overview-item row">
        <div class="label">运行服务</div>
        <div class="value inline nowrap">{{ store.running }}/{{ store.total }}</div>
      </div>

      <div class="overview-item row">
        <div class="label">运行时间</div>
        <div class="value inline nowrap">{{ store.uptimeText || uptimeText }}</div>
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'
import { dockerCheck, dockerStart } from '../services/ipc'
import { listModules, startModule } from '../services/ipc'
import { moduleStore as store } from '../stores/modules'

const props = defineProps<{ loading?: boolean }>()
const loading = computed(() => !!props.loading)

const docker = ref<{running:boolean,installed:boolean}>({ running: false, installed: true })
const starting = ref(false)
const busy = ref(false)
const uptimeText = ref('')
const CACHE_KEY = 'dockerStatusCache.v1'
let uptimeTimer: number | undefined

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    const v = JSON.parse(raw)
    if (v && typeof v.running === 'boolean') docker.value = v
  } catch {}
}

function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(docker.value)) } catch {}
}

async function refreshDocker() {
  try { docker.value = await dockerCheck(); saveCache() } catch {}
}

async function startDocker() {
  starting.value = true
  try {
    await dockerStart()
    // 轮询等待 docker 运行，最多等 60 秒
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      try {
        const r = await dockerCheck()
        docker.value = r
        saveCache()
        if (r.running) break
      } catch {}
      await new Promise(r => setTimeout(r, 2000))
    }
    // 结束后再刷新一次，确保界面状态正确
    await refreshDocker()
  } finally {
    starting.value = false
  }
}

async function startAll() {
  busy.value = true
  try {
    const mods = await listModules()
    for (const m of mods) { try { await startModule(m.name) } catch {} }
  } finally { busy.value = false }
}

onMounted(async () => {
  // 先读缓存，后刷新
  loadCache()
  await refreshDocker()
  // 简单的本地运行时间展示
  uptimeTimer = window.setInterval(() => {
    const d = new Date()
    uptimeText.value = `${d.getHours()}小时 ${d.getMinutes()}分钟`
  }, 60000)
})

onUnmounted(() => { if (uptimeTimer) window.clearInterval(uptimeTimer) })
</script>

<style scoped>
.overview-card { margin: var(--spacing-md) 0; border-radius: var(--radius-md); box-shadow: var(--shadow-md); background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 50%, #40a9ff 100%); color: var(--text-white); padding: 10px 16px; }
.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; align-items: center; min-height: 52px; }
.overview-item { display: flex; flex-direction: column; gap: 6px; }
.overview-item.row { flex-direction: row; align-items: center; }
.overview-item.right { align-items: flex-end; }
.label { opacity: .9; font-size: var(--text-xs); }
.value { font-size: var(--text-base); font-weight: 600; display: flex; align-items: center; gap: 8px; }
.value.inline { display: inline-flex; }
.nowrap { white-space: nowrap; }
.overview-item.row .label { margin-right: 16px; min-width: 80px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.ok { background: #52c41a; box-shadow: 0 0 8px rgba(82,196,26,.6); }
.dot.bad { background: #ff4d4f; box-shadow: 0 0 8px rgba(255,77,79,.6); }
.actions { display: flex; gap: 8px; }
@media (max-width: 768px) { .overview-grid { grid-template-columns: 1fr 1fr; } .overview-item.right { grid-column: 1 / -1; align-items: stretch; } }
</style>
