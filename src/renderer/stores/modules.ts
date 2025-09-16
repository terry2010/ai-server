import { reactive } from 'vue'

export type ModuleDotStatus = 'running' | 'stopped' | 'error' | 'loading'

export const moduleStore = reactive({
  dots: {
    n8n: 'loading' as ModuleDotStatus,
    dify: 'loading' as ModuleDotStatus,
    oneapi: 'loading' as ModuleDotStatus,
    ragflow: 'loading' as ModuleDotStatus,
  },
  total: 0,
  running: 0,
  uptimeText: '',
})
