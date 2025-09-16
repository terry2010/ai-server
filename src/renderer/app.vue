<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import TopTabs from './components/TopTabs.vue'
import SideMenu from './components/SideMenu.vue'

const route = useRoute()
const showSide = computed(() => {
  const n = ((route.name as string) || '').toLowerCase()
  const hide = ['n8n','dify','oneapi','ragflow','login','register']
  return !hide.includes(n)
})
</script>

<template>
  <div class="app-layout">
    <TopTabs />
    
    <div class="main-container" :class="{ 'no-side': !showSide }">
      <SideMenu v-if="showSide" />
      
      <div class="content-area" :class="{ 'full': !showSide }">
        <RouterView />
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content-area {
  flex: 1;
  margin-left: 240px;
  overflow-y: auto;
  background: var(--bg-secondary);
  position: relative;
  z-index: 1;
}
.content-area.full { margin-left: 0; }
.main-container.no-side { padding-left: 0; }

/* 响应式设计 */
@media (max-width: 768px) {
  .content-area {
    margin-left: 0;
  }
}
</style>
