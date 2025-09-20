<template>
  <div class="logs-view">
    <div class="logs-header">
      <h2 class="logs-title">系统日志</h2>
      <div class="logs-controls">
        <span>模块</span>
        <a-select v-model:value="moduleSelect" style="width: 160px" @change="onModuleSelect" :allowClear="true" placeholder="全部模块">
          <a-select-option v-for="m in moduleOptions" :key="m" :value="m">{{ m }}</a-select-option>
        </a-select>
        <a-select v-model:value="logLevel" style="width: 120px" @change="filterLogs">
          <a-select-option value="all">全部</a-select-option>
          <a-select-option value="error">错误</a-select-option>
          <a-select-option value="warn">警告</a-select-option>
          <a-select-option value="info">信息</a-select-option>
          <a-select-option value="debug">调试</a-select-option>
        </a-select>
        
        <a-button @click="clearLogs" danger class="action-button stop-btn">
          <template #icon><delete-outlined /></template>
          清空日志
        </a-button>
        
        <a-button @click="refreshLogs" type="primary" class="action-button refresh-btn">
          <template #icon><reload-outlined /></template>
          刷新
        </a-button>
      </div>
    </div>
    
    <div class="logs-content">
      <a-card class="logs-card glass-effect">
        <div class="log-toolbar">
          <div class="left"></div>
          <div class="right">
            <span>每页</span>
            <a-select v-model:value="pageSize" style="width: 100px; margin-left: 8px;" size="small">
              <a-select-option :value="20">20</a-select-option>
              <a-select-option :value="50">50</a-select-option>
              <a-select-option :value="100">100</a-select-option>
              <a-select-option :value="200">200</a-select-option>
              <a-select-option :value="500">500</a-select-option>
            </a-select>
          </div>
        </div>
        <div class="log-container">
          <!-- 空表加载 或 分页增量加载：固定在容器30%位置 -->
          <div v-if="fixedLoading || (isLoading && filteredLogs.length === 0)" class="log-empty-loading">
            <a-spin />
          </div>
          <!-- 有数据时：使用不遮罩的内联小型 loading，完全不拦截指针事件 -->
          <div v-if="isLoading && !fixedLoading && filteredLogs.length > 0" class="log-inline-loading"><a-spin size="small" /></div>
          <DynamicScroller v-else
            :items="pagedLogs"
            key-field="id"
            :min-item-size="32"
            class="log-scroller"
          >
            <template #default="{ item: log, index }">
              <DynamicScrollerItem :item="log" :active="true" :data-index="index" :watchData="true">
                <div :class="['log-entry', `log-${log.level}`]">
                  <div class="log-time">{{ fmtTime(log.timestamp) }}</div>
                  <div class="log-level">{{ log.level.toUpperCase() }}</div>
                  <div class="log-module selectable" @click="filterByModule(log.module)">{{ log.moduleType === 'basic' ? 'sys' : log.module }}</div>
                  <div class="log-service selectable" @click="filterByService(log.service)">{{ log.service }}</div>
                  <div class="log-message">{{ log.message }}</div>
                </div>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
        </div>
        <div class="log-pagination">
          <a-pagination :current="current" :pageSize="pageSize" :total="totalForPaging" @change="onPageChange" size="small" show-less-items />
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { getModuleLogs, listModules, type AppLogEntry, getClientOpsLogs } from '../services/ipc'
import { IPC } from '../../shared/ipc-contract'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// 工具：去除控制字符，避免行首方框/乱码（包含 BOM 与 U+FFFD）
const sanitize = (s: string) => {
  try {
    if (!s) return s
    return s
      .replace(/^\uFEFF/, '') // 去除BOM
      .replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, '') // 控制符与替换符
  } catch { return s }
}

const route = useRoute()
const router = useRouter()

const logLevel = ref<'all' | 'error' | 'warn' | 'info' | 'debug'>('all')
const currentModule = ref<string | undefined>(undefined)
const logs = ref<AppLogEntry[]>([])
const clientLogs = ref<AppLogEntry[]>([])
const moduleOptions = ref<string[]>([])
const moduleSelect = ref<string | undefined>(undefined)
const isLoading = ref(false)
const fixedLoading = ref(false)

