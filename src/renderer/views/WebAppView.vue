<template>
  <div class="webapp-view">
    <div class="webapp-toolbar">
      <div class="url">{{ url || '模块未运行或端口未映射' }}</div>
      <div class="actions">
        <a-button size="small" @click="reload" :disabled="!url">刷新</a-button>
        <a-button size="small" @click="openInBrowser" :disabled="!url">在浏览器打开</a-button>
      </div>
    </div>
    <div class="webapp-content">
      <template v-if="url">
        <webview :src="url" class="webview" allowpopups></webview>
      </template>
      <template v-else>
        <a-empty description="请先在首页启动该模块，或检查端口映射配置" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getModuleStatus } from '../services/ipc'

const route = useRoute()
const url = ref<string>('')

function extractFirstHttpUrl(ports: Record<string, string>): string {
  // 从 docker ps 的 Ports 字符串中解析第一个本地端口并拼出 http://localhost:port
  for (const key of Object.keys(ports)) {
    const s = ports[key]
    const m = s.match(/(127\.0\.0\.1|0\.0\.0\.0|\[?:::\]?|\*)?:(\d+)->(\d+\/tcp)/)
    if (m && m[2]) return `http://localhost:${m[2]}`
  }
  return ''
}

async function resolveUrl() {
  const name = (route.name as string).toLowerCase()
  try {
    const st = await getModuleStatus(name as any)
    const u = extractFirstHttpUrl(st.ports)
    url.value = u
  } catch {
    url.value = ''
  }
}

function reload() {
  const w = document.querySelector('.webview') as any
  if (w && typeof w.reload === 'function') w.reload()
}

function openInBrowser() {
  if (url.value) window.open(url.value, '_blank')
}

onMounted(resolveUrl)
watch(() => route.name, resolveUrl)
</script>

<style scoped>
.webapp-view { display: flex; flex-direction: column; height: calc(100vh - 60px); }
.webapp-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border-light); background: var(--bg-card); backdrop-filter: var(--backdrop-blur); }
.url { font-family: var(--font-mono); color: var(--text-secondary); font-size: var(--text-sm); }
.webapp-content { flex: 1; }
.webview { width: 100%; height: 100%; border: 0; }
</style>
