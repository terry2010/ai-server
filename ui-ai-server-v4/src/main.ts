import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd, { App as AntApp, ConfigProvider } from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './assets/styles/globals.css'
import './assets/styles/theme.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Antd)
app.component('AntApp', AntApp)
app.component('ConfigProvider', ConfigProvider)
app.mount('#app')