const isClient = computed(() => moduleSelect.value === 'client')
const filteredLogs = computed(() => {
  // 基于已排序的数据，仅做过滤，避免每次排序造成卡顿
  let base = isClient.value ? clientLogs.value : logs.value
  if (!route.query.module && currentModule.value) {
    const key = currentModule.value.toLowerCase()
    base = base.filter(l => l.service.toLowerCase().includes(key) || (l.module && l.module.toLowerCase().includes(key)))
  }
  const res = (logLevel.value === 'all') ? base : base.filter(l => l.level === logLevel.value)
  console.log('[logs] filteredLogs ->', { total: (isClient.value ? clientLogs.value.length : logs.value.length), filtered: res.length, level: logLevel.value, module: currentModule.value || '(all)', isClient: isClient.value })
  return res
})

const pageSize = ref<number>(20)
const current = ref<number>(1)
const pagedLogs = computed(() => {
  const start = (current.value - 1) * pageSize.value
  const arr = filteredLogs.value.slice(start, start + pageSize.value)
  console.log('[logs] pagedLogs ->', { page: current.value, pageSize: pageSize.value, count: arr.length })
  return arr
})
let inFlight = false
let pendingReload = false

// 渲染端轻量缓存（2s内复用），避免反复切换时重复取数
let lastCache: { key: string; tail: number; ts: number; entries: AppLogEntry[] } | null = null
let lastTailRequested = 0
const MAX_TAIL = 500
const CACHE_TTL_MS = 3000

const totalForPaging = computed(() => {
  // 若最近一次请求的 tail 尚未达到上限，且当前页已到最后一页，则提前放大 total 以允许用户继续翻页触发增量加载
  const loaded = filteredLogs.value.length
  const pageCount = Math.ceil(loaded / pageSize.value)
  const atLastPage = current.value >= pageCount
  const hintMore = lastTailRequested < MAX_TAIL
  const inflated = atLastPage && hintMore ? loaded + pageSize.value : loaded
  return inflated
})

const applyRouteFilter = () => {
  const m = (route.query.module as string | undefined)?.toLowerCase()
  currentModule.value = m || undefined
  moduleSelect.value = currentModule.value
}

let reqSeq = 0
let debounceTimer: any = null
// 顶层声明，便于 onUnmounted 正确清理
let reopen: any = null
// 顶层稳定的客户端日志处理器，避免重复绑定导致 MaxListenersExceededWarning
function onIpcLogHandler(_e: any, p: any) {
  try {
    const ts = new Date().toISOString()
    const level = (p?.level || p?.event || 'info').toLowerCase()
    const msg = typeof p?.chunk === 'string' ? p.chunk : JSON.stringify(p)
    // 最新在最前
    clientLogs.value.unshift({ id: `${ts}-${clientLogs.value.length}`, timestamp: ts, service: 'client', module: 'client', moduleType: 'basic', level: ['error','warn','info','debug'].includes(level) ? level : 'info', message: sanitize(msg) })
    // 控制内存：仅保留最近 2000 条
    if (clientLogs.value.length > 2000) clientLogs.value.length = 2000
  } catch {}
}
async function loadLogs(showMsg = false) {
  const mySeq = ++reqSeq
  try {
    if (inFlight) { pendingReload = true; console.log('[logs] coalesce: inFlight, mark pendingReload'); return }
    isLoading.value = true
    inFlight = true
    console.log('[logs] loadLogs.begin ->', { module: currentModule.value, isClient: isClient.value, seq: mySeq })
    if (isClient.value) {
      // 客户端日志：先加载历史，再继续实时
      const hist = await getClientOpsLogs(1000)
      if (mySeq !== reqSeq) return // 丢弃过期结果
      clientLogs.value = hist.map((h, idx) => ({ id: `${h.timestamp}-${idx}`, timestamp: h.timestamp, service: 'client', module: 'client', moduleType: 'basic', level: (h.level as any) || 'info', message: sanitize(h.message) }))
      if (showMsg) message.success('已加载客户端历史日志')
      console.log('[logs] loadLogs.end(client) <-', { count: clientLogs.value.length, seq: mySeq })
      return
    }
    // 动态tail：根据当前分页需要 + 缓冲
    const need = current.value * pageSize.value
    const tail = Math.max(20, Math.min(need + Math.ceil(pageSize.value * 2), MAX_TAIL))
    const key = (currentModule.value || '*')
    let usedCache = false
    // 渲染端 3 秒内缓存命中
    if (lastCache && lastCache.key === key && (Date.now() - lastCache.ts) <= CACHE_TTL_MS && lastCache.tail >= tail) {
      logs.value = [...lastCache.entries]
      lastTailRequested = lastCache.tail
      usedCache = true
      console.log('[logs] loadLogs.cache-hit(renderer) <-', { count: logs.value.length, tail: lastCache.tail })
    } else {
      const entries = await getModuleLogs(currentModule.value ? { name: currentModule.value as any, tail } : { tail })
      if (mySeq !== reqSeq) return // 丢弃过期结果
      // 加载时排序一次（新到旧）
      entries.sort((a, b) => {
        const ta = Date.parse(a.timestamp || '') || 0
        const tb = Date.parse(b.timestamp || '') || 0
        if (ta && tb) return tb - ta
        return String(b.id).localeCompare(String(a.id))
      })
      // 预清洗 message，避免渲染时再次处理
      logs.value = entries.map(e => ({ ...e, message: sanitize(e.message) }))
      lastTailRequested = tail
      lastCache = { key, tail, ts: Date.now(), entries: [...logs.value] }
    }
    if (showMsg) message.success('日志已刷新')
    console.log('[logs] loadLogs.end(module) <-', { count: logs.value.length, module: currentModule.value, seq: mySeq })
  } catch (e: any) {
    message.error(e?.message || '读取日志失败')
    console.error('[logs] loadLogs.error <-', e)
  }
  finally {
    inFlight = false
    isLoading.value = false
    if (filteredLogs.value.length > 0) fixedLoading.value = false
    if (pendingReload) { pendingReload = false; setTimeout(() => loadLogs(false), 0) }
  }
}

