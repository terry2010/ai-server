<template>
  <div class="login-view">
    <div class="login-container glass-effect">
      <div class="login-header">
        <div class="logo-section">
          <div class="logo-icon"><robot-outlined /></div>
          <h1 class="app-title">AI-Server</h1>
          <p class="app-subtitle">管理平台</p>
        </div>
      </div>
      
      <div class="login-form">
        <a-form :model="loginForm" :rules="rules" @finish="handleLogin" layout="vertical">
          <a-form-item name="username" label="用户名">
            <a-input v-model:value="loginForm.username" placeholder="请输入用户名" size="large">
              <template #prefix><user-outlined /></template>
            </a-input>
          </a-form-item>
          
          <a-form-item name="password" label="密码">
            <a-input-password v-model:value="loginForm.password" placeholder="请输入密码" size="large">
              <template #prefix><lock-outlined /></template>
            </a-input-password>
          </a-form-item>
          
          <a-form-item>
            <div class="login-options">
              <a-checkbox v-model:checked="rememberMe">记住我</a-checkbox>
              <a href="#" class="forgot-password">忘记密码？</a>
            </div>
          </a-form-item>
          
          <a-form-item>
            <a-button type="primary" html-type="submit" size="large" :loading="loading" class="login-button" block>
              登录
            </a-button>
          </a-form-item>
        </a-form>
      </div>
      
      <div class="login-footer">
        <p>还没有账户？ <a @click="goToRegister" class="register-link">立即注册</a></p>
        <p>© 2025 AI-Server 管理平台. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserOutlined, LockOutlined, RobotOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const router = useRouter()
const loginForm = ref({ username: '', password: '' })
const rememberMe = ref(false)
const loading = ref(false)

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  loading.value = true
  try {
    await new Promise(r => setTimeout(r, 1500))
    message.success('登录成功！')
    router.push('/')
  } catch (e) {
    message.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => router.push('/register')
</script>

<style scoped>
.login-view { min-height: 100vh; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 50%, #40a9ff 100%); display: flex; align-items: center; justify-content: center; padding: var(--spacing-lg); position: relative; overflow: hidden; }
.login-container { width: 100%; max-width: 480px; padding: var(--spacing-2xl); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0,0,0,.08); position: relative; z-index: 2; background: rgba(255,255,255,.95); backdrop-filter: blur(20px); transition: all .3s ease; }
.login-container:hover { transform: translateY(-4px); box-shadow: 0 12px 48px rgba(0,0,0,.12); }
.login-header { text-align: center; margin-bottom: var(--spacing-2xl); }
.logo-section { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); }
.logo-icon { width: 60px; height: 60px; background: rgba(255,255,255,.2); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--text-white); font-size: 28px; box-shadow: var(--shadow-md); backdrop-filter: blur(10px); }
.app-title { font-size: var(--text-3xl); font-weight: 600; color: var(--text-primary); margin: 0; }
.app-subtitle { font-size: var(--text-base); color: var(--text-secondary); margin: 0; }
.login-form { margin-bottom: var(--spacing-xl); }
.login-options { display: flex; justify-content: space-between; align-items: center; }
.forgot-password { color: var(--primary-color); text-decoration: none; font-size: var(--text-sm); }
.login-button { background: var(--primary-color); border: 1px solid var(--primary-color); color: var(--text-white); font-weight: 600; border-radius: var(--radius-md); position: relative; overflow: hidden; box-shadow: 0 0 20px rgba(24,144,255,.3); }
.login-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent); transition: left .5s; }
.login-button:hover::before { left: 100%; }
.login-footer { text-align: center; padding-top: var(--spacing-lg); border-top: 1px solid rgba(255,255,255,.2); }
.register-link { color: var(--primary-color); text-decoration: none; font-weight: 500; cursor: pointer; }
@media (max-width: 480px) { .login-container { padding: var(--spacing-xl); margin: var(--spacing-md); } }
</style>
