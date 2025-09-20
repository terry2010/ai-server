import { reactive } from 'vue'

export type ServiceType = 'n8n' | 'dify' | 'oneapi' | 'ragflow'
export type PendingKind = 'starting' | 'stopping' | null

export const opsStore = reactive<{ pending: Record<ServiceType, PendingKind> }>({
  pending: { n8n: null, dify: null, oneapi: null, ragflow: null }
})

export function setPending(name: ServiceType, kind: Exclude<PendingKind, null>) {
  opsStore.pending[name] = kind
}

export function clearPending(name: ServiceType) {
  opsStore.pending[name] = null
}

export function clearAllPending() {
  opsStore.pending.n8n = null
  opsStore.pending.dify = null
  opsStore.pending.oneapi = null
  opsStore.pending.ragflow = null
}