const filterLogs = () => { if (logLevel.value !== 'all') message.info(`已筛选 ${logLevel.value} 级别日志`) }
const clearLogs = () => { logs.value = []; message.success('日志已清空') }
const refreshLogs = () => loadLogs(true)

function filterByService(svc: string) {
  currentModule.value = svc
  router.replace({ path: '/logs', query: { module: svc } })
}

function filterByModule(mod: string) {
  currentModule.value = mod
  router.replace({ path: '/logs', query: { module: mod } })
}

function fmtTime(ts: string) {
  // ts 形如 2025-09-16T19:22:10.123456789Z
  const d = new Date(ts)
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  // 回退：仅截取前 19 位
  return ts.replace('T',' ').slice(0,19)
}

async function ensureTail(required: number) {
  // 若当前已加载数据不足，则触发一次增量请求
  if (filteredLogs.value.length >= required) return
  console.log('[logs] ensureTail ->', { required, have: filteredLogs.value.length })
  fixedLoading.value = true
  await loadLogs(false)
}

function onPageChange(p: number) {
  current.value = p
  const required = p * pageSize.value
  fixedLoading.value = true
  ensureTail(required)
}

function onModuleSelect(val?: string) {
  console.log('[logs] onModuleSelect ->', val)
  if (!val) {
    router.replace({ path: '/logs' })
  } else {
    if (val === 'client') {
      router.replace({ path: '/logs' })
    } else {
      router.replace({ path: '/logs', query: { module: val } })
    }
  }
  // 去抖触发加载，减少频繁切换带来的卡顿
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { loadLogs(true); scrollToTop() }, 200)
}

let subscribed = false
const SUB_KEY = '__ai_server_logs_subscribed__'
let subOwner: string | null = null
onMounted(async () => {
  // 拉取模块列表供下拉选择
  try {
    moduleOptions.value = ['client', ...(await listModules()).map(m => m.name)]
  } catch {
    moduleOptions.value = ['client']
  }
  applyRouteFilter()
  // 异步加载历史，不阻塞页面渲染
  setTimeout(() => { loadLogs(false) }, 0)
  // 监听从侧栏重复点击“系统日志”的自定义事件，重置筛选并刷新
  reopen = () => {
    logLevel.value = 'all'
    moduleSelect.value = undefined
    currentModule.value = undefined
    current.value = 1
    router.replace({ path: '/logs' })
    loadLogs(false)
    scrollToTop()
  }
  window.addEventListener('reopen-logs', reopen)
  // 订阅主进程推送的客户端日志（ops等）
  try { (window as any).api.setMaxListeners?.(0) } catch {}
  const w: any = window as any
  if (!w[SUB_KEY]) {
    try { (window as any).api.off?.(IPC.ModuleLogEvent, onIpcLogHandler) } catch {}
    try { (window as any).api.removeListener?.(IPC.ModuleLogEvent, onIpcLogHandler) } catch {}
    ;(window as any).api.on(IPC.ModuleLogEvent, onIpcLogHandler)
    subscribed = true
    w[SUB_KEY] = true
    subOwner = Math.random().toString(36).slice(2)
  }
})

