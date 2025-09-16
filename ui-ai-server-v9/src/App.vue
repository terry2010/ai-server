<template>
  <a-config-provider :theme="theme">
    <div class="app-root">
      <a-layout class="app-layout">
        <!-- 顶部 Tabs 导航（玻璃拟态） -->
        <a-layout-header class="glass header">
          <div class="brand">
            <div class="brand-dot" />
            <span>AI-Server</span>
          </div>
          <a-tabs v-model:activeKey="activeTab" @change="onTabChange" class="top-tabs" :animated="{inkBar: true, tabPane: true}">
            <a-tab-pane key="home" tab="首页" />
            <a-tab-pane v-for="s in services" :key="s.key">
              <template #tab>
                <span class="tab-item">
                  <StatusDot :status="s.status" />
                  <span>{{ s.name }}</span>
                </span>
              </template>
            </a-tab-pane>
          </a-tabs>
        </a-layout-header>

        <a-layout>
          <!-- 左侧菜单（设置） -->
          <a-layout-sider width="240" class="glass sider" :collapsedWidth="0" breakpoint="lg">
            <a-menu
              mode="inline"
              v-model:selectedKeys="selectedMenu"
              :items="menuItems"
            />
          </a-layout-sider>

          <a-layout-content class="content">
            <!-- 通栏 Banner -->
            <div class="glass banner">
              <div class="banner-left">
                <div class="title">欢迎使用 AI-Server 管理平台</div>
                <div class="sub">统一管理与监控 n8n / Dify / OneAPI / RagFlow 等服务</div>
                <div class="status-row">
                  <StatusDot status="running" /> 3 运行中
                  <span class="sep" />
                  <StatusDot status="stopped" /> 1 已停止
                </div>
              </div>
              <div class="banner-actions">
                <a-space>
                  <a-button type="primary" size="large" @click="mockAction('一键体检')" class="btn-gradient">一键体检</a-button>
                  <a-button size="large" @click="mockAction('刷新状态')">刷新状态</a-button>
                </a-space>
              </div>
            </div>

            <!-- 服务卡片网格 -->
            <div class="cards-grid">
              <ServiceCard
                v-for="s in services"
                :key="s.key"
                :name="s.name"
                :status="s.status"
                :metrics="s.metrics"
                :icon="s.icon"
                @start="mockAction(`启动 ${s.name}`)"
                @stop="mockAction(`停止 ${s.name}`)"
                @restart="mockAction(`重启 ${s.name}`)"
              />
            </div>

            <router-view />
          </a-layout-content>
        </a-layout>
      </a-layout>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { h, reactive, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { SettingOutlined, ToolOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import StatusDot from '@/components/StatusDot.vue'
import ServiceCard from '@/components/ServiceCard.vue'

const router = useRouter()
const activeTab = ref('home')

const services = reactive([
  {
    key: 'n8n',
    name: 'n8n',
    status: 'running',
    icon: h(ToolOutlined),
    metrics: { cpu: '15%', memory: '256MB', uptime: '2h 30m' }
  },
  {
    key: 'dify',
    name: 'Dify',
    status: 'running',
    icon: h(ThunderboltOutlined),
    metrics: { cpu: '12%', memory: '320MB', uptime: '1h 18m' }
  },
  {
    key: 'oneapi',
    name: 'OneAPI',
    status: 'stopped',
    icon: h(SettingOutlined),
    metrics: { cpu: '—', memory: '—', uptime: '—' }
  },
  {
    key: 'ragflow',
    name: 'RagFlow',
    status: 'running',
    icon: h(ThunderboltOutlined),
    metrics: { cpu: '9%', memory: '180MB', uptime: '45m' }
  }
])

const menuItems = [
  { key: 'system', icon: h(SettingOutlined), label: '系统设置' },
  { key: 'n8n-setting', icon: h(ToolOutlined), label: 'n8n 设置' },
  { key: 'dify-setting', icon: h(ToolOutlined), label: 'Dify 设置' },
  { key: 'oneapi-setting', icon: h(ThunderboltOutlined), label: 'OneAPI 设置' },
]
const selectedMenu = ref<string[]>(['system'])

const theme = {
  token: {
    colorPrimary: '#0A84FF',
    colorInfo: '#0A84FF',
    colorLink: '#0A84FF',
    colorBorder: 'rgba(12,12,13,0.08)',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
  }
}

function onTabChange(key: string) {
  if (key === 'home') {
    router.push({ name: 'home' })
  } else {
    router.push({ name: key })
  }
}

function mockAction(name: string) {
  // 纯前端演示交互
  // 未来可接入后端 IPC/HTTP 控制
  window.console.info('[action]', name)
}

// 路由与顶部 Tab 同步
onMounted(() => {
  const name = router.currentRoute.value.name as string | undefined
  if (name) {
    activeTab.value = name
  }
})
watch(
  () => router.currentRoute.value.name,
  (name) => {
    if (typeof name === 'string') {
      activeTab.value = name
    }
  }
)
</script>

<style scoped>
.app-root { height: 100%; }
.app-layout { min-height: 100vh; background: transparent; }

.header {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 64px;
  margin: 12px 12px 0;
  border-radius: 14px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #0A84FF;
  margin-right: 16px;
}
.brand-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: linear-gradient(135deg, #0A84FF, #5EB2FF);
  box-shadow: 0 0 10px rgba(10,132,255,0.6);
}
.top-tabs {
  flex: 1;
}
.top-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}
.top-tabs :deep(.ant-tabs-tab) {
  padding: 10px 16px;
  border-radius: 8px 8px 0 0;
  transition: all .3s ease;
}
.top-tabs :deep(.ant-tabs-tab:hover) {
  background: rgba(10,132,255,0.06);
}
.top-tabs :deep(.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #0A84FF;
}
.top-tabs :deep(.ant-tabs-ink-bar) {
  height: 3px;
  background: linear-gradient(90deg, #0A84FF, #5EB2FF);
  border-radius: 6px;
}
.tab-item { display: inline-flex; align-items: center; gap: 8px; }

.sider {
  margin: 12px 0 12px 12px;
  border-radius: 14px;
  padding: 8px 0;
}
.content {
  margin: 12px 12px 12px 12px;
  padding: 12px;
}
.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 120px;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(10,132,255,0.18), rgba(94,178,255,0.18));
}
.title { font-size: 20px; font-weight: 700; color: #0A1F44; }
.sub { color: #425466; margin-top: 6px; }
.status-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; color: #334155; }
.sep { display: inline-block; width: 10px; height: 1px; background: rgba(2,6,23,0.16); margin: 0 6px; }

.btn-gradient {
  background: linear-gradient(135deg, #0A84FF 0%, #5EB2FF 100%);
  box-shadow: 0 6px 18px rgba(10,132,255,0.35);
}
.btn-gradient:hover { filter: brightness(1.02); }

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 16px;
}
</style>
