<template>
  <a-row :gutter="12">
    <a-col v-for="m in items" :key="m.name" :xs="24" :sm="12" :md="8" :lg="6">
      <a-card :title="m.name" style="margin-bottom:12px">
        <template #extra>
          <a-tag v-if="m.type==='basic'" color="blue">基础</a-tag>
          <a-tag v-else color="purple">功能</a-tag>
        </template>
        <a-space>
          <a-button size="small" type="primary" @click="$emit('action','start', m.name)">启动</a-button>
          <a-button size="small" @click="$emit('action','stop', m.name)">停止</a-button>
          <a-button size="small" danger @click="$emit('action','clear', m.name)">清理</a-button>
        </a-space>
      </a-card>
    </a-col>
  </a-row>
</template>

<script lang="ts" setup>
import { defineProps } from 'vue';

defineProps<{ items: Array<{ name: string; type: 'basic'|'feature' }>; type: 'basic'|'feature' }>();
</script>
