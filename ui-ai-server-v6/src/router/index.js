import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: {
        title: '首页'
      }
    },
    {
      path: '/n8n',
      name: 'n8n',
      component: () => import('../views/N8nView.vue'),
      meta: {
        title: 'n8n工作流'
      }
    },
    {
      path: '/dify',
      name: 'dify',
      component: () => import('../views/DifyView.vue'),
      meta: {
        title: 'Dify对话AI'
      }
    },
    {
      path: '/oneapi',
      name: 'oneapi',
      component: () => import('../views/OneApiView.vue'),
      meta: {
        title: 'OneAPI接口'
      }
    },
    {
      path: '/ragflow',
      name: 'ragflow',
      component: () => import('../views/RagFlowView.vue'),
      meta: {
        title: 'RagFlow知识库'
      }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: {
        title: '系统设置'
      }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - AI-Server管理平台`
  }
  next()
})

export default router