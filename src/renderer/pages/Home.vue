<template>
  <div style="padding:16px">
    <a-page-header title="AI-Server 开发原型" sub-title="单窗口 / 环境诊断 与 模块管理" />

    <div style="margin-top:12px">
      <env-card />
    </div>

    <a-tabs style="margin-top:12px">
      <a-tab-pane key="basic" tab="基础服务模块">
        <module-list :items="basicView" type="basic" @action="onAction" />
      </a-tab-pane>
      <a-tab-pane key="feature" tab="功能模块">
        <module-list :items="featureView" type="feature" @action="onAction" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { message } from 'ant-design-vue';
import ModuleList from '@/renderer/components/ModuleList.vue';
import EnvCard from '@/renderer/components/EnvCard.vue';

const basicModules = ref<any[]>([]);
const featureModules = ref<any[]>([]);
const statusMap = ref<Record<string, { running: boolean; status: string; portsText: string }>>({});
let timer: any = null;

const loadModules = async () => {
  const res = await (window as any).api.invoke('ai/modules/list');
  const items = res?.data?.items || [];
  basicModules.value = items.filter((i: any) => i.type === 'basic');
  featureModules.value = items.filter((i: any) => i.type === 'feature');
};

const onAction = async (action: string, name: string) => {
  try {
    let res;
    if (action === 'firstStart') res = await (window as any).api.invoke('ai/module/firstStart', { name });
    if (action === 'start') res = await (window as any).api.invoke('ai/module/start', { name });
    if (action === 'stop') res = await (window as any).api.invoke('ai/module/stop', { name });
    if (action === 'clear') res = await (window as any).api.invoke('ai/module/clear', { name });
    if (res?.success) message.success(res?.message || `${action} ${name} 成功`);
    else message.error(res?.message || `${action} ${name} 失败`);
  } catch (e: any) {
    message.error(String(e?.message ?? e));
  }
  // 操作后主动刷新一次
  await pollStatuses();
};

const pollStatuses = async () => {
  const all = [...basicModules.value, ...featureModules.value];
  for (const m of all) {
    try {
      const res = await (window as any).api.invoke('ai/module/status', { name: m.name });
      const data = res?.data || { running: false, status: 'stopped', ports: {} };
      // 汇总与该模块相关的端口（容器名包含模块名）
      const portsText = Object.entries(data.ports || {})
        .filter(([containerName]) => String(containerName).includes(m.name))
        .map(([, v]) => String(v)).join(' | ');
      statusMap.value[m.name] = { running: !!data.running, status: String(data.status), portsText };
    } catch {
      statusMap.value[m.name] = { running: false, status: 'error', portsText: '' };
    }
  }
};

const basicView = computed(() => basicModules.value.map(m => ({
  ...m,
  running: statusMap.value[m.name]?.running ?? false,
  status: statusMap.value[m.name]?.status ?? 'stopped',
  portsText: statusMap.value[m.name]?.portsText ?? ''
})));

const featureView = computed(() => featureModules.value.map(m => ({
  ...m,
  running: statusMap.value[m.name]?.running ?? false,
  status: statusMap.value[m.name]?.status ?? 'stopped',
  portsText: statusMap.value[m.name]?.portsText ?? ''
})));

onMounted(async () => {
  await loadModules();
  await pollStatuses();
  timer = setInterval(pollStatuses, 3000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>
