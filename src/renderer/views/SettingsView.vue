<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1 class="settings-title">系统设置</h1>
      <p class="settings-subtitle">统一管理所有设置。左侧标签切换不同分类。</p>
    </div>

    <div class="settings-content">
      <a-card class="settings-card glass-effect">
        <a-tabs v-model:activeKey="activeTab" tab-position="left">
          <!-- 系统设置 -->
          <a-tab-pane key="system" tab="系统设置">
            <a-form layout="vertical">
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="系统名称">
                    <a-input v-model:value="systemSettings.name" placeholder="AI-Server 管理平台" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="系统端口">
                    <a-input-number v-model:value="systemSettings.port" :min="1000" :max="65535" style="width: 100%" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="语言（保存后生效）">
                    <a-select v-model:value="systemLanguage">
                      <a-select-option value="zh">中文</a-select-option>
                      <a-select-option value="en">English</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="新窗口打开方式（window.open/_blank）">
                    <a-select v-model:value="newWindowMode">
                      <a-select-option value="in_app">程序内打开</a-select-option>
                      <a-select-option value="system">浏览器打开</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="日志级别">
                    <a-select v-model:value="systemSettings.logLevel">
                      <a-select-option value="debug">Debug</a-select-option>
                      <a-select-option value="info">Info</a-select-option>
                      <a-select-option value="warn">Warning</a-select-option>
                      <a-select-option value="error">Error</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="自动启动">
                    <a-switch v-model:checked="systemSettings.autoStart" />
                  </a-form-item>
                </a-col>
              </a-row>
              <div class="settings-actions">
                <a-button type="primary" @click="saveSystem">保存系统设置</a-button>
                <a-button @click="resetSystem" style="margin-left: 12px;">重置为默认</a-button>
              </div>
            </a-form>
          </a-tab-pane>

          <!-- 网络设置 -->
          <a-tab-pane key="network" tab="网络设置">
            <a-alert type="info" show-icon style="margin-bottom: 12px;" :message="'Docker 镜像加速优先推荐在 Docker Desktop -> Docker Engine 配置 registry-mirrors；此处为应用侧镜像重写，能缓解国内拉取慢/超时问题。Docker 代理需在 Docker Desktop 配置 Proxies。'" />
            <a-form layout="vertical">
              <a-divider>镜像加速</a-divider>
              <a-row :gutter="24">
                <a-col :span="24">
                  <a-form-item label="镜像加速地址（支持拖拽排序）">
                    <div class="mirror-list"
                         @dragover.prevent
                         @dragenter.prevent>
                      <div class="mirror-row"
                           v-for="(m, idx) in net.mirrors"
                           :key="idx"
                           draggable="true"
                           @dragstart="onMirrorDragStart(idx)"
                           @dragover.prevent="onMirrorDragOver(idx)"
                           @drop.prevent="onMirrorDrop(idx)">
                        <span class="drag-handle" title="拖动排序">⋮⋮</span>
                        <a-input v-model:value="net.mirrors[idx]" placeholder="例如 https://docker.m.daocloud.io" style="flex: 1;" />
                        <a-button type="text" danger @click="removeMirror(idx)" v-if="net.mirrors.length > 1">删除</a-button>
                      </div>
                      <a-button type="dashed" block @click="addMirror">添加镜像地址</a-button>
                    </div>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-divider>代理设置</a-divider>
              <a-row :gutter="24">
                <a-col :span="8">
                  <a-form-item label="代理模式">
                    <a-select v-model:value="net.proxyMode">
                      <a-select-option value="direct">直连</a-select-option>
                      <a-select-option value="system">使用系统代理</a-select-option>
                      <a-select-option value="manual">手动配置</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="代理主机" v-if="net.proxyMode==='manual'">
                    <a-input v-model:value="net.proxyHost" placeholder="127.0.0.1" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="代理端口" v-if="net.proxyMode==='manual'">
                    <a-input-number v-model:value="net.proxyPort" :min="1" :max="65535" style="width: 100%" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-alert type="warning" show-icon :message="'注意：Docker 拉取镜像是否使用代理取决于 Docker Desktop 的代理设置。本应用内的代理设置仅用于应用自身的网络请求与镜像名重写，并不会强制影响 Docker daemon。'" />
            </a-form>

            <div class="settings-actions">
              <a-button type="primary" size="large" @click="saveNetwork" class="action-button save-btn">
                <template #icon><save-outlined /></template>
                保存网络设置
              </a-button>
              <a-button size="large" @click="reloadNetwork" class="action-button refresh-btn">
                <template #icon><reload-outlined /></template>
                重新载入
              </a-button>
            </div>
          </a-tab-pane>

          <!-- n8n 设置（Demo） -->
          <a-tab-pane key="n8n" tab="n8n 设置">
            <a-form layout="vertical">
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="服务端口">
                    <a-input-number v-model:value="n8n.port" :min="1000" :max="65535" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="数据库URL">
                    <a-input v-model:value="n8n.dbUrl" placeholder="postgresql://..." />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="环境变量">
                <a-textarea v-model:value="n8n.env" :rows="6" placeholder="NODE_ENV=production\nN8N_BASIC_AUTH_ACTIVE=true" />
              </a-form-item>
            </a-form>
          </a-tab-pane>

          <!-- Dify 设置（Demo） -->
          <a-tab-pane key="dify" tab="Dify 设置">
            <a-form layout="vertical">
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="服务端口">
                    <a-input-number v-model:value="dify.port" :min="1000" :max="65535" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="数据库URL">
                    <a-input v-model:value="dify.dbUrl" placeholder="postgresql://..." />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="环境变量">
                <a-textarea v-model:value="dify.env" :rows="6" placeholder="示例环境变量..." />
              </a-form-item>
            </a-form>
          </a-tab-pane>

          <!-- OneAPI 设置（Demo） -->
          <a-tab-pane key="oneapi" tab="OneAPI 设置">
            <a-form layout="vertical">
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="服务端口">
                    <a-input-number v-model:value="oneapi.port" :min="1000" :max="65535" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="API 密钥">
                    <a-input-password v-model:value="oneapi.apiKey" placeholder="输入API密钥" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="配置文件">
                <a-textarea v-model:value="oneapi.config" :rows="8" placeholder="配置内容..." />
              </a-form-item>
            </a-form>
          </a-tab-pane>

          <!-- RagFlow 设置（Demo） -->
          <a-tab-pane key="ragflow" tab="RagFlow 设置">
            <a-form layout="vertical">
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="服务端口">
                    <a-input-number v-model:value="ragflow.port" :min="1000" :max="65535" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="向量库地址">
                    <a-input v-model:value="ragflow.vectorUrl" placeholder="qdrant://..." />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="环境变量">
                <a-textarea v-model:value="ragflow.env" :rows="6" placeholder="示例环境变量..." />
              </a-form-item>
            </a-form>
          </a-tab-pane>

          <!-- 调试设置（实时生效） -->
          <a-tab-pane key="debug" tab="调试设置">
            <a-form layout="vertical">
              <a-alert type="warning" show-icon style="margin-bottom: 12px;" message="以下设置实时生效，无需保存" />
              <a-form-item label="显示 原生tray">
                <a-switch v-model:checked="debug.showTrayNative" @change="applyTrayMode" />
              </a-form-item>
              <a-form-item label="显示 自绘tray">
                <a-switch v-model:checked="debug.showTrayCustom" @change="applyTrayMode" />
              </a-form-item>
              <a-form-item label="窗口控制样式（实时生效）">
                <a-radio-group v-model:value="ui.windowControlsMode" @change="applyUiMode">
                  <a-radio value="all">全部显示</a-radio>
                  <a-radio value="mac">按 macOS 窗口显示</a-radio>
                  <a-radio value="windows">按 Windows 窗口显示</a-radio>
                </a-radio-group>
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="windowOpenDevTools">打开客户端调试窗口</a-button>
                <a-button style="margin-left: 12px;" @click="clearClientData">清空客户端 Cookie/LocalStorage</a-button>
              </a-form-item>

              <a-form-item label="打开模块调试窗口">
                <a-space wrap>
                  <a-button @click="() => openModuleDevTools('n8n')">打开 n8n 调试窗口</a-button>
                  <a-button @click="() => openModuleDevTools('dify')">打开 Dify 调试窗口</a-button>
                  <a-button @click="() => openModuleDevTools('oneapi')">打开 OneAPI 调试窗口</a-button>
                  <a-button @click="() => openModuleDevTools('ragflow')">打开 RagFlow 调试窗口</a-button>
                </a-space>
              </a-form-item>

              <a-form-item label="清空模块数据（Cookie/LocalStorage）">
                <a-space wrap>
                  <a-button danger @click="() => clearModuleData('n8n')">清空 n8n 数据</a-button>
                  <a-button danger @click="() => clearModuleData('dify')">清空 Dify 数据</a-button>
                  <a-button danger @click="() => clearModuleData('oneapi')">清空 OneAPI 数据</a-button>
                  <a-button danger @click="() => clearModuleData('ragflow')">清空 RagFlow 数据</a-button>
                </a-space>
              </a-form-item>

              <a-form-item label="顶部Tab顺序">
                <a-space>
                  <a-button @click="resetTabOrderConfirm">重置顶部Tab顺序为默认</a-button>
                  <a-button danger @click="releaseAllBvConfirm">释放模块页面缓存</a-button>
                </a-space>
              </a-form-item>

              <a-divider />
              <a-alert type="error" show-icon message="Docker 危险操作（请谨慎使用）" style="margin-bottom: 12px;" />
              <div class="debug-actions">
                <a-button @click="confirmStopAll" danger>停止所有容器</a-button>
                <a-button @click="confirmRemoveAllContainers" danger>删除所有容器</a-button>
                <a-button @click="confirmRemoveAllVolumes" danger>清空所有数据卷</a-button>
                <a-button @click="confirmRemoveNetwork" danger>删除自定义网络</a-button>
                <a-button type="primary" danger @click="confirmNukeAll">一键清理（停容器→删容器→删卷→删网络）</a-button>
              </div>
            </a-form>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { SaveOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { IPC } from '../../shared/ipc-contract'
import { windowOpenDevTools, windowClearClientData, dockerStopAll, dockerRemoveAllContainers, dockerRemoveAllVolumes, dockerRemoveCustomNetwork, dockerNukeAll, getModuleStatus, bvRelease, bvOpenDevTools, bvClearData } from '../services/ipc'
import { moduleStore } from '../stores/modules'
import { clearAllPending } from '../stores/ops'

const activeTab = ref('system')
let lastActiveTab = 'system'
const inited = ref(false)
const hasUserEdited = ref(false)

const systemSettings = ref({ name: 'AI-Server 管理平台', port: 8080, logLevel: 'info', autoStart: true })
// 语言与新窗口策略（持久化）
const systemLanguage = ref<'zh'|'en'>('zh')
const newWindowMode = ref<'in_app'|'system'>('in_app')
const net = ref<{ mirrors: string[]; proxyMode: 'direct'|'system'|'manual'; proxyHost?: string; proxyPort?: number }>({ mirrors: [''], proxyMode: 'direct' })
const n8n = ref({ port: 5678, dbUrl: 'postgresql://localhost:5432/n8n', env: 'NODE_ENV=production\nN8N_BASIC_AUTH_ACTIVE=true' })
const dify = ref({ port: 5001, dbUrl: 'postgresql://localhost:5432/dify', env: '' })
const oneapi = ref({ port: 3000, apiKey: '', config: '' })
const ragflow = ref({ port: 8000, vectorUrl: 'qdrant://localhost:6333', env: '' })
const ui = ref<{ windowControlsMode: 'all'|'mac'|'windows' }>({ windowControlsMode: 'all' })
const debug = ref<{ showTrayNative: boolean; showTrayCustom: boolean }>({ showTrayNative: false, showTrayCustom: false })

const saveSettings = async () => { try { await new Promise(r => setTimeout(r, 800)); message.success('设置保存成功（Demo）') } catch { message.error('设置保存失败') } }

// Tray 模式（实时生效）
async function applyTrayMode() {
  try {
    const payload = { global: { showTrayNative: !!debug.value.showTrayNative, showTrayCustom: !!debug.value.showTrayCustom } }
    const res = await (window as any).api.invoke(IPC.ConfigSet, payload)
    if (!res?.success) throw new Error(res?.message || '保存 Tray 设置失败')
    message.success('托盘设置已应用')
  } catch (e:any) {
    message.error(e?.message || '应用 Tray 设置失败')
  }
}
const resetSettings = () => { systemSettings.value = { name: 'AI-Server 管理平台', port: 8080, logLevel: 'info', autoStart: true }; message.info('设置已重置') }
const testConnection = async () => { try { await new Promise(r => setTimeout(r, 800)); message.success('连接测试成功（Demo）') } catch { message.error('连接测试失败') } }

async function loadNetwork() {
  try {
    const res = await (window as any).api.invoke(IPC.ConfigGet, 'global')
    if (res?.success) {
      const g = res.data || {}
      const proxy = g?.network?.proxy || {}
      const mirrors = Array.isArray(g?.docker?.mirrors) ? g.docker.mirrors : []
      net.value.mirrors = mirrors.length ? mirrors : ['']
      net.value.proxyMode = (proxy.mode || 'direct')
      net.value.proxyHost = proxy.host || ''
      net.value.proxyPort = proxy.port || undefined
      // UI 设置
      const mode = g?.ui?.windowControlsMode
      ui.value.windowControlsMode = (mode === 'mac' || mode === 'windows' || mode === 'all') ? mode : 'all'
      // 语言与新窗口策略
      systemLanguage.value = (g?.ui?.language === 'en' ? 'en' : 'zh')
      newWindowMode.value = (g?.ui?.newWindowMode === 'system' ? 'system' : 'in_app')
      // Tray 设置
      debug.value.showTrayNative = !!g?.showTrayNative || !!g?.showTray // 兼容旧字段
      debug.value.showTrayCustom = !!g?.showTrayCustom
      // 配置注入完毕再拍快照并标记初始化完成
      takeSnapshot()
      inited.value = true
    }
  } catch (e:any) {
    console.error('loadNetwork error', e)
  }
}

async function saveNetwork() {
  try {
    const payload = {
      global: {
        docker: { mirrors: net.value.mirrors.filter(x => String(x || '').trim()) },
        network: { proxy: { mode: net.value.proxyMode, host: net.value.proxyHost, port: net.value.proxyPort } }
      }
    }
    const res = await (window as any).api.invoke(IPC.ConfigSet, payload)
    if (!res?.success) throw new Error(res?.message || '保存失败')
    message.success('网络设置已保存并生效')
  } catch (e:any) {
    message.error(e?.message || '保存失败')
  }
}

const reloadNetwork = () => loadNetwork()

onMounted(() => { loadNetwork() })

function addMirror() { net.value.mirrors.push('') }
function removeMirror(i: number) { if (net.value.mirrors.length > 1) net.value.mirrors.splice(i, 1) }

// 拖拽排序逻辑
const mirrorDrag = ref<{ from: number | null }>({ from: null })
function onMirrorDragStart(i: number) { mirrorDrag.value.from = i }
function onMirrorDragOver(_i: number) { /* 可加高亮占位 */ }
function onMirrorDrop(to: number) {
  const from = mirrorDrag.value.from
  mirrorDrag.value.from = null
  if (from === null || from === to) return
  const arr = [...net.value.mirrors]
  const [m] = arr.splice(from, 1)
  arr.splice(to, 0, m)
  net.value.mirrors = arr
}

// ---------- 脏标记与离开确认 ----------
const initialSnapshot = ref<string>('')
function takeSnapshot() {
  const snap = JSON.stringify({ systemSettings: systemSettings.value, net: net.value, n8n: n8n.value, dify: dify.value, oneapi: oneapi.value, ragflow: ragflow.value })
  initialSnapshot.value = snap
}
function isDirty(): boolean {
  const cur = JSON.stringify({ systemSettings: systemSettings.value, net: net.value, n8n: n8n.value, dify: dify.value, oneapi: oneapi.value, ragflow: ragflow.value })
  return cur !== initialSnapshot.value
}

// 首次加载后由 loadNetwork 内部调用 takeSnapshot()+inited=true

// 切换Tab拦截
watch(activeTab, (val, oldVal) => {
  if (!inited.value) { lastActiveTab = val; return }
  if (!(hasUserEdited.value && isDirty())) { lastActiveTab = val; return }
  // 有未保存更改，弹出确认
  Modal.confirm({
    title: '有未保存的更改',
    content: '切换会丢失未保存的更改，是否继续？',
    okText: '继续',
    cancelText: '取消',
    onOk: () => { lastActiveTab = val; takeSnapshot() },
    onCancel: () => { activeTab.value = lastActiveTab },
  })
})

// 离开页面拦截
// 使用 beforeunload 提示刷新/关闭窗口的场景
window.addEventListener('beforeunload', (e) => {
  if (!isDirty()) return
  e.preventDefault()
  e.returnValue = ''
})

// 使用 history 拦截路由跳转（简单处理：由 Logs/其它菜单触发的跳转时也会提示）
// 若项目中有 onBeforeRouteLeave 可替换为更优雅的路由守卫方式

// ---- 实时应用 UI 窗口控制样式 ----
async function applyUiMode() {
  try {
    // 立即通知当前窗口实时应用
    window.dispatchEvent(new CustomEvent('ui-window-controls-mode', { detail: ui.value.windowControlsMode }))
    // 持久化到全局配置
    const payload = { global: { ui: { windowControlsMode: ui.value.windowControlsMode } } }
    const res = await (window as any).api.invoke(IPC.ConfigSet, payload)
    if (!res?.success) throw new Error(res?.message || '保存 UI 设置失败')
  } catch (e:any) {
    message.error(e?.message || '应用 UI 设置失败')
  }
}

// ---- 打开模块 BrowserView 的 DevTools ----
async function openModuleDevTools(name: 'n8n'|'dify'|'oneapi'|'ragflow') {
  try {
    await bvOpenDevTools(name)
    message.success(`已打开 ${name} 调试窗口`)
  } catch (e:any) {
    message.error(e?.message || '打开模块调试窗口失败（模块页面可能尚未加载）')
  }
}

// ---- 清空数据（Cookie/LocalStorage 等） ----
async function clearClientData() {
  try {
    await windowClearClientData()
    message.success('已清空客户端 Cookie/LocalStorage')
  } catch (e:any) {
    message.error(e?.message || '清空客户端数据失败')
  }
}

async function clearModuleData(name: 'n8n'|'dify'|'oneapi'|'ragflow') {
  try {
    await bvClearData(name)
    message.success(`已清空 ${name} 数据`)
  } catch (e:any) {
    message.error(e?.message || '清空模块数据失败')
  }
}

// ---- 系统设置保存/重置（仅应用到 language 与 newWindowMode） ----
async function saveSystem() {
  try {
    const payload = { global: { ui: { language: systemLanguage.value, newWindowMode: newWindowMode.value } } }
    const res = await (window as any).api.invoke(IPC.ConfigSet, payload)
    if (!res?.success) throw new Error(res?.message || '保存失败')
    message.success('系统设置已保存，语言将应用到后续打开的模块页面')
  } catch (e:any) {
    message.error(e?.message || '保存失败')
  }
}
function resetSystem() {
  systemLanguage.value = 'zh'
  newWindowMode.value = 'in_app'
}

// ---- Docker 维护：带二次确认 ----
function confirmStopAll() {
  Modal.confirm({
    title: '停止所有容器',
    content: '确认停止所有 AI-Server 相关容器？',
    okText: '停止',
    okButtonProps: { danger: true },
    onOk: async () => {
      console.log('[settings] dockerStopAll ->')
      await dockerStopAll()
      // 停止所有容器后，清空所有模块 pending，避免首页loading残留
      try { clearAllPending(); console.log('[settings] clearAllPending() done') } catch { console.warn('[settings] clearAllPending() failed') }
      await refreshModuleStatus()
      message.success('已停止相关容器')
    },
  })
}
function confirmRemoveAllContainers() {
  Modal.confirm({
    title: '删除所有容器',
    content: '确认删除所有 AI-Server 相关容器？（不可恢复）',
    okText: '删除',
    okButtonProps: { danger: true },
    onOk: async () => {
      console.log('[settings] dockerRemoveAllContainers ->')
      await dockerRemoveAllContainers()
      try { clearAllPending(); console.log('[settings] clearAllPending() done') } catch {}
      await refreshModuleStatus()
      message.success('已删除相关容器')
    },
  })
}
function confirmRemoveAllVolumes() {
  Modal.confirm({
    title: '清空所有数据卷',
    content: '将删除 ai-server-* 相关命名卷，数据将不可恢复。是否继续？',
    okText: '清空数据卷',
    okButtonProps: { danger: true },
    onOk: async () => {
      console.log('[settings] dockerRemoveAllVolumes ->')
      await dockerRemoveAllVolumes()
      try { clearAllPending() } catch {}
      await refreshModuleStatus()
      message.success('已清空数据卷')
    },
  })
}
function confirmRemoveNetwork() {
  Modal.confirm({
    title: '删除自定义网络',
    content: '将删除网络 ai-server-net，是否继续？',
    okText: '删除网络',
    okButtonProps: { danger: true },
    onOk: async () => { console.log('[settings] dockerRemoveCustomNetwork ->'); await dockerRemoveCustomNetwork(); message.success('已删除自定义网络') },
  })
}
function confirmNukeAll() {
  Modal.confirm({
    title: '一键清理（危险操作）',
    content: '将停止并删除所有容器、清空数据卷并删除网络。此操作不可恢复，是否继续？',
    okText: '我已知晓风险，继续',
    okButtonProps: { danger: true },
    onOk: async () => {
      console.log('[settings] dockerNukeAll ->')
      await dockerNukeAll()
      try { clearAllPending(); console.log('[settings] clearAllPending() done') } catch {}
      await refreshModuleStatus()
      message.success('已完成一键清理')
    },
  })
}

async function refreshModuleStatus() {
  const names = ['n8n','dify','oneapi','ragflow']
  for (const n of names) {
    try {
      const resp = await getModuleStatus(n as any)
      const st = (resp as any)?.status
      ;(moduleStore.dots as any)[n] = st === 'parse_error' ? 'error' : (st || 'stopped')
    } catch {}
  }
  // 触发一次 UI 刷新
  try { window.dispatchEvent(new CustomEvent('modules-status-refreshed')) } catch {}
}

function resetTabOrderConfirm() {
  Modal.confirm({
    title: '重置顶部Tab顺序',
    content: '将恢复为默认顺序：n8n、Dify、OneAPI、RagFlow。是否继续？',
    okText: '重置',
    onOk: async () => {
      try {
        window.dispatchEvent(new CustomEvent('ui-reset-tab-order'))
        message.success('已重置为默认顺序')
      } catch (e:any) {
        message.error(e?.message || '重置失败')
      }
    }
  })
}

function releaseAllBvConfirm() {
  Modal.confirm({
    title: '释放模块页面缓存',
    content: '将销毁所有模块的 BrowserView，下次进入模块会重新加载页面。是否继续？',
    okText: '释放',
    onOk: async () => {
      try { await bvRelease(); message.success('已释放模块页面缓存') } catch (e:any) { message.error(e?.message || '释放失败') }
    }
  })
}

// 标记用户实际编辑过表单，避免刚进入页面切换Tab就弹窗
onMounted(() => {
  const root = document.querySelector('.settings-card') as HTMLElement | null
  if (!root) return
  const markEdited = () => { if (inited.value) hasUserEdited.value = true }
  root.addEventListener('input', markEdited)
  root.addEventListener('change', markEdited)
})
</script>

<style scoped>
.settings-view { padding: var(--spacing-xl); max-width: 1200px; margin: 0 auto; }
.settings-header { margin-bottom: var(--spacing-xl); text-align: center; }
.settings-title { font-size: var(--text-3xl); font-weight: 600; color: var(--text-primary); margin: 0 0 var(--spacing-sm) 0; }
.settings-subtitle { font-size: var(--text-base); color: var(--text-secondary); margin: 0; }
.settings-content { width: 100%; }
.settings-card { border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); padding: var(--spacing-xl); background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); }
.settings-card :deep(.ant-tabs-left) { height: 100%; }
.settings-card :deep(.ant-tabs) { height: 100%; }
.settings-card :deep(.ant-tabs-nav) { height: 100%; }
.settings-card :deep(.ant-tabs-tab) { white-space: nowrap; }
.settings-card { min-height: calc(100vh - 40px - 120px); }
.settings-card :deep(.ant-tabs-nav-more) { display: none !important; }
.settings-card :deep(.ant-tabs-nav-wrap),
.settings-card :deep(.ant-tabs-nav-list) { overflow: visible !important; }
.settings-actions { display: flex; gap: var(--spacing-md); justify-content: center; margin-top: var(--spacing-xl); padding-top: var(--spacing-xl); border-top: 1px solid var(--border-light); }
.mirror-list { display: flex; flex-direction: column; gap: 8px; }
.mirror-row { display: flex; gap: 8px; align-items: center; padding: 6px; border: 1px dashed transparent; border-radius: 6px; }
.mirror-row.drag-over { background: var(--bg-tertiary); border-color: var(--border-light); }
.drag-handle { cursor: grab; user-select: none; color: var(--text-tertiary); padding: 0 6px; font-weight: 700; }
.settings-actions .ant-btn { min-width: 120px; border-radius: var(--radius-md); font-weight: 500; transition: all var(--transition-base); }
.settings-actions .ant-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.settings-actions .ant-btn-primary { background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); border: none; box-shadow: 0 0 20px rgba(0, 122, 255, 0.3); }

@media (max-width: 768px) { .settings-view { padding: var(--spacing-lg); } .settings-actions { flex-direction: column; } .settings-actions .ant-btn { width: 100%; } }

.action-button { border-radius: var(--radius-md); font-weight: 500; transition: all var(--transition-base); font-size: var(--text-sm); height: 36px; position: relative; overflow: hidden; }
.debug-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.action-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s; }
.action-button:hover::before { left: 100%; }
.action-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); }
.save-btn { background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); border: none; color: var(--text-white) !important; box-shadow: 0 0 20px rgba(24, 144, 255, 0.3); }
.refresh-btn { background: linear-gradient(135deg, var(--warning-color) 0%, #ffa940 100%); border: none; color: var(--text-white) !important; box-shadow: 0 0 20px rgba(250, 173, 20, 0.3); }
</style>
