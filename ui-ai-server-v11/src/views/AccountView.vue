<template>
  <div class="account-view">
    <div class="account-header">
      <h1 class="account-title">账户设置</h1>
    </div>
    
    <div class="account-content">
      <a-row :gutter="24">
        <a-col :xs="24" :lg="12">
          <a-card title="安全设置" class="security-card glass-effect">
            <a-form layout="vertical" @finish="updateSecurity">
              <a-form-item label="当前密码">
                <a-input-password v-model:value="securityForm.currentPassword" placeholder="请输入当前密码" />
              </a-form-item>
              
              <a-form-item label="新密码">
                <a-input-password v-model:value="securityForm.newPassword" placeholder="请输入新密码" />
              </a-form-item>
              
              <a-form-item label="确认新密码">
                <a-input-password v-model:value="securityForm.confirmPassword" placeholder="请再次输入新密码" />
              </a-form-item>
              
              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="updatingSecurity">
                  <template #icon>
                    <lock-outlined />
                  </template>
                  更新密码
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>
        
        <a-col :xs="24" :lg="12">
          <a-card title="通知设置" class="notification-card glass-effect">
            <div class="notification-options">
              <div class="notification-item">
                <div class="notification-info">
                  <h4>邮件通知</h4>
                  <p>接收系统状态和告警邮件</p>
                </div>
                <a-switch v-model:checked="notificationSettings.email" />
              </div>
              
              <div class="notification-item">
                <div class="notification-info">
                  <h4>短信通知</h4>
                  <p>接收紧急告警短信</p>
                </div>
                <a-switch v-model:checked="notificationSettings.sms" />
              </div>
              
              <div class="notification-item">
                <div class="notification-info">
                  <h4>桌面通知</h4>
                  <p>显示浏览器桌面通知</p>
                </div>
                <a-switch v-model:checked="notificationSettings.desktop" />
              </div>
              
              <div class="notification-item">
                <div class="notification-info">
                  <h4>系统维护通知</h4>
                  <p>接收系统维护和更新通知</p>
                </div>
                <a-switch v-model:checked="notificationSettings.maintenance" />
              </div>
            </div>
            
            <a-button type="primary" @click="saveNotifications" :loading="savingNotifications">
              <template #icon>
                <save-outlined />
              </template>
              保存设置
            </a-button>
          </a-card>
        </a-col>
      </a-row>
      
      <a-row :gutter="24" style="margin-top: 24px;">
        <a-col :span="24">
          <a-card title="登录记录" class="login-history-card glass-effect">
            <a-table 
              :columns="loginColumns" 
              :data-source="loginHistory" 
              :pagination="{ pageSize: 5 }"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="record.status === 'success' ? 'green' : 'red'">
                    {{ record.status === 'success' ? '成功' : '失败' }}
                  </a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  LockOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const securityForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const notificationSettings = ref({
  email: true,
  sms: false,
  desktop: true,
  maintenance: true
})

const updatingSecurity = ref(false)
const savingNotifications = ref(false)

const loginColumns = [
  {
    title: '登录时间',
    dataIndex: 'time',
    key: 'time'
  },
  {
    title: 'IP地址',
    dataIndex: 'ip',
    key: 'ip'
  },
  {
    title: '设备',
    dataIndex: 'device',
    key: 'device'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status'
  }
]

const loginHistory = ref([
  {
    key: '1',
    time: '2025-01-12 14:30:25',
    ip: '192.168.1.100',
    device: 'Chrome 120 / Windows 10',
    status: 'success'
  },
  {
    key: '2',
    time: '2025-01-12 09:15:42',
    ip: '192.168.1.100',
    device: 'Chrome 120 / Windows 10',
    status: 'success'
  },
  {
    key: '3',
    time: '2025-01-11 18:45:12',
    ip: '192.168.1.105',
    device: 'Safari 17 / macOS',
    status: 'failed'
  },
  {
    key: '4',
    time: '2025-01-11 16:20:33',
    ip: '192.168.1.100',
    device: 'Chrome 120 / Windows 10',
    status: 'success'
  }
])

const updateSecurity = async () => {
  if (securityForm.value.newPassword !== securityForm.value.confirmPassword) {
    message.error('两次输入的密码不一致')
    return
  }
  
  updatingSecurity.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    message.success('密码更新成功')
    securityForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    message.error('密码更新失败')
  } finally {
    updatingSecurity.value = false
  }
}

const saveNotifications = async () => {
  savingNotifications.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    message.success('通知设置保存成功')
  } catch (error) {
    message.error('保存失败，请重试')
  } finally {
    savingNotifications.value = false
  }
}
</script>

<style scoped>
.account-view {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.account-header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.account-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.security-card,
.notification-card,
.login-history-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
  height: 100%;
}

.notification-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
}

.notification-info h4 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-primary);
}

.notification-info p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .account-view {
    padding: var(--spacing-lg);
  }
  
  .notification-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
}
</style>
