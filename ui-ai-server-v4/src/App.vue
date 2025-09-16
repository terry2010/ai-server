<template>
  <config-provider :theme="theme">
    <a-app>
      <router-view />
    </a-app>
  </config-provider>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const theme = reactive({
  token: {
    colorPrimary: '#1890ff',
    colorInfo: '#1890ff',
    colorError: '#ff4d4f',
    colorWarning: '#fa8c16',
    borderRadius: 8,
    fontSize: 14
  }
})
</script>
