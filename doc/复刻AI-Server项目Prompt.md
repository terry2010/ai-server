# 复刻AI-Server项目的完整Prompt指南

本指南旨在为AI提供完整详细的指令，以复刻AI-Server项目，确保功能和界面完全一致。AI-Server是一个基于Electron的桌面端集成平台，将多个主流AI工具（Dify、n8n、RagFlow、OneAPI）整合到统一的本地化管理界面中。

## 项目概述

### 核心目标
创建一个桌面端AI工具管理平台，提供一站式AI应用开发与编排能力，将以下工具集成到统一界面中：
- Dify：AI应用构建平台
- n8n：工作流自动化平台
- RagFlow：RAG引擎（基于文档的智能问答系统）
- OneAPI：API聚合网关

### 技术架构
- **主框架**：Electron（跨平台桌面应用）
- **前端**：Vue 3 + Vite + TypeScript
- **UI库**：Ant Design Vue
- **状态管理**：Pinia
- **主进程**：TypeScript + Node.js
- **容器编排**：Docker Compose
- **通信机制**：IPC（进程间通信）

## 项目结构要求

```
ai-server/
├── src/
│   ├── main/                 # Electron主进程
│   │   ├── app.ts           # 主进程入口
│   │   ├── preload.ts       # 预加载脚本
│   │   ├── config/          # 配置管理
│   │   ├── docker/          # Docker控制逻辑
│   │   └── ipc/             # IPC事件处理器
│   ├── renderer/            # Vue前端渲染进程
│   │   ├── App.vue          # 根组件
│   │   ├── main.ts          # 前端入口
│   │   ├── components/      # 通用组件
│   │   ├── views/           # 页面组件
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia状态管理
│   │   └── services/        # API服务封装
│   └── shared/              # 共享代码
│       └── ipc-contract.ts  # IPC接口契约
├── orchestration/           # 服务编排配置
│   ├── infra/               # 基础设施配置
│   └── modules/             # 各模块配置
├── scripts/                 # 自动化脚本
├── doc/                     # 项目文档
├── ui-ai-server-v11/        # 独立前端原型
└── package.json             # 项目配置
```

## 核心功能模块

### 1. 环境检测模块
- 检测Docker/Compose安装与运行状态
- 检测Node.js/npm版本
- 检测PowerShell版本（Windows）
- 端口占用检测

### 2. 模块管理模块
- **基础服务模块**：
  - MySQL/Postgres数据库
  - Redis缓存
  - MinIO对象存储
  - Elasticsearch/OpenSearch检索引擎
- **功能模块**：
  - Dify（AI应用开发平台）
  - n8n（工作流自动化）
  - RagFlow（RAG问答系统）
  - OneAPI（API网关）

### 3. 容器编排模块
- Docker Compose模板管理
- 端口映射配置
- 依赖关系处理
- 启停控制逻辑

### 4. 配置管理模块
- 模块配置持久化
- 用户设置存储
- 环境变量管理

### 5. 日志监控模块
- 实时日志流
- 状态监控
- 错误处理

## IPC通信接口规范

### 环境相关
- `ai/env/diagnose`：环境诊断
- `ai/docker/checkDocker`：检查Docker状态
- `ai/docker/startDocker`：启动Docker

### 模块相关
- `ai/modules/list`：列出所有模块
- `ai/module/start`：启动模块
- `ai/module/stop`：停止模块
- `ai/module/status`：获取模块状态
- `ai/module/clear`：清除模块数据

### 配置相关
- `ai/config/get`：获取配置
- `ai/config/set`：设置配置

### 窗口相关
- `ai/window/minimize`：最小化窗口
- `ai/window/maximize`：最大化窗口
- `ai/window/close`：关闭窗口

## UI界面设计规范

### 整体布局
1. **顶部导航栏**：
   - 标题"AI Server"
   - 标签页：开始、Dify、n8n、RAGFlow、OneAPI、系统设置

2. **侧边栏菜单**（部分页面显示）：
   - 模块导航
   - 设置入口

3. **主内容区域**：
   - 首页：通栏广告图 + 模块状态卡片
   - 各模块页面：详细配置和控制
   - 设置页面：系统配置选项

### 首页设计
- 通栏广告图（Banner）
- 模块状态卡片网格布局：
  - 每个卡片显示模块名称、状态、端口信息
  - 操作按钮（启动/停止/设置）
  - 状态指示器（运行中/已停止/错误）

### 模块页面设计
- 模块基本信息
- 状态显示（运行状态、端口、资源使用）
- 控制按钮（启动、停止、重启）
- 配置表单（端口、主机地址等）
- 日志显示区域

