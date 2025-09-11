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
      path: '/settings/:type',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/n8n',
      name: 'n8n',
      component: HomeView,
    },
    {
      path: '/dify',
      name: 'dify',
      component: HomeView,
    },
    {
      path: '/oneapi',
      name: 'oneapi',
      component: HomeView,
    },
    {
      path: '/ragflow',
      name: 'ragflow',
      component: HomeView,
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('../views/LogsView.vue'),
    },
    {
      path: '/monitoring',
      name: 'monitoring',
      component: () => import('../views/MonitoringView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('../views/AccountView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
  ],
})

export default router
