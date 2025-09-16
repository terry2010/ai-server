<script setup lang="ts">
import { RouterView } from 'vue-router'
import TopTabs from './components/TopTabs.vue'
import SideMenu from './components/SideMenu.vue'
</script>

<template>
  <div class="app-layout">
    <TopTabs />
    
    <div class="main-container">
      <SideMenu />
      
      <div class="content-area">
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

/* 响应式设计 */
@media (max-width: 768px) {
  .content-area {
    margin-left: 0;
  }
}
</style>
