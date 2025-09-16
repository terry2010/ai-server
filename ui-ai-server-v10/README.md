# AI Server Management Platform v10

一个基于 Vue 3 + Ant Design Vue 的 AI 服务管理平台，具有现代化的 macOS 原生软件风格界面。

## 功能特性

- 🚀 **现代化界面设计**: 采用 macOS 原生软件风格，具有科技感和专业感
- 🎨 **美观的视觉效果**: 半透明背景、阴影效果、渐变色彩
- 📱 **响应式布局**: 支持桌面端、平板端和移动端
- ⚡ **实时状态监控**: 服务状态实时更新和监控
- 🔧 **服务管理**: 支持启动、停止、配置各种 AI 服务
- 📊 **性能指标**: CPU、内存使用率可视化展示

## 支持的服务

- **n8n**: 工作流自动化平台
- **Dify**: AI 应用开发平台  
- **OneAPI**: API 网关服务
- **RagFlow**: RAG 知识库服务

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI 组件库**: Ant Design Vue 4.0
- **状态管理**: Pinia
- **路由管理**: Vue Router 4
- **构建工具**: Vite
- **代码规范**: ESLint + Prettier

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
ui-ai-server-v10/
├── src/
│   ├── views/
│   │   └── HomeView.vue      # 主页面组件
│   ├── router/
│   │   └── index.ts          # 路由配置
│   ├── App.vue               # 根组件
│   └── main.ts               # 应用入口
├── public/                   # 静态资源
├── package.json              # 项目配置
└── vite.config.ts           # Vite 配置
```

## 设计特色

### 色彩方案
- **主色调**: 蓝色系渐变 (#1890ff - #69c0ff)
- **背景**: 渐变色背景，营造科技感
- **卡片**: 半透明白色背景，毛玻璃效果
- **状态指示**: 动态色彩反馈

### 交互效果
- **悬停动画**: 卡片提升效果
- **状态动画**: 呼吸灯、闪烁等动态效果
- **平滑过渡**: 所有交互都有流畅的过渡动画
- **响应式**: 适配不同屏幕尺寸

### macOS 风格元素
- **毛玻璃效果**: backdrop-filter 实现半透明背景
- **圆角设计**: 统一的圆角风格
- **阴影层次**: 多层次阴影营造深度感
- **字体**: 使用系统字体栈，保持原生感

## 开发说明

项目采用 Vue 3 Composition API 开发，使用 TypeScript 提供类型安全。所有组件都经过精心设计，确保在不同设备上都有良好的用户体验。

## 浏览器支持

- Chrome >= 88
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 许可证

MIT License