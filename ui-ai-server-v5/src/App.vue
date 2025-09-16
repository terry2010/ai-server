<template>
  <div id="app">
    <a-config-provider :theme="themeConfig">
      <router-view />
    </a-config-provider>
  </div>
</template>

<script setup lang="ts">
import { theme } from 'ant-design-vue'

const themeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#1890ff',
    colorWarning: '#fa8c16',
    colorError: '#ff4d4f',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}
</style>