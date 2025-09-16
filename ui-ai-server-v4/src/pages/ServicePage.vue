<template>
  <div style="height:100%; display:flex; flex-direction: column;">
    <TopTabs :tabs="tabs" :activeKey="activeKey" @change="onTabChange" />
    <div style="background:#fff; padding: 16px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:12px;">
        <span class="status-indicator running" />
        <span style="font-weight:600; font-size:16px;">{{ service }} 服务</span>
        <a-tag color="processing">运行中</a-tag>
      </div>
      <div class="flex" style="gap:8px;">
        <a-button type="primary">启动</a-button>
        <a-button danger>停止</a-button>
        <a-button>重启</a-button>
      </div>
    </div>

    <div style="flex:1; padding: 16px; display:grid; grid-template-columns: 1.2fr 1fr; gap: 16px;">
      <a-card title="状态面板">
        <div class="flex" style="gap: 24px;">
          <div>CPU：<b>15%</b></div>
          <div>内存：<b>256MB</b></div>
          <div>Uptime：<b>2h 30m</b></div>
        </div>
      </a-card>
      <a-card title="配置管理">
        <a-form layout="vertical" style="max-width: 420px;">
          <a-form-item label="端口">
            <a-input-number :min="1" :max="65535" style="width:100%" :value="5678" />
          </a-form-item>
          <a-form-item label="数据库">
            <a-select :value="'sqlite'">
              <a-select-option value="sqlite">SQLite</a-select-option>
              <a-select-option value="mysql">MySQL</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="加密密钥">
            <a-input-password placeholder="******" />
          </a-form-item>
          <a-space>
            <a-button type="primary">保存</a-button>
            <a-button>重置</a-button>
          </a-space>
        </a-form>
      </a-card>

      <a-card title="日志">
        <a-typography-paragraph type="secondary">这里显示最近的 100 行日志（示例占位）。</a-typography-paragraph>
        <a-list :data-source="logs" bordered :split="false">
          <template #renderItem="{ item }">
            <a-list-item style="font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo; font-size:12px;">{{ item }}</a-list-item>
          </template>
        </a-list>
      </a-card>
      <a-card title="性能图表">
        <div class="center" style="height:240px; color:#8c8c8c;">图表占位（ECharts 可插入）</div>
      </a-card>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopTabs from '../components/TopTabs.vue'

const props = defineProps<{ service?: string }>()

const route = useRoute();
const router = useRouter();

const tabs = [
  { key: 'home', label: '首页' },
  { key: 'n8n', label: 'n8n', status: 'running' },
  { key: 'Dify', label: 'Dify', status: 'running' },
  { key: 'OneAPI', label: 'OneAPI', status: 'stopped' },
  { key: 'RagFlow', label: 'RagFlow', status: 'running' }
]

const activeKey = computed(() => (route.name as string) || 'home')

function onTabChange(key: string) {
  if (key === 'home') router.push('/')
  else router.push('/' + key.toLowerCase())
}

const logs = Array.from({ length: 12 }).map((_, i) => `2025-09-12 02:4${i} INFO  ${props.service || route.name} 正常运行...`)
</script>
