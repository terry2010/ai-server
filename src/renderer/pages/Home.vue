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

    <a-card style="margin-top:12px" title="配置中心">
      <a-space direction="vertical" style="width:100%">
        <a-checkbox v-model:checked="globalConfig.logToConsole" @change="onToggleLogToConsole">
          日志输出到 console（启动/停止返回的 docker 命令与输出）
        </a-checkbox>
        <a-checkbox v-model:checked="globalConfig.autoStopUnusedDeps" @change="onToggleAutoStopUnusedDeps">
          自动回收未被占用的基础服务（停止功能模块后，如无其他运行的功能模块依赖该基础服务，则尝试自动停止）
        </a-checkbox>
      </a-space>
    </a-card>

    <div style="margin-top:12px">
      <logs-panel :logs="logsPanelLogs" title="操作日志" @open-logs="onOpenLogsDir" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import ModuleList from '@/renderer/components/ModuleList.vue';
import LogsPanel from '@/renderer/components/LogsPanel.vue';
import EnvCard from '@/renderer/components/EnvCard.vue';
import { IPC } from '@/shared/ipc-contract';

const basicModules = ref<any[]>([]);
const featureModules = ref<any[]>([]);
const statusMap = ref<Record<string, { running: boolean; status: string; portsText: string; usedBy?: string[] }>>({});
let timer: any = null;
const logsPanelLogs = ref<Array<{ type: 'cmd' | 'stdout' | 'stderr' | 'info' | 'error'; text: string }>>([]);

const globalConfig = ref<{ bindAddress?: string; autoStartDeps?: boolean; autoSuggestNextPort?: boolean; logToConsole?: boolean; autoStopUnusedDeps?: boolean }>({ logToConsole: true, autoStopUnusedDeps: false });

const loadModules = async () => {
  const res = await (window as any).api.invoke('ai/modules/list');
  const items = res?.data?.items || [];
  basicModules.value = items.filter((i: any) => i.type === 'basic');
  featureModules.value = items.filter((i: any) => i.type === 'feature');
};

function showIpcError(res: any, action: string, name: string) {
  const code = res?.code as string | undefined;
  const msg = res?.message || `${action} ${name} 失败`;
  const logs = res?.data?.logs as Array<{ cmd: string; stdout?: string; stderr?: string }> | undefined;
  const details: string[] = [];
  if (code) details.push(`code: ${code}`);
  if (msg) details.push(`message: ${msg}`);
  if (Array.isArray(logs) && logs.length) {
    details.push('logs:');
    for (const it of logs) {
      details.push(`> ${it.cmd}`);
      if (it.stdout) details.push(String(it.stdout).trim());
      if (it.stderr) details.push(String(it.stderr).trim());
    }
  }
  const detailText = details.join('\n');

  if (code === 'E_TEMPLATE_MISSING') {
    Modal.error({
      title: '模板缺失（E_TEMPLATE_MISSING）',
      content: () => h('pre', { style: 'white-space: pre-wrap' }, detailText),
      onOk: () => navigator.clipboard?.writeText(detailText).catch(() => void 0)
    });
    return;
  }
  if (code === 'E_VAR_MISSING') {
    Modal.warning({
      title: '缺失变量默认值（E_VAR_MISSING）',
      content: () => h('pre', { style: 'white-space: pre-wrap' }, detailText),
      onOk: () => navigator.clipboard?.writeText(detailText).catch(() => void 0)
    });
    return;
  }
  if (code === 'E_RUNTIME') {
    Modal.error({
      title: '运行时错误（E_RUNTIME）',
      content: () => h('pre', { style: 'white-space: pre-wrap' }, detailText),
      onOk: () => navigator.clipboard?.writeText(detailText).catch(() => void 0)
    });
    return;
  }
  if (code === 'E_IN_USE') {
    Modal.info({
      title: '基础服务正被占用（E_IN_USE）',
      content: () => h(
        'div',
        { style: 'white-space: pre-wrap' },
        [
          h('p', null, '该基础服务仍被正在运行的功能模块依赖，已阻止停止以避免影响其他服务。'),
          h('p', null, '如需停止，请先停止依赖它的功能模块，或在设置中启用“自动回收未占用基础服务”后重试。'),
          h('pre', null, detailText)
        ]
      ),
      onOk: () => navigator.clipboard?.writeText(detailText).catch(() => void 0)
    });
    return;
  }
  message.error(msg);
}

