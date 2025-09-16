import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/n8n',
      name: 'n8n',
      component: () => import('../views/ServiceView.vue'),
      props: { service: 'n8n' }
    },
    {
      path: '/dify',
      name: 'dify',
      component: () => import('../views/ServiceView.vue'),
      props: { service: 'dify' }
    },
    {
      path: '/oneapi',
      name: 'oneapi',
      component: () => import('../views/ServiceView.vue'),
      props: { service: 'oneapi' }
    },
    {
      path: '/ragflow',
      name: 'ragflow',
      component: () => import('../views/ServiceView.vue'),
      props: { service: 'ragflow' }
    }
  ],
})

export default router