### 系统设置页面
- 随系统启动选项
- 自动启动模块选项
- 界面风格选择（深色/浅色/自动）
- 高级配置选项

## 技术实现要求

### Electron主进程
1. 使用TypeScript编写
2. 实现IPC处理器
3. Docker容器控制逻辑
4. 配置文件管理
5. 窗口管理

### Vue前端
1. 使用Vue 3 Composition API
2. 路由管理（Vue Router）
3. 状态管理（Pinia）
4. 组件化设计
5. 响应式布局

### 样式规范
1. 使用CSS变量管理主题
2. 响应式设计适配不同屏幕尺寸
3. 统一的组件样式
4. 现代化科技风格设计

### Docker编排
1. 每个模块独立的docker-compose配置
2. 统一网络和卷管理
3. 端口映射配置
4. 健康检查机制

## 开发环境要求

### 必需工具
- Node.js >= 18
- npm 或 yarn
- Docker Desktop
- PowerShell（Windows）或 Bash（macOS/Linux）
- Git

### 依赖版本
```json
{
  "dependencies": {
    "vue": "^3.5.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.7",
    "ant-design-vue": "^4.0.0",
    "js-yaml": "^4.1.0",
    "dockerode": "^4.0.8"
  },
  "devDependencies": {
    "electron": "^31.7.7",
    "vite": "^5.0.0",
    "tsup": "^8.0.1",
    "typescript": "^5.4.0",
    "electron-builder": "^24.9.1"
  }
}
```

## 构建与部署

### 开发命令
```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev:all

# 构建主进程
npm run build:main

# 构建前端
npm run build:renderer

# 完整构建
npm run build

# 打包发布
npm run dist
```

### 打包配置
- Windows：NSIS安装包
- macOS：DMG镜像
- 输出目录：release/

## 详细实现步骤

### 第一阶段：环境搭建
1. 创建项目结构
2. 配置package.json
3. 设置TypeScript环境
4. 配置Vite构建
5. 实现基础Electron应用

### 第二阶段：主进程开发
1. 实现app.ts主入口
2. 创建preload.ts预加载脚本
3. 实现IPC通信处理器
4. 开发Docker控制逻辑
5. 实现配置管理

### 第三阶段：前端界面开发
1. 创建App.vue根组件
2. 实现路由配置
3. 开发通用组件（TopTabs、SideMenu等）
4. 实现各页面组件
5. 集成状态管理

### 第四阶段：功能完善
1. 实现模块启停控制
2. 开发日志监控功能
3. 完善配置管理
4. 实现错误处理机制
5. 添加状态同步机制

### 第五阶段：测试与优化
1. 功能测试
2. 跨平台兼容性测试
3. 性能优化
4. 用户体验优化
5. 文档完善

## 关键实现细节

### IPC通信实现
- 使用contextBridge安全暴露API
- 统一响应格式：{ success, code, message, data }
- 错误码规范定义

### Docker控制逻辑
- 模板化docker-compose配置
- 端口冲突检测与处理
- 依赖关系管理
- 健康检查机制

### 配置管理
- 模块配置持久化
- 用户设置存储
- 环境变量注入

### 状态同步
- 实时状态更新
- 缓存机制
- 事件驱动更新

## 质量保证要求

### 代码规范
- TypeScript严格模式
- ESLint代码检查
- 统一代码风格

### 性能要求
- 启动时间优化
- 内存使用控制
- 响应速度优化

### 安全要求
- 主进程与渲染进程隔离
- 权限控制
- 数据安全

### 兼容性要求
- Windows 10/11支持
- macOS支持
- 不同屏幕分辨率适配

## 交付物清单

1. 完整的Electron桌面应用源代码
2. 所有模块的Docker编排配置
3. 完整的前端界面实现
4. IPC通信接口实现
5. 配置管理模块
6. 自动化脚本
7. 项目文档
8. 构建与部署说明
9. 测试用例
10. 打包发布的安装程序

## 验收标准

### 功能验收
- 所有模块可正常启停
- 配置可正确保存和加载
- 日志可实时查看
- 状态可正确同步
- 错误可正确处理

### 性能验收
- 启动时间不超过10秒
- 内存占用合理
- 响应延迟小于100ms

### 兼容性验收
- Windows 10/11正常运行
- macOS正常运行
- 不同分辨率下界面正常显示

### 用户体验验收
- 界面美观现代
- 操作流畅
- 提示信息清晰
- 错误处理友好

本Prompt指南为完整复刻AI-Server项目提供了详细的实现指导，确保AI能够生成功能和界面完全一致的应用程序。