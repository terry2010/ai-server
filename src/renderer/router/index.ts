import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/renderer/pages/Home.vue';

const routes = [
  { path: '/', component: Home }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
