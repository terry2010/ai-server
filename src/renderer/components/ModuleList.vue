<template>
  <a-row :gutter="12">
    <a-col v-for="m in items" :key="m.name" :xs="24" :sm="12" :md="8" :lg="6">
      <a-card :title="m.name" style="margin-bottom:12px">
        <template #extra>
          <a-tag v-if="m.type==='basic'" color="blue">基础</a-tag>
          <a-tag v-else color="purple">功能</a-tag>
        </template>
        <div style="margin-bottom:8px">
          <a-space>
            <a-tag :color="m.running ? 'green' : 'default'">{{ m.running ? '运行中' : '已停止' }}</a-tag>
            <a-typography-text type="secondary" v-if="m.portsText">{{ m.portsText }}</a-typography-text>
          </a-space>
        </div>
        <div v-if="m.type==='basic'" style="margin-bottom:8px">
          <a-typography-text type="secondary">占用：</a-typography-text>
          <template v-if="m.usedBy && m.usedBy.length">
            <a-space wrap>
              <a-tag v-for="u in m.usedBy" :key="u" color="purple">{{ u }}</a-tag>
            </a-space>
          </template>
          <template v-else>
            <a-tag>未被占用</a-tag>
          </template>
        </div>
        <a-space>
          <a-button v-if="m.type==='feature'" size="small" type="dashed" @click="$emit('action','firstStart', m.name)">真实首次启动</a-button>
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

defineProps<{ items: Array<{ name: string; type: 'basic'|'feature'; running?: boolean; status?: string; portsText?: string; usedBy?: string[] }>; type: 'basic'|'feature' }>();
</script>
