<template>
  <div style="padding:16px">
    <a-page-header title="AI-Server 开发原型" sub-title="单窗口 / 环境诊断 与 模块管理" />

    <a-card style="margin-top:12px" title="环境诊断">
      <a-space>
        <a-button type="primary" @click="onDiagnose" :loading="loading">运行检测</a-button>
        <a-tag v-if="env?.docker?.installed" color="green">Docker: 已安装</a-tag>
        <a-tag v-else color="red">Docker: 未安装</a-tag>
        <a-tag v-if="env?.docker?.running" color="green">Docker: 运行中</a-tag>
        <a-tag v-else color="red">Docker: 未运行</a-tag>
      </a-space>
    </a-card>

    <a-tabs style="margin-top:12px">
      <a-tab-pane key="basic" tab="基础服务模块">
        <module-list :items="basicModules" type="basic" @action="onAction" />
      </a-tab-pane>
      <a-tab-pane key="feature" tab="功能模块">
        <module-list :items="featureModules" type="feature" @action="onAction" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import ModuleList from '@/renderer/components/ModuleList.vue';

interface Env {
  docker: { installed: boolean; running: boolean };
}

const loading = ref(false);
const env = ref<Env | null>(null);
const basicModules = ref<any[]>([]);
const featureModules = ref<any[]>([]);

const onDiagnose = async () => {
  loading.value = true;
  const res = await (window as any).api.invoke('ai/env/diagnose');
  env.value = res?.data || null;
  loading.value = false;
};

const loadModules = async () => {
  const res = await (window as any).api.invoke('ai/modules/list');
  const items = res?.data?.items || [];
  basicModules.value = items.filter((i: any) => i.type === 'basic');
  featureModules.value = items.filter((i: any) => i.type === 'feature');
};

const onAction = async (action: string, name: string) => {
  if (action === 'start') await (window as any).api.invoke('ai/module/start', { name });
  if (action === 'stop') await (window as any).api.invoke('ai/module/stop', { name });
  if (action === 'clear') await (window as any).api.invoke('ai/module/clear', { name });
};

onMounted(() => {
  loadModules();
});
</script>
