<template>
  <div class="webapp-view">
    <div class="webapp-toolbar">
      <div class="toolbar-left">
        <a-space>
          <a-button size="small" @click="goBack" :disabled="!url">后退</a-button>
          <a-button size="small" @click="goForward" :disabled="!url">前进</a-button>
          <a-button size="small" @click="reload" :disabled="!url">刷新</a-button>
          <a-button size="small" @click="goHome">首页</a-button>
        </a-space>
      </div>
      <div class="url">{{ url || '模块未运行或端口未映射' }}</div>
      <div class="actions">
        <a-button size="small" @click="openInBrowser" :disabled="!url">用系统浏览器打开</a-button>
      </div>
    </div>
    <div class="webapp-content">
      <a-empty v-if="!url" description="请先在首页启动该模块，或检查端口映射配置" />
      <!-- 页面内容由主进程 BrowserView 承载，此处仅占位用于滚动条与边距 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getModuleStatus, bvRefresh, bvGoBack, bvGoForward, openExternal, bvSetInsets, bvLoadHome } from '../services/ipc'

const route = useRoute()
const router = useRouter()
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

async function reload() {
  const name = String(route.name || '').toLowerCase() as any
  await bvRefresh(name)
}

async function goBack() {
  const name = String(route.name || '').toLowerCase() as any
  await bvGoBack(name)
}
async function goForward() {
  const name = String(route.name || '').toLowerCase() as any
  await bvGoForward(name)
}
async function goHome() {
  const name = String(route.name || '').toLowerCase() as any
  await bvLoadHome(name)
}

async function openInBrowser() {
  if (url.value) await openExternal(url.value)
}

async function applyInsets() {
  await nextTick()
  const el = document.querySelector('.webapp-content') as HTMLElement | null
  if (el) {
    const rect = el.getBoundingClientRect()
    // 仅设置顶部 inset，左右/底部占满
    await bvSetInsets({ top: Math.max(0, Math.floor(rect.top)) , left: 0, right: 0, bottom: 0 })
  }
}

onMounted(async () => {
  await resolveUrl()
  await applyInsets()
  window.addEventListener('resize', applyInsets)
})
watch(() => route.name, async () => { await resolveUrl(); await applyInsets() })
onBeforeUnmount(() => window.removeEventListener('resize', applyInsets))
</script>

<style scoped>
.webapp-view { display: flex; flex-direction: column; height: calc(100vh - 60px); }
.webapp-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border-light); background: var(--bg-card); backdrop-filter: var(--backdrop-blur); }
.toolbar-left { display: flex; align-items: center; }
.url { font-family: var(--font-mono); color: var(--text-secondary); font-size: var(--text-sm); }
.webapp-content { flex: 1; }
</style>
