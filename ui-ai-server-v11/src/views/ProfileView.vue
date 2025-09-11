<template>
  <div class="profile-view">
    <div class="profile-header">
      <h1 class="profile-title">个人资料</h1>
    </div>
    
    <div class="profile-content">
      <a-row :gutter="24">
        <a-col :xs="24" :lg="8">
          <a-card class="avatar-card glass-effect">
            <div class="avatar-section">
              <a-avatar :size="120" :src="userProfile.avatar">
                {{ userProfile.name.charAt(0) }}
              </a-avatar>
              <a-button type="primary" class="upload-btn" @click="uploadAvatar">
                <template #icon>
                  <camera-outlined />
                </template>
                更换头像
              </a-button>
            </div>
          </a-card>
        </a-col>
        
        <a-col :xs="24" :lg="16">
          <a-card class="info-card glass-effect">
            <a-form
              :model="userProfile"
              :rules="rules"
              layout="vertical"
              @finish="saveProfile"
            >
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item name="name" label="姓名">
                    <a-input v-model:value="userProfile.name" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item name="email" label="邮箱">
                    <a-input v-model:value="userProfile.email" />
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item name="phone" label="手机号">
                    <a-input v-model:value="userProfile.phone" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item name="department" label="部门">
                    <a-input v-model:value="userProfile.department" />
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-form-item name="bio" label="个人简介">
                <a-textarea v-model:value="userProfile.bio" :rows="4" />
              </a-form-item>
              
              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="saving">
                  <template #icon>
                    <save-outlined />
                  </template>
                  保存资料
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  CameraOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const userProfile = ref({
  name: '管理员',
  email: 'admin@ai-server.com',
  phone: '138****8888',
  department: '技术部',
  bio: '负责AI-Server管理平台的运维和管理工作',
  avatar: ''
})

const saving = ref(false)

const rules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const uploadAvatar = () => {
  message.info('头像上传功能开发中...')
}

const saveProfile = async () => {
  saving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    message.success('个人资料保存成功')
  } catch (error) {
    message.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-view {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.profile-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.avatar-card,
.info-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
  height: 100%;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.upload-btn {
  border-radius: var(--radius-md);
  font-weight: 500;
}

@media (max-width: 768px) {
  .profile-view {
    padding: var(--spacing-lg);
  }
}
</style>
