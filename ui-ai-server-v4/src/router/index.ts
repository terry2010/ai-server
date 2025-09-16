import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Home from '../pages/Home.vue'
import ServicePage from '../pages/ServicePage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/n8n', name: 'n8n', component: ServicePage, props: { service: 'n8n' } },
  { path: '/dify', name: 'dify', component: ServicePage, props: { service: 'Dify' } },
  { path: '/oneapi', name: 'oneapi', component: ServicePage, props: { service: 'OneAPI' } },
  { path: '/ragflow', name: 'ragflow', component: ServicePage, props: { service: 'RagFlow' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
