<template>
  <a-carousel autoplay :dot-position="'bottom'" class="carousel-banner">
    <div v-for="(item, idx) in items" :key="idx" class="banner-slide">
      <div class="banner-bg"></div>
      <div class="banner-content">
        <h2 class="title">{{ item.title }}</h2>
        <p class="subtitle">{{ item.subtitle }}</p>
      </div>
    </div>
  </a-carousel>
</template>

<script setup lang="ts">
const items = [
  { title: '欢迎使用 AI-Server 管理平台', subtitle: '统一管理和监控您的 AI 服务模块' },
  { title: '一键启停', subtitle: '按依赖顺序安全地启动/停止各模块' },
  { title: '系统日志与监控', subtitle: '集中查看容器日志与性能状态' }
]
</script>

<style scoped>
.carousel-banner { height: 160px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg); }
.banner-slide { height: 160px; position: relative; display: flex; align-items: center; }
.banner-bg { position: absolute; inset: 0; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 50%, #40a9ff 100%); opacity: .95; }
.banner-content { position: relative; z-index: 1; color: var(--text-white); padding: 0 var(--spacing-xl); }
.title { font-size: var(--text-2xl); margin: 0 0 6px 0; font-weight: 600; }
.subtitle { margin: 0; opacity: .9; }
</style>
