<template>
  <div class="gradient-primary" style="height:120px; border-radius: 12px; padding: 24px; color:#fff; position: relative; overflow:hidden;">
    <div style="position:absolute; right:-40px; top:-40px; width:200px; height:200px; background:rgba(255,255,255,.12); filter: blur(4px); transform: rotate(25deg);"></div>
    <div style="display:flex; align-items:center; justify-content: space-between; position: relative; z-index: 1;">
      <div>
        <div style="font-size:24px; font-weight:600;">欢迎使用 AI-Server 控制台</div>
        <div style="opacity:.9; margin-top:6px;">统一管理 n8n / Dify / OneAPI / RagFlow，实时监控与一键运维</div>
        <div class="flex" style="gap: 12px; margin-top: 14px;">
          <a-button type="primary">快速启动全部</a-button>
          <a-button>系统设置</a-button>
        </div>
      </div>
      <div class="flex" style="gap: 24px;">
        <div class="center" style="flex-direction:column; min-width:120px">
          <div class="status-indicator running"></div>
          <div style="margin-top:8px;">运行中服务</div>
          <div style="font-weight:600; font-size:20px;">3</div>
        </div>
        <div class="center" style="flex-direction:column; min-width:120px">
          <div class="status-indicator" style="background:#8c8c8c;"></div>
          <div style="margin-top:8px;">停止服务</div>
          <div style="font-weight:600; font-size:20px;">1</div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
</script>
