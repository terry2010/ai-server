<template>
  <a-card title="环境诊断">
    <a-space>
      <a-button type="primary" @click="onDiagnose" :loading="loading">运行检测</a-button>
      <a-tag v-if="env?.docker?.installed" color="green">Docker: 已安装</a-tag>
      <a-tag v-else color="red">Docker: 未安装</a-tag>
      <a-tag v-if="env?.docker?.running" color="green">Docker: 运行中</a-tag>
      <a-tag v-else color="red">Docker: 未运行</a-tag>
      <a-tag v-if="env?.docker?.version" color="blue">{{ env?.docker?.version }}</a-tag>
      <a-tag v-if="env?.docker?.compose" color="gold">Compose: {{ env?.docker?.compose }}</a-tag>
    </a-space>
  </a-card>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

interface Env {
  docker: { installed: boolean; running: boolean; compose: 'docker compose' | 'docker-compose' | null; version?: string };
  issues?: string[];
}

const loading = ref(false);
const env = ref<Env | null>(null);

const onDiagnose = async () => {
  loading.value = true;
  const res = await (window as any).api.invoke('ai/env/diagnose');
  env.value = res?.data || null;
  loading.value = false;
};

onMounted(() => onDiagnose());
</script>
