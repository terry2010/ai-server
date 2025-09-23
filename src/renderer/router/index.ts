import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WebAppView from '../views/WebAppView.vue'
import { bvShow, bvHideAll } from '../services/ipc'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/settings/:type',
      redirect: '/settings',
    },
    { path: '/n8n', name: 'n8n', component: WebAppView },
    { path: '/dify', name: 'dify', component: WebAppView },
    { path: '/oneapi', name: 'oneapi', component: WebAppView },
    { path: '/ragflow', name: 'ragflow', component: WebAppView },
    // 新增：在线教程、AI市场
    { path: '/guide', name: 'guide', component: WebAppView },
    { path: '/market', name: 'market', component: WebAppView },
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

// 路由切换后联动 BrowserView 显示/隐藏
router.afterEach((to) => {
  const name = String(to.name || '').toLowerCase()
  const mods = ['n8n','dify','oneapi','ragflow','guide','market']
  if (mods.includes(name)) bvShow(name as any)
  else bvHideAll()
})
