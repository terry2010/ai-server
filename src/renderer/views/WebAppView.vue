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
      <div class="url" :class="{ 'url-warning': !url, 'url-muted': !!url }">{{ url || '模块未运行或端口未映射' }}</div>
      <div class="actions">
        <a-button size="small" @click="openInBrowser" :disabled="!url">用系统浏览器打开</a-button>
      </div>
    </div>
    <div class="webapp-content">
      <div v-if="!url" class="empty-notice">
        <div class="notice-badge">提示</div>
        <div class="notice-title">模块未运行或端口未映射</div>
        <div class="notice-desc">请返回首页启动该模块，或在设置中检查端口映射与依赖服务是否就绪。</div>
        <div class="notice-actions">
          <a-button type="primary" size="large" @click="goHome">返回首页</a-button>
          <a-button size="large" @click="reload">刷新</a-button>
        </div>
      </div>
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
    let u = ''
    // dify 优先使用 dify-web 的端口（18090），便于显示 Web 页地址
    if (name === 'dify') {
      try {
        const stWeb = await getModuleStatus('dify-web' as any)
        u = extractFirstHttpUrl((stWeb as any)?.ports || {})
      } catch {}
    }
    if (!u) {
      const st = await getModuleStatus(name as any)
      u = extractFirstHttpUrl(st.ports)
    }
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
.webapp-content { flex: 1; }

/* 顶部地址栏样式（当无URL时更醒目，URL存在时保持低调） */
.url { font-family: var(--font-mono); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw; }
.url-muted { color: var(--text-tertiary); }
.url-warning { color: #d46b08; font-weight: 700; }

/* 页面空状态更醒目 */
.empty-notice { margin: 24px auto; max-width: 860px; padding: 24px; border-radius: 12px; background: #fff7e6; border: 1px solid #ffd591; box-shadow: 0 6px 24px rgba(255, 165, 0, 0.15); text-align: center; }
.notice-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #fa8c16; color: #fff; font-weight: 600; font-size: 12px; margin-bottom: 8px; }
.notice-title { font-size: 18px; font-weight: 700; color: #d46b08; margin-bottom: 6px; letter-spacing: 0.5px; }
.notice-desc { font-size: 14px; color: #874d00; opacity: 0.9; margin-bottom: 16px; }
.notice-actions { display: flex; gap: 12px; justify-content: center; }
</style>
