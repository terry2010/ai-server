<template>
  <div style="padding:16px">
    <a-page-header title="AI-Server 开发原型" sub-title="单窗口 / 环境诊断 与 模块管理" />

    <div style="margin-top:12px">
      <env-card />
    </div>

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
import EnvCard from '@/renderer/components/EnvCard.vue';

const basicModules = ref<any[]>([]);
const featureModules = ref<any[]>([]);

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
