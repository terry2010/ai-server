<template>
  <div style="width:240px; background:#fff; height: 100%; box-shadow: 0 1px 6px rgba(0,0,0,.06);">
    <div
      v-for="item in items"
      :key="item.key"
      class="menu-item"
      :class="{ active: modelValue === item.key }"
      @click="$emit('update:modelValue', item.key)"
    >
      <span style="margin-right:8px">{{ item.emoji }}</span>{{ item.label }}
    </div>
  </div>
</template>
<script setup lang="ts">
interface MenuItem { key: string; label: string; emoji?: string }

defineProps<{ items: MenuItem[]; modelValue: string }>()

defineEmits<{ (e: 'update:modelValue', key: string): void }>()
</script>
