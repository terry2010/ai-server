<template>
  <a-button 
    :type="type"
    :loading="loading"
    :danger="danger"
    :size="size"
    :block="block"
    @click="$emit('click')"
    :class="['action-button', buttonClass]"
  >
    <template #icon v-if="$slots.icon">
      <slot name="icon"></slot>
    </template>
    <slot></slot>
  </a-button>
</template>

<script setup lang="ts">
interface Props {
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  loading?: boolean
  danger?: boolean
  size?: 'large' | 'middle' | 'small'
  block?: boolean
  variant?: 'start' | 'stop' | 'save' | 'refresh' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  loading: false,
  danger: false,
  size: 'middle',
  block: false,
  variant: 'default'
})

defineEmits<{
  click: []
}>()

const buttonClass = computed(() => {
  switch (props.variant) {
    case 'start':
      return 'start-btn'
    case 'stop':
      return 'stop-btn'
    case 'save':
      return 'save-btn'
    case 'refresh':
      return 'refresh-btn'
    default:
      return ''
  }
})
</script>

<script lang="ts">
import { computed } from 'vue'
export default {
  name: 'ActionButton'
}
</script>

<style scoped>
.action-button {
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all var(--transition-base);
  font-size: var(--text-sm);
  height: 36px;
  position: relative;
  overflow: hidden;
}

.action-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.action-button:hover::before {
  left: 100%;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.start-btn {
  background: linear-gradient(135deg, var(--success-color) 0%, #40a9ff 100%);
  border: none;
  color: var(--text-white) !important;
  box-shadow: 0 0 20px rgba(0, 122, 255, 0.3);
}

.start-btn:hover {
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4), 0 0 30px rgba(0, 122, 255, 0.2);
}

.stop-btn {
  background: linear-gradient(135deg, var(--error-color) 0%, #ff7875 100%);
  border: none;
  color: var(--text-white) !important;
  box-shadow: 0 0 20px rgba(255, 59, 48, 0.3);
}

.stop-btn:hover {
  box-shadow: 0 8px 25px rgba(255, 59, 48, 0.4), 0 0 30px rgba(255, 59, 48, 0.2);
}

.save-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border: none;
  color: var(--text-white) !important;
  box-shadow: 0 0 20px rgba(24, 144, 255, 0.3);
}

.save-btn:hover {
  box-shadow: 0 8px 25px rgba(24, 144, 255, 0.4), 0 0 30px rgba(24, 144, 255, 0.2);
}

.refresh-btn {
  background: linear-gradient(135deg, var(--warning-color) 0%, #ffa940 100%);
  border: none;
  color: var(--text-white) !important;
  box-shadow: 0 0 20px rgba(250, 173, 20, 0.3);
}

.refresh-btn:hover {
  box-shadow: 0 8px 25px rgba(250, 173, 20, 0.4), 0 0 30px rgba(250, 173, 20, 0.2);
}
</style>
