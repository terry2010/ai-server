<template>
  <a-card :title="title || '日志面板'" size="small">
    <template #extra>
      <a-space>
        <a-button size="small" @click="copyAll">复制</a-button>
        <a-button size="small" @click="clearAll">清空</a-button>
        <a-button size="small" @click="$emit('open-logs')">打开日志目录</a-button>
      </a-space>
    </template>
    <div ref="box" style="height:240px; overflow:auto; background:#0b1021; color:#e6e6e6; padding:8px; border-radius:4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:12px; line-height:1.5;">
      <template v-if="(logs && logs.length) || (text && text.length)">
        <div v-for="(line, idx) in rendered" :key="idx" :style="lineStyle(line.type)">
          <span v-if="line.type==='cmd'" style="color:#8ab4f8">$</span>
          <span>{{ line.text }}</span>
        </div>
      </template>
      <template v-else>
        <div style="opacity:.6">暂无日志</div>
      </template>
    </div>
  </a-card>
  
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

type LogType = 'cmd' | 'stdout' | 'stderr' | 'info' | 'error';
interface LogLine { type: LogType; text: string }

const props = defineProps<{ logs?: LogLine[]; text?: string[]; title?: string }>();
const emit = defineEmits<{ (e: 'open-logs'): void }>();

const box = ref<HTMLDivElement | null>(null);

const rendered = computed<LogLine[]>(() => {
  if (props.logs && props.logs.length) return props.logs;
  if (props.text && props.text.length) return props.text.map(t => ({ type: 'stdout', text: t }));
  return [];
});

watch(rendered, async () => {
  await nextTick();
  if (box.value) box.value.scrollTop = box.value.scrollHeight;
}, { deep: true });

function lineStyle(t: LogType) {
  if (t === 'stderr' || t === 'error') return { color: '#ff6b6b' };
  if (t === 'cmd') return { color: '#8ab4f8' };
  if (t === 'info') return { color: '#9cdcfe' };
  return { color: '#e6e6e6' };
}

async function copyAll() {
  const text = rendered.value.map(l => (l.type==='cmd' ? `> ${l.text}` : l.text)).join('\n');
  try { await navigator.clipboard.writeText(text); } catch {}
}

function clearAll() {
  // 由父组件控制数据来源，这里仅提供事件或不做处理
}
</script>
