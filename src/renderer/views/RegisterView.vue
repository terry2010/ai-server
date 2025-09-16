<template>
  <div class="register-view">
    <div class="register-container">
      <div class="register-header">
        <div class="logo-section">
          <div class="logo-icon"><robot-outlined /></div>
          <h1 class="app-title">AI-Server</h1>
          <p class="app-subtitle">管理平台</p>
        </div>
      </div>

      <a-form :model="registerForm" :rules="registerRules" @finish="handleRegister" class="register-form" layout="vertical">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="registerForm.username" placeholder="请输入用户名" size="large" />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="registerForm.email" placeholder="请输入邮箱地址" size="large" />
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="registerForm.password" placeholder="请输入密码" size="large" />
        </a-form-item>
        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="registerForm.confirmPassword" placeholder="请再次输入密码" size="large" />
        </a-form-item>
        <a-form-item name="agreement">
          <a-checkbox v-model:checked="registerForm.agreement">
            我已阅读并同意 <a href="#" class="agreement-link">用户协议</a> 和 <a href="#" class="agreement-link">隐私政策</a>
          </a-checkbox>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block class="register-button" :loading="loading">注册账户</a-button>
        </a-form-item>
      </a-form>

      <div class="register-footer">
        <p>已有账户？ <a @click="goToLogin" class="login-link">立即登录</a></p>
        <p>© 2025 AI-Server 管理平台. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { RobotOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const router = useRouter()
const loading = ref(false)

const registerForm = reactive({ username: '', email: '', password: '', confirmPassword: '', agreement: false })

const registerRules = {
  username: [ { required: true, message: '请输入用户名', trigger: 'blur' }, { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' } ],
  email: [ { required: true, message: '请输入邮箱地址', trigger: 'blur' }, { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' } ],
  password: [ { required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码长度不能少于6位', trigger: 'blur' } ],
  confirmPassword: [ { required: true, message: '请确认密码', trigger: 'blur' }, { validator: (_: any, value: string) => value !== registerForm.password ? Promise.reject('两次输入的密码不一致') : Promise.resolve(), trigger: 'blur' } ],
  agreement: [ { validator: (_: any, value: boolean) => !value ? Promise.reject('请同意用户协议和隐私政策') : Promise.resolve(), trigger: 'change' } ]
}

const handleRegister = async () => {
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    message.success('注册成功！')
    router.push('/login')
  } catch (error) {
    message.error('注册失败，请重试')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => { router.push('/login') }
</script>

<style scoped>
.register-view { min-height: 100vh; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 50%, #40a9ff 100%); display: flex; align-items: center; justify-content: center; padding: var(--spacing-lg); position: relative; overflow: hidden; }
.register-container { width: 100%; max-width: 480px; padding: var(--spacing-2xl); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); position: relative; z-index: 2; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); transition: all 0.3s; }
.register-container:hover { transform: translateY(-4px); box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12); }
.register-header { text-align: center; margin-bottom: var(--spacing-2xl); }
.logo-section { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-md); }
.logo-icon { width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--text-white); font-size: 28px; box-shadow: var(--shadow-md); }
.app-title { font-size: var(--text-3xl); font-weight: 600; color: var(--text-primary); margin: 0; }
.app-subtitle { font-size: var(--text-base); color: var(--text-secondary); margin: 0; }
.register-form { margin-bottom: var(--spacing-xl); }
.register-form :deep(.ant-form-item-label > label) { color: var(--text-primary); font-weight: 500; }
.register-button { background: var(--primary-color); border: 1px solid var(--primary-color); color: var(--text-white); font-weight: 600; border-radius: var(--radius-md); position: relative; overflow: hidden; box-shadow: 0 0 20px rgba(24, 144, 255, 0.3); }
.register-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s; }
.register-button:hover::before { left: 100%; }
.register-footer { text-align: center; padding-top: var(--spacing-lg); border-top: 1px solid rgba(255, 255, 255, 0.2); }
.login-link { color: var(--primary-color); text-decoration: none; font-weight: 500; cursor: pointer; }
@media (max-width: 480px) { .register-container { padding: var(--spacing-xl); margin: var(--spacing-md); } }
</style>