const onAction = async (action: string, name: string) => {
  try {
    let res;
    const useStream = globalConfig.value.logToConsole !== false;
    if (useStream) {
      const streamId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const label = `[${action}:${name}] docker stream`;
      const handler = (_e: any, payload: any) => {
        if (!payload || payload.streamId !== streamId) return;
        const evt = payload.event as 'cmd' | 'stdout' | 'stderr' | 'end' | 'error';
        if (evt === 'cmd') {
          // eslint-disable-next-line no-console
          console.groupCollapsed(label);
          // eslint-disable-next-line no-console
          console.log('> ' + payload.cmd);
          logsPanelLogs.value.push({ type: 'cmd', text: String(payload.cmd || '') });
        } else if (evt === 'stdout') {
          // eslint-disable-next-line no-console
          console.log((payload.chunk || '').trim());
          const t = String(payload.chunk || '').trim(); if (t) logsPanelLogs.value.push({ type: 'stdout', text: t });
        } else if (evt === 'stderr') {
          // eslint-disable-next-line no-console
          console.warn((payload.chunk || '').trim());
          const t = String(payload.chunk || '').trim(); if (t) logsPanelLogs.value.push({ type: 'stderr', text: t });
        } else if (evt === 'error') {
          // eslint-disable-next-line no-console
          console.error(payload.message || 'stream error');
          logsPanelLogs.value.push({ type: 'error', text: String(payload.message || 'stream error') });
        } else if (evt === 'end') {
          // eslint-disable-next-line no-console
          console.groupEnd();
        }
      };
      (window as any).api.on(IPC.ModuleLogEvent, handler);
      try {
        if (action === 'firstStart') res = await (window as any).api.invoke(IPC.ModuleFirstStartStream, { name, streamId });
        if (action === 'start') res = await (window as any).api.invoke(IPC.ModuleStartStream, { name, streamId });
        if (action === 'stop') res = await (window as any).api.invoke(IPC.ModuleStopStream, { name, streamId });
        if (action === 'clear') res = await (window as any).api.invoke('ai/module/clear', { name });
      } finally {
        (window as any).api.off(IPC.ModuleLogEvent, handler);
      }
    } else {
      if (action === 'firstStart') res = await (window as any).api.invoke('ai/module/firstStart', { name });
      if (action === 'start') res = await (window as any).api.invoke('ai/module/start', { name });
      if (action === 'stop') res = await (window as any).api.invoke('ai/module/stop', { name });
      if (action === 'clear') res = await (window as any).api.invoke('ai/module/clear', { name });
      // 根据配置打印后端返回的 docker 执行日志（一次性）
      const logs = res?.data?.logs as Array<{ cmd: string; stdout?: string; stderr?: string }> | undefined;
      if (globalConfig.value.logToConsole !== false && logs && logs.length) {
        const label2 = `[${action}:${name}] docker logs`;
        // eslint-disable-next-line no-console
        console.groupCollapsed(label2);
        for (const it of logs) {
          // eslint-disable-next-line no-console
          console.log('> ' + it.cmd);
          logsPanelLogs.value.push({ type: 'cmd', text: String(it.cmd || '') });
          if (it.stdout) console.log((it.stdout || '').trim());
          if (it.stdout) { const t = String(it.stdout || '').trim(); if (t) logsPanelLogs.value.push({ type: 'stdout', text: t }); }
          if (it.stderr) console.warn((it.stderr || '').trim());
          if (it.stderr) { const t = String(it.stderr || '').trim(); if (t) logsPanelLogs.value.push({ type: 'stderr', text: t }); }
        }
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    }
    if (res?.success) message.success(res?.message || `${action} ${name} 成功`);
    else showIpcError(res, action, name);
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
      statusMap.value[m.name] = { running: !!data.running, status: String(data.status), portsText, usedBy: (data.usedBy || []) as string[] };
    } catch {
      statusMap.value[m.name] = { running: false, status: 'error', portsText: '', usedBy: [] };
    }
  }
};

const basicView = computed(() => basicModules.value.map(m => ({
  ...m,
  running: statusMap.value[m.name]?.running ?? false,
  status: statusMap.value[m.name]?.status ?? 'stopped',
  portsText: statusMap.value[m.name]?.portsText ?? '',
  usedBy: statusMap.value[m.name]?.usedBy ?? []
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
  // 载入全局配置
  try {
    const res = await (window as any).api.invoke('ai/config/get', 'global');
    if (res?.success) globalConfig.value = { ...globalConfig.value, ...(res?.data || {}) };
  } catch {}
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

const onToggleLogToConsole = async () => {
  try {
    await (window as any).api.invoke('ai/config/set', { global: { logToConsole: !!globalConfig.value.logToConsole } });
  } catch {}
};

const onToggleAutoStopUnusedDeps = async () => {
  try {
    await (window as any).api.invoke('ai/config/set', { global: { autoStopUnusedDeps: !!globalConfig.value.autoStopUnusedDeps } });
  } catch {}
};

function onOpenLogsDir() {
  // 目前未提供主进程日志目录 IPC，先给出提示
  message.info('打开日志目录：TODO');
}
</script>
