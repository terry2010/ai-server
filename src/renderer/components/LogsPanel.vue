<template>
  <a-card title="日志面板">
    <a-space direction="vertical" style="width:100%">
      <a-alert type="info" message="占位：主进程应返回日志目录路径，点击可打开文件夹" />
      <a-button @click="$emit('open-logs')">打开日志目录</a-button>
    </a-space>
  </a-card>
</template>

<script lang="ts" setup>
// 占位组件：由父级通过 IPC 请求主进程打开日志目录
</script>
