<template>
  <div class="login-view">
    <div class="login-container glass-effect">
      <div class="login-header">
        <div class="logo-section">
          <div class="logo-icon">
            <robot-outlined />
          </div>
          <h1 class="app-title">AI-Server</h1>
          <p class="app-subtitle">管理平台</p>
        </div>
      </div>
      
      <div class="login-form">
        <a-form
          :model="loginForm"
          :rules="rules"
          @finish="handleLogin"
          layout="vertical"
        >
          <a-form-item name="username" label="用户名">
            <a-input
              v-model:value="loginForm.username"
              placeholder="请输入用户名"
              size="large"
            >
              <template #prefix>
                <user-outlined />
              </template>
            </a-input>
          </a-form-item>
          
          <a-form-item name="password" label="密码">
            <a-input-password
              v-model:value="loginForm.password"
              placeholder="请输入密码"
              size="large"
            >
              <template #prefix>
                <lock-outlined />
              </template>
            </a-input-password>
          </a-form-item>
          
          <a-form-item>
            <div class="login-options">
              <a-checkbox v-model:checked="rememberMe">记住我</a-checkbox>
              <a href="#" class="forgot-password">忘记密码？</a>
            </div>
          </a-form-item>
          
          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              :loading="loading"
              class="login-button"
              block
            >
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
import {
  UserOutlined,
  LockOutlined,
  RobotOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const router = useRouter()

const loginForm = ref({
  username: '',
  password: ''
})

const rememberMe = ref(false)
const loading = ref(false)

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  loading.value = true
  try {
    // 模拟登录请求
    await new Promise(resolve => setTimeout(resolve, 1500))
    message.success('登录成功！')
    router.push('/')
  } catch (error) {
    message.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  background: linear-gradient(135deg, 
    var(--primary-color) 0%, 
    var(--primary-hover) 50%, 
    #40a9ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  position: relative;
  overflow: hidden;
}

.login-view::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    var(--primary-color) 0%, 
    var(--primary-hover) 50%, 
    #40a9ff 100%);
  opacity: 0.95;
}

.login-view::after {
  content: '';
  position: absolute;
  top: -20px;
  right: 10%;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.login-container {
  width: 100%;
  max-width: 480px;
  padding: var(--spacing-2xl);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-container:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-white);
  font-size: 28px;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.app-title {
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  text-shadow: none;
}

.app-subtitle {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

.login-form {
  margin-bottom: var(--spacing-xl);
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-password {
  color: var(--primary-color);
  text-decoration: none;
  font-size: var(--text-sm);
  transition: color var(--transition-base);
}

.forgot-password:hover {
  color: var(--primary-hover);
}

.login-button {
  background: var(--primary-color);
  border: 1px solid var(--primary-color);
  color: var(--text-white);
  font-weight: 600;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(24, 144, 255, 0.3);
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.login-button:hover::before {
  left: 100%;
}

.login-button:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(24, 144, 255, 0.4), 0 0 30px rgba(24, 144, 255, 0.2);
}

.login-footer {
  text-align: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.login-footer p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

.register-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: color var(--transition-base);
}

.register-link:hover {
  color: var(--primary-hover);
}

.login-form :deep(.ant-form-item-label > label) {
  color: var(--text-primary);
  font-weight: 500;
}

.login-form :deep(.ant-input),
.login-form :deep(.ant-input-password),
.login-form :deep(.ant-input-password .ant-input),
.login-form :deep(.ant-input-password-large),
.login-form :deep(.ant-input-affix-wrapper) {
  background: #ffffff !important;
  border: 1px solid var(--border-light) !important;
  color: var(--text-primary) !important;
  box-shadow: none !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  background-clip: padding-box !important;
  -webkit-appearance: none;
  appearance: none;
}

/* 解决密码框里内层 input 背景叠加导致的“环形底色” */
.login-form :deep(.ant-input-affix-wrapper .ant-input) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
}

/* 兼容 Chrome 自动填充导致的内阴影边框 */
.login-form :deep(input:-webkit-autofill),
.login-form :deep(textarea:-webkit-autofill),
.login-form :deep(.ant-input-affix-wrapper input:-webkit-autofill) {
  -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
  -webkit-text-fill-color: var(--text-primary) !important;
  caret-color: var(--text-primary) !important;
  transition: background-color 9999s ease-out 0s !important;
}

/* 去除可能的内置 outline 与内阴影 */
.login-form :deep(.ant-input),
.login-form :deep(.ant-input-password .ant-input) {
  outline: none !important;
  box-shadow: none !important;
  background-clip: padding-box !important;
}

.login-form :deep(.ant-input::placeholder),
.login-form :deep(.ant-input-password input::placeholder) {
  color: var(--text-secondary);
}

.login-form :deep(.ant-input:hover),
.login-form :deep(.ant-input-password:hover),
.login-form :deep(.ant-input-password:hover .ant-input),
.login-form :deep(.ant-input-affix-wrapper:hover) {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(24, 144, 255, 0.25) !important;
  background: #ffffff !important;
}

/* 悬浮/聚焦时也强制内层 input 无边框与阴影，避免出现内圈 */
.login-form :deep(.ant-input-affix-wrapper:hover .ant-input),
.login-form :deep(.ant-input-affix-wrapper-focused .ant-input),
.login-form :deep(.ant-input-affix-wrapper:focus .ant-input) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
}

.login-form :deep(.ant-input:focus),
.login-form :deep(.ant-input-password:focus),
.login-form :deep(.ant-input-focused),
.login-form :deep(.ant-input-password .ant-input:focus),
.login-form :deep(.ant-input-affix-wrapper:focus),
.login-form :deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  background: #ffffff !important;
}

/* 兼容部分环境：当内层 input 获得焦点时，让外层也呈现焦点样式 */
.login-form :deep(.ant-input-affix-wrapper:has(input:focus)) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  background: #ffffff !important;
}

/* 兼容更广：使用 focus-within 触发外层焦点样式 */
.login-form :deep(.ant-input-affix-wrapper:focus-within) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  background: #ffffff !important;
}

/* 避免 wrapper 的内边距显出“第二层边” */
.login-form :deep(.ant-input-affix-wrapper) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  background-clip: padding-box !important;
}

/* 聚焦输入中：内层 input 仍保持透明且无边框/阴影，避免第二层描边 */
.login-form :deep(.ant-input-password .ant-input:focus),
.login-form :deep(.ant-input-affix-wrapper:focus .ant-input),
.login-form :deep(.ant-input-affix-wrapper-focused .ant-input) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
}

.login-form :deep(.ant-checkbox-wrapper) {
  color: var(--text-primary);
}

.login-form :deep(.ant-checkbox-inner) {
  background: rgba(255, 255, 255, 0.8);
  border-color: var(--border-light);
}

.login-form :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-container {
    padding: var(--spacing-xl);
    margin: var(--spacing-md);
  }
}
</style>
