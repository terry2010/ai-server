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
          <div v-for="log in pagedLogs" :key="log.id" :class="['log-entry', `log-${log.level}`]">
            <div class="log-time">{{ fmtTime(log.timestamp) }}</div>
            <div class="log-level">{{ log.level.toUpperCase() }}</div>
            <div class="log-module selectable" @click="filterByModule(log.module)">{{ log.moduleType === 'basic' ? 'sys' : log.module }}</div>
            <div class="log-service selectable" @click="filterByService(log.service)">{{ log.service }}</div>
            <div class="log-message">{{ log.message }}</div>
          </div>
        </div>
        <div class="log-pagination">
          <a-pagination :current="current" :pageSize="pageSize" :total="filteredLogs.length" @change="onPageChange" size="small" show-less-items />
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
import { getModuleLogs, listModules, type AppLogEntry } from '../services/ipc'

const route = useRoute()
const router = useRouter()

const logLevel = ref<'all' | 'error' | 'warn' | 'info' | 'debug'>('all')
const currentModule = ref<string | undefined>(undefined)
const logs = ref<AppLogEntry[]>([])
const moduleOptions = ref<string[]>([])
const moduleSelect = ref<string | undefined>(undefined)

const filteredLogs = computed(() => {
  // 当前实现：当路由带有 module 查询参数时，后端已按模块聚合返回日志
  // 因此此处不再用 service 进行二次过滤，以免误杀
  let base = logs.value
  // 若没有通过路由指定模块，但用户点击了某个服务名进行快速过滤，可保留按 service 的简单过滤
  if (!route.query.module && currentModule.value) {
    const key = currentModule.value.toLowerCase()
    base = base.filter(l => l.service.toLowerCase().includes(key) || (l.module && l.module.toLowerCase().includes(key)))
  }
  if (logLevel.value === 'all') return base
  return base.filter(l => l.level === logLevel.value)
})

const pageSize = ref<number>(100)
const current = ref<number>(1)
const pagedLogs = computed(() => {
  const start = (current.value - 1) * pageSize.value
  return filteredLogs.value.slice(start, start + pageSize.value)
})

const applyRouteFilter = () => {
  const m = (route.query.module as string | undefined)?.toLowerCase()
  currentModule.value = m || undefined
  moduleSelect.value = currentModule.value
}

async function loadLogs(showMsg = false) {
  try {
    const entries = await getModuleLogs(currentModule.value ? { name: currentModule.value as any, tail: 300 } : { tail: 300 })
    logs.value = entries
    if (showMsg) message.success('日志已刷新')
  } catch (e: any) {
    message.error(e?.message || '读取日志失败')
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

function onPageChange(p: number) { current.value = p }

function onModuleSelect(val?: string) {
  if (!val) {
    router.replace({ path: '/logs' })
  } else {
    router.replace({ path: '/logs', query: { module: val } })
  }
}

onMounted(async () => {
  // 拉取模块列表供下拉选择
  try { moduleOptions.value = (await listModules()).map(m => m.name) } catch {}
  applyRouteFilter()
  await loadLogs(false)
  // 监听从侧栏重复点击“系统日志”的自定义事件，重置筛选并刷新
  const reopen = () => {
    logLevel.value = 'all'
    moduleSelect.value = undefined
    currentModule.value = undefined
    current.value = 1
    router.replace({ path: '/logs' })
    loadLogs(false)
  }
  window.addEventListener('reopen-logs', reopen)
  // 卸载清理
  onUnmounted(() => window.removeEventListener('reopen-logs', reopen))
})

watch(() => route.fullPath, () => {
  // 任何对 /logs 的重新进入或重复点击，都重置筛选为默认并刷新
  applyRouteFilter()
  if (!route.query.module) {
    logLevel.value = 'all'
    current.value = 1
  }
  loadLogs(false)
})

// 当 pageSize 改变时重置页码，并限制取值范围 20-500
watch(pageSize, (val) => {
  if (val < 20) pageSize.value = 20
  else if (val > 500) pageSize.value = 500
  current.value = 1
})

// 当过滤条件变化时重置到第 1 页
watch([filteredLogs, logLevel], () => { current.value = 1 })
</script>

<style scoped>
.logs-view { padding: var(--spacing-xl); height: 100vh; display: flex; flex-direction: column; }
.logs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl); }
.logs-title { font-size: var(--text-2xl); font-weight: 600; color: var(--text-primary); margin: 0; }
.logs-controls { display: flex; gap: var(--spacing-md); align-items: center; }
.logs-content { flex: 1; overflow: hidden; }
.logs-card { height: 100%; border-radius: var(--radius-xl); border: 1px solid var(--border-light); box-shadow: var(--shadow-lg); }
.log-container { height: calc(100vh - 240px); overflow-y: auto; font-family: var(--font-mono); font-size: var(--text-sm); }
.log-toolbar { display:flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border-light); }
.log-entry { display: grid; grid-template-columns: 180px 70px 80px 160px 1fr; gap: var(--spacing-md); padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--border-light); transition: background-color var(--transition-base); }
.log-entry:hover { background-color: var(--bg-tertiary); }
.log-time { color: var(--text-secondary); font-size: var(--text-xs); }
.log-level { font-weight: 600; text-align: center; padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--text-xs); }
.log-error .log-level { background-color: var(--error-color); color: var(--text-white); }
.log-warn .log-level { background-color: var(--warning-color); color: var(--text-white); }
.log-info .log-level { background-color: var(--info-color); color: var(--text-white); }
.log-debug .log-level { background-color: var(--text-tertiary); color: var(--text-primary); }
.log-module { color: var(--primary-color); cursor: pointer; }
.log-service { color: var(--primary-color); font-weight: 500; }
.log-message { color: var(--text-primary); }
.log-pagination { padding: 8px 12px; border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end; }

@media (max-width: 768px) { .logs-view { padding: var(--spacing-lg); } .logs-header { flex-direction: column; gap: var(--spacing-md); align-items: stretch; } .logs-controls { justify-content: center; } .log-entry { grid-template-columns: 1fr; gap: var(--spacing-xs); } .log-container { height: calc(100vh - 250px); } }
</style>
