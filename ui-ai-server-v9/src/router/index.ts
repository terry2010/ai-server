import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const Home = () => import('@/pages/Home.vue')
const N8n = () => import('@/pages/N8n.vue')
const Dify = () => import('@/pages/Dify.vue')
const OneAPI = () => import('@/pages/OneAPI.vue')
const RagFlow = () => import('@/pages/RagFlow.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/n8n', name: 'n8n', component: N8n },
  { path: '/dify', name: 'dify', component: Dify },
  { path: '/oneapi', name: 'oneapi', component: OneAPI },
  { path: '/ragflow', name: 'ragflow', component: RagFlow },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