// 卸载清理（必须在顶层注册）
onUnmounted(() => {
  try { if (reopen) window.removeEventListener('reopen-logs', reopen) } catch {}
  try { (window as any).api.off?.(IPC.ModuleLogEvent, onIpcLogHandler) } catch {}
  try { (window as any).api.removeListener?.(IPC.ModuleLogEvent, onIpcLogHandler) } catch {}
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null }
  // 使在途请求结果失效
  reqSeq++
  const w: any = window as any
  subscribed = false
  if (w[SUB_KEY] && subOwner) { w[SUB_KEY] = false; subOwner = null }
})

watch(() => route.fullPath, () => {
  // 任何对 /logs 的重新进入或重复点击，都重置筛选为默认并刷新
  applyRouteFilter()
  console.log('[logs] route.changed ->', route.fullPath)
  if (!route.query.module) {
    logLevel.value = 'all'
    current.value = 1
  }
  // 去抖异步触发加载，避免页面卡住
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { loadLogs(false) }, 150)
  scrollToTop()
})

// 当 pageSize 改变时重置页码，并限制取值范围 20-500
watch(pageSize, (val) => {
  if (val < 20) pageSize.value = 20
  else if (val > 500) pageSize.value = 500
  current.value = 1
})

// 当过滤条件变化时重置到第 1 页
watch([filteredLogs, logLevel], () => { current.value = 1 })

// 滚动到顶部，进入“系统日志”或切换模块后调用
function scrollToTop() {
  try {
    const el = document.querySelector('.log-container') as HTMLElement | null
    if (el) el.scrollTop = 0
  } catch {}
  try { window.scrollTo({ top: 0 }) } catch {}
}
</script>

<style scoped>
.logs-view { padding: var(--spacing-xl); height: 100vh; display: flex; flex-direction: column; }
.logs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl); }
.logs-title { font-size: var(--text-2xl); font-weight: 600; color: var(--text-primary); margin: 0; }
.logs-controls { display: flex; gap: var(--spacing-md); align-items: center; }
.logs-content { flex: 1; overflow: hidden; }
.logs-card { height: 100%; border-radius: var(--radius-xl); border: 1px solid var(--border-light); box-shadow: var(--shadow-lg); }
/* 外层不滚动，滚动交给虚拟列表容器，避免双滚动条 */
.log-container { position: relative; height: calc(100vh - 240px); overflow: hidden; font-family: var(--font-mono); font-size: var(--text-sm); }
.log-scroller { height: 100%; overflow-y: auto; }
.log-empty-loading { position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%); z-index: 1; }
/* 避免 loading 遮罩影响窗口拖拽：不拦截指针事件 */
:deep(.ant-spin), :deep(.ant-spin-nested-loading) { pointer-events: none; }
.log-empty-loading { pointer-events: none; }
.log-toolbar { display:flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border-light); }
/* 更紧凑的列宽；顶部对齐，适配多行消息 */
.log-entry { display: grid; grid-template-columns: 150px 60px 72px 120px 1fr; align-items: start; gap: 8px; padding: 6px 12px; border-bottom: 1px solid var(--border-light); transition: background-color var(--transition-base); }
.log-entry:hover { background-color: var(--bg-tertiary); }
.log-time { color: var(--text-secondary); font-size: var(--text-xs); white-space: nowrap; }
.log-level { font-weight: 600; text-align: center; padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--text-xs); }
.log-error .log-level { background-color: var(--error-color); color: var(--text-white); }
.log-warn .log-level { background-color: var(--warning-color); color: var(--text-white); }
.log-info .log-level { background-color: var(--info-color); color: var(--text-white); }
.log-debug .log-level { background-color: var(--text-tertiary); color: var(--text-primary); }
.log-module { color: var(--primary-color); cursor: pointer; word-break: break-all; overflow-wrap: anywhere; }
.log-service { color: var(--primary-color); font-weight: 500; word-break: break-all; overflow-wrap: anywhere; }
/* 多行长文本换行显示 */
.log-message { color: var(--text-primary); white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
.log-pagination { padding: 8px 12px; border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end; }

@media (max-width: 1024px) { .log-entry { grid-template-columns: 130px 56px 64px 1fr; } }
@media (max-width: 768px) { .logs-view { padding: var(--spacing-lg); } .logs-header { flex-direction: column; gap: var(--spacing-md); align-items: stretch; } .logs-controls { justify-content: center; } .log-entry { grid-template-columns: 120px 56px 1fr; } .log-container { height: calc(100vh - 250px); } }
</style>
