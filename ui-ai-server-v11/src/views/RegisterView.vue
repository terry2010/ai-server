<template>
  <div class="register-view">
    <div class="register-container">
      <div class="register-header">
        <div class="logo-section">
          <div class="logo-icon">
            <robot-outlined />
          </div>
          <h1 class="app-title">AI-Server</h1>
          <p class="app-subtitle">管理平台</p>
        </div>
      </div>

      <a-form
        :model="registerForm"
        :rules="registerRules"
        @finish="handleRegister"
        class="register-form"
        layout="vertical"
      >
        <a-form-item label="用户名" name="username">
          <a-input 
            v-model:value="registerForm.username" 
            placeholder="请输入用户名"
            size="large"
          />
        </a-form-item>

        <a-form-item label="邮箱" name="email">
          <a-input 
            v-model:value="registerForm.email" 
            placeholder="请输入邮箱地址"
            size="large"
          />
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password 
            v-model:value="registerForm.password" 
            placeholder="请输入密码"
            size="large"
          />
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password 
            v-model:value="registerForm.confirmPassword" 
            placeholder="请再次输入密码"
            size="large"
          />
        </a-form-item>

        <a-form-item name="agreement">
          <a-checkbox v-model:checked="registerForm.agreement">
            我已阅读并同意 <a href="#" class="agreement-link">用户协议</a> 和 <a href="#" class="agreement-link">隐私政策</a>
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button 
            type="primary" 
            html-type="submit" 
            size="large" 
            block 
            class="register-button"
            :loading="loading"
          >
            注册账户
          </a-button>
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

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreement: false
})

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string) => {
        if (value !== registerForm.password) {
          return Promise.reject('两次输入的密码不一致')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  agreement: [
    {
      validator: (rule: any, value: boolean) => {
        if (!value) {
          return Promise.reject('请同意用户协议和隐私政策')
        }
        return Promise.resolve()
      },
      trigger: 'change'
    }
  ]
}

const handleRegister = async () => {
  loading.value = true
  try {
    // 模拟注册请求
    await new Promise(resolve => setTimeout(resolve, 1500))
    message.success('注册成功！')
    router.push('/login')
  } catch (error) {
    message.error('注册失败，请重试')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.register-view {
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

.register-view::before {
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

.register-view::after {
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

.register-container {
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

.register-container:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
}

.register-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.logo-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
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

.register-form {
  margin-bottom: var(--spacing-xl);
}

.register-form :deep(.ant-form-item-label > label) {
  color: var(--text-primary);
  font-weight: 500;
}

.register-form :deep(.ant-input),
.register-form :deep(.ant-input-password),
.register-form :deep(.ant-input-password .ant-input),
.register-form :deep(.ant-input-password-large),
.register-form :deep(.ant-input-affix-wrapper) {
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

/* 避免密码框内层 input 产生叠底色 */
.register-form :deep(.ant-input-affix-wrapper .ant-input) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  background-clip: padding-box !important;
  -webkit-appearance: none;
  appearance: none;
}

.register-form :deep(.ant-input:hover),
.register-form :deep(.ant-input-password:hover),
.register-form :deep(.ant-input-password:hover .ant-input),
.register-form :deep(.ant-input-affix-wrapper:hover) {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(24, 144, 255, 0.25) !important;
  background: #ffffff !important;
}

/* 悬浮/聚焦时也强制内层 input 无边框与阴影，避免出现内圈 */
.register-form :deep(.ant-input-affix-wrapper:hover .ant-input),
.register-form :deep(.ant-input-affix-wrapper-focused .ant-input),
.register-form :deep(.ant-input-affix-wrapper:focus .ant-input) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
}

.register-form :deep(.ant-input::placeholder),
.register-form :deep(.ant-input-password input::placeholder) {
  color: var(--text-secondary);
}

.register-form :deep(.ant-input:focus),
.register-form :deep(.ant-input-password:focus),
.register-form :deep(.ant-input-focused),
.register-form :deep(.ant-input-password .ant-input:focus),
.register-form :deep(.ant-input-affix-wrapper:focus),
.register-form :deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  background: #ffffff !important;
}

/* 当内层 input 获得焦点时，让外层 affix wrapper 也呈现焦点样式 */
.register-form :deep(.ant-input-affix-wrapper:has(input:focus)) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  background: #ffffff !important;
}

/* 更广泛兼容 */
.register-form :deep(.ant-input-affix-wrapper:focus-within) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  background: #ffffff !important;
}

/* 避免 wrapper 的内边距显出第二层边 */
.register-form :deep(.ant-input-affix-wrapper) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  background-clip: padding-box !important;
}

/* 聚焦输入中：内层 input 透明无边框，避免第二层描边 */
.register-form :deep(.ant-input-password .ant-input:focus),
.register-form :deep(.ant-input-affix-wrapper:focus .ant-input),
.register-form :deep(.ant-input-affix-wrapper-focused .ant-input) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
}

.register-form :deep(.ant-checkbox-wrapper) {
  color: var(--text-primary);
}

.register-form :deep(.ant-checkbox-inner) {
  background: rgba(255, 255, 255, 0.8);
  border-color: var(--border-light);
}

.register-form :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.agreement-link {
  color: var(--primary-color);
  text-decoration: none;
  transition: color var(--transition-base);
}

.agreement-link:hover {
  color: var(--primary-hover);
}

.register-button {
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

.register-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.register-button:hover::before {
  left: 100%;
}

.register-button:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(24, 144, 255, 0.4), 0 0 30px rgba(24, 144, 255, 0.2);
}

.register-footer {
  text-align: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.register-footer p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

.login-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: color var(--transition-base);
}

.login-link:hover {
  color: var(--primary-hover);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-container {
    padding: var(--spacing-xl);
    margin: var(--spacing-md);
  }
}
</style>
