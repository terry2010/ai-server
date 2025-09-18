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
            </a-form>
          </a-tab-pane>

          <!-- 网络设置 -->
          <a-tab-pane key="network" tab="网络设置">
            <a-alert type="info" show-icon style="margin-bottom: 12px;" :message="'Docker 镜像加速优先推荐在 Docker Desktop -> Docker Engine 配置 registry-mirrors；此处为应用侧镜像重写，能缓解国内拉取慢/超时问题。Docker 代理需在 Docker Desktop 配置 Proxies。'" />
            <a-form layout="vertical">
              <a-divider>镜像加速</a-divider>
              <a-row :gutter="24">
                <a-col :span="24">
                  <a-form-item label="镜像加速地址（支持多个）">
                    <div class="mirror-list">
                      <div class="mirror-row" v-for="(m, idx) in net.mirrors" :key="idx">
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

const activeTab = ref('system')
let lastActiveTab = 'system'

const systemSettings = ref({ name: 'AI-Server 管理平台', port: 8080, logLevel: 'info', autoStart: true })
const net = ref<{ mirrors: string[]; proxyMode: 'direct'|'system'|'manual'; proxyHost?: string; proxyPort?: number }>({ mirrors: [''], proxyMode: 'direct' })
const n8n = ref({ port: 5678, dbUrl: 'postgresql://localhost:5432/n8n', env: 'NODE_ENV=production\nN8N_BASIC_AUTH_ACTIVE=true' })
const dify = ref({ port: 5001, dbUrl: 'postgresql://localhost:5432/dify', env: '' })
const oneapi = ref({ port: 3000, apiKey: '', config: '' })
const ragflow = ref({ port: 8000, vectorUrl: 'qdrant://localhost:6333', env: '' })

const saveSettings = async () => { try { await new Promise(r => setTimeout(r, 800)); message.success('设置保存成功（Demo）') } catch { message.error('设置保存失败') } }
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

// 首次加载网络配置后记录快照
watch(() => net.value.mirrors, () => {}, { deep: true })
onMounted(() => {
  // 等待一次宏任务，确保 loadNetwork 完成后再拍快照
  setTimeout(() => takeSnapshot(), 0)
})

// 切换Tab拦截
watch(activeTab, (val, oldVal) => {
  if (oldVal === undefined) { lastActiveTab = val; return }
  if (!isDirty()) { lastActiveTab = val; return }
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
</script>

<style scoped>
.settings-view { padding: var(--spacing-xl); max-width: 1200px; margin: 0 auto; }
.settings-header { margin-bottom: var(--spacing-xl); text-align: center; }
.settings-title { font-size: var(--text-3xl); font-weight: 600; color: var(--text-primary); margin: 0 0 var(--spacing-sm) 0; }
.settings-subtitle { font-size: var(--text-base); color: var(--text-secondary); margin: 0; }
.settings-content { width: 100%; }
.settings-card { border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); padding: var(--spacing-xl); background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); }
.settings-actions { display: flex; gap: var(--spacing-md); justify-content: center; margin-top: var(--spacing-xl); padding-top: var(--spacing-xl); border-top: 1px solid var(--border-light); }
.mirror-list { display: flex; flex-direction: column; gap: 8px; }
.mirror-row { display: flex; gap: 8px; align-items: center; }
.settings-actions .ant-btn { min-width: 120px; border-radius: var(--radius-md); font-weight: 500; transition: all var(--transition-base); }
.settings-actions .ant-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.settings-actions .ant-btn-primary { background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); border: none; box-shadow: 0 0 20px rgba(0, 122, 255, 0.3); }

@media (max-width: 768px) { .settings-view { padding: var(--spacing-lg); } .settings-actions { flex-direction: column; } .settings-actions .ant-btn { width: 100%; } }

.action-button { border-radius: var(--radius-md); font-weight: 500; transition: all var(--transition-base); font-size: var(--text-sm); height: 36px; position: relative; overflow: hidden; }
.action-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s; }
.action-button:hover::before { left: 100%; }
.action-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); }
.save-btn { background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); border: none; color: var(--text-white) !important; box-shadow: 0 0 20px rgba(24, 144, 255, 0.3); }
.refresh-btn { background: linear-gradient(135deg, var(--warning-color) 0%, #ffa940 100%); border: none; color: var(--text-white) !important; box-shadow: 0 0 20px rgba(250, 173, 20, 0.3); }
</style>
