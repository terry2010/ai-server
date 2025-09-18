# 复刻 AI-Server（Electron + Vue3 + Docker 管理）生成式开发 Prompt

本 Prompt 用于指导一个具备代码生成能力的 AI 从零完整复刻当前 AI-Server 桌面应用项目，功能与界面需保持一致。请严格按照本说明完成项目生成、联调与打包。

---
## 1. 项目目标
- 构建一款基于 Electron 的桌面应用，作为本地 AI 服务编排与管理平台。
- 前端采用 Vue3 + Ant Design Vue，提供首页概览、顶部标签切换、模块状态可视化、日志与监控入口等。
- 集成 Docker 管理功能：一键启动/停止模块、依赖服务自动处理、健康检查、端口冲突校验、事件驱动的实时状态同步、实时/聚合日志查看。
- 提供开发与打包脚本，支持 Windows 环境（Win10）本地开发与打包分发（NSIS）。

---

## 2. 技术栈与运行环境
- Electron 主进程（TypeScript + tsup 打包 CommonJS 到 `out/main/`）
- 渲染进程：Vue 3、Vue Router、Pinia、Ant Design Vue、Vite
- Node.js（建议 18+）、npm
- Docker Desktop（Windows）
- 其他：`dockerode`（Docker 事件订阅）、`js-yaml`（配置/模板处理可用）

约束：
- 包管理脚本需包含：并发开发（主进程 watch、Vite、Electron 启动），构建主/渲染产物，Windows 打包（electron-builder）。
- Electron 主进程构建产物为 CJS：`out/main/app.cjs`，`package.json.main` 指向该文件。
- 需要 preload 脚本并启用 `contextIsolation: true`、`nodeIntegration: false`。

---

## 3. 目录结构（目标）
请生成与下述一致或等效的目录结构与关键文件：
- `src/main/`
  - `app.ts`（Electron 主进程入口）
  - `preload.ts`（预加载，暴露安全 IPC 方法）
  - `ipc/`（若干 IPC 处理器：`env.ts`、`docker.ts`、`modules.ts`、`config.ts`、`window.ts`）
  - `docker/`（Docker 相关逻辑）
    - `index.ts`（模块启动/停止/状态/日志的核心逻辑与聚合）
    - `events.ts`（订阅 Docker 事件并批处理派发模块状态）
    - `utils.ts`、`compose-runner.ts`、`health.ts`、`naming.ts`、`resources.ts`、`template.ts`、`ports.ts`、`log-stream.ts`（按需实现被 `index.ts` 引用的方法）
  - `config/`（注册表与全局配置）
    - `store.ts`（`loadRegistry`、`getGlobalConfig`、`resetRegistryCache`）
- `src/shared/ipc-contract.ts`（IPC 常量与类型：`IPC.ModuleStatusEvent`、`IPC.ModuleLogEvent`、`ModuleName`、`ModuleStatus`、`ModuleType`、`IpcResponse`）
- `src/renderer/`
  - `main.ts`（App 启动与插件注册）
  - `App.vue`
  - `router/index.ts`（路由定义，见下文）
  - `stores/`（`modules.ts`，存放模块状态点 `dots`、运行统计等）
  - `services/ipc.ts`（封装渲染层到主进程的 IPC 调用：`dockerCheck`、`dockerStart`、`listModules`、`startModule`、`windowMinimize/Maximize/Close` 等）
  - `components/TopTabs.vue`、`components/SideMenu.vue`、`components/WelcomeBanner.vue`、`components/ServiceCard.vue`、`components/OverviewCard.vue`
  - `views/`（`HomeView.vue`、`WebAppView.vue`、`SettingsView.vue`、`LogsView.vue`、`MonitoringView.vue`、`LoginView.vue`、`ProfileView.vue`、`AccountView.vue`、`RegisterView.vue`）
- `orchestration/infra/docker-compose.infra.yml`（基础服务 compose 文件，供依赖模块使用）
- `package.json`、`vite.config.ts`、`tsconfig.json`、`build/`（图标）
- `release/`（打包输出）

说明：辅助文件若在本 Prompt 中未完全展开，可按被调用方接口自行补全，但功能与对外契约必须与本 Prompt 一致。

---

## 4. Electron 主进程要求（`src/main/app.ts`）
- 运行环境自检：非 Electron 运行时报错并退出。
- 使用 CommonJS `require('electron')` 以规避 ESM/CJS 互操作问题，记录关键版本信息与 `electron` 键列表，便于调试。
- 创建主窗口：`1200x800`，`webPreferences` 指定 `preload.cjs`、`contextIsolation: true`、`nodeIntegration: false`、`webviewTag: true`。
- 开发态加载 `http://localhost:5174`，并 `openDevTools({ mode: 'detach' })`；生产态加载 `dist/renderer/index.html`。
- `app.whenReady()` 后加载 IPC 处理器：`./ipc/env`、`./ipc/docker`、`./ipc/modules`、`./ipc/config`、`./ipc/window`。
- 尝试启动 Docker 事件监听：`require('./docker/events').tryStart()`，并在 `window-all-closed` 时调用 `stopWatch()` 做清理。
- 引用并调用 `resetRegistryCache()`，确保配置可热加载。

---

## 5. Docker 管理核心（`src/main/docker/`）
注意（术语澄清，统一约束）：本项目严格“仅使用 dockerode”，不得调用 docker/docker-compose CLI。下文若出现“compose up/stop/down”“docker ps/inspect/logs”等表述，均指以 dockerode 等价 API 实现的编排行为，并非实际执行 CLI。`compose-runner` 等命名仅为“逻辑分层”的占位概念，生成代码时需改为通过 dockerode 实现同等能力。
在 `index.ts` 中实现以下行为（函数命名一致）：
- `listModules(): { name: string; type: ModuleType }[]` 从注册表返回模块清单。
- `getModuleLogs(name?: ModuleName, tail=200)` 聚合读取模块相关容器最近日志，返回带时间戳、模块/服务、级别推断的条目（按时间倒序）。
- `firstStartModule(name)`：前置检查 Docker 运行与 compose 可用，确保外部资源（网络、卷等）存在后，走 `startModule` 正常流程。
- `startModule(name)`：
  - 依赖环检测；
  - 端口占用校验（考虑运行中与已存在未运行容器）；
  - 先启动依赖（infra compose 或 `docker start` 已存在未运行容器），并按注册表的 `healthCheck` 等待就绪；
  - 启动自身（feature 模块使用动态生成的 compose，basic 模块走 infra compose，或直接 `docker start` 已存在容器）；
  - 最终等待自身健康检查通过；
  - 返回结构化结果（`IpcResponse`）。
- `stopModule(name)`：
  - feature 模块：compose 停止（失败兜底逐容器 `docker stop`）；
  - basic 模块：若被任一运行中的 feature 依赖则阻止停止；通过检查后使用 infra compose 停止；
  - 可选“依赖感知回收”：当全局配置 `autoStopUnusedDeps=true` 时，尝试停止未被占用的基础服务。
- `getModuleStatus(name)`：
  - 若 Docker 未运行，直接返回 `running=false, status='stopped'`；
  - 通过 `docker ps` 快照与短期缓存收集端口与容器状态；
  - 聚合状态：全 running 则 `running`/`running`；全为停止态则 `stopped`；否则 `error`；
  - 若为基础模块，返回 `usedBy`（当前被哪些运行中的 feature 依赖）。
- 提供流式版本 `startModuleStream`、`stopModuleStream`、`firstStartModuleStream`，通过 `spawnStream/composeUpStream/composeStopStream` 将实时日志发送到渲染端，并在关键步骤 `emitStdout(sender, streamId, msg)` 打点。
- 提供内部工具：
  - `listRunningContainerNames()`、`listAllContainerNames()`；
  - `getDockerPsSnapshot()` 与 `containerStateCache`（1 秒 TTL）；
  - 依赖 `ensureExternalResources/ensureExternalInfraResources`、`materializeFeatureCompose`、`servicesForModule/serviceNameFor/containerNameFor`、`checkPortsConflict`、`waitHealth` 等方法。

在 `events.ts` 中实现：
- 使用 `dockerode` 订阅 Docker 事件，仅关心 `container` 类型且动作位于集合 `{start, stop, die, restart, health_status, destroy}`。
- 事件到来时按容器名反查所属模块，加入批处理队列；每秒批处理一轮，串行调用 `getModuleStatus(mod)` 获取状态，并广播到所有窗口：`IPC.ModuleStatusEvent`。
- 提供 `tryStart()`（启动事件流与批处理定时器），`stopWatch()`（清理重试、流、去抖、批处理等）。

---

## 6. 渲染端要求

### 6.1 入口与插件（`src/renderer/main.ts`）
- 引入 `./assets/main.css` 与 `ant-design-vue/dist/reset.css`。
- `createApp(App).use(createPinia()).use(router).use(Antd).mount('#app')`。
- 引入全局样式文件 `./assets/styles/variables.css` 和 `./assets/styles/global.css`。

### 6.2 路由（`src/renderer/router/index.ts`）
- 路由需包含：
  - `/` → `home`
  - `/settings/:type` → `settings`（按需分组设置视图）
  - `/n8n` → `n8n`（`WebAppView`）
  - `/dify` → `dify`（`WebAppView`）
  - `/oneapi` → `oneapi`（`WebAppView`）
  - `/ragflow` → `ragflow`（`WebAppView`）
  - `/logs` → `logs`（日志查看页面）
  - `/monitoring` → `monitoring`（性能监控页面）
  - `/login` → `login`（登录页面）
  - `/register` → `register`（注册页面）
  - `/profile` → `profile`（个人资料页面）
  - `/account` → `account`（账户设置页面）
  - 侧边栏菜单对应的路由路径

### 6.3 顶部标签组件（`components/TopTabs.vue`）
- 左侧显示应用Logo和名称，中间为标签栏：`home`、`n8n`、`dify`、`oneapi`、`ragflow`。
- 每个服务标签旁显示一个小圆点，反映模块状态：`running`（绿色带脉动）、`stopped`（灰色）、`error`（红色闪烁）。
- 右侧显示用户信息和下拉菜单，包含：个人资料、账户设置、退出登录（跳转到对应路由）。
- 使用Ant Design Vue的Tabs组件实现标签页功能。
- 选项卡切换时根据 key 路由跳转；同时监听 `route.name` 同步高亮。
- 通过渲染端 `window.api.on(IPC.ModuleStatusEvent, handler)` 实时更新状态点（从 `moduleStore.dots` 读取/写入）。

样式要点：
- 半透明白底、阴影与毛玻璃效果；
- 活动标签为主色渐变背景，文字白色；
- 状态指示器需要丰富的动画效果（绿脉动/红闪烁）；
- 用户信息区域包含头像、用户名和下拉箭头；
- 下拉菜单使用Ant Design Vue的Dropdown组件实现；
- 整体布局需要响应式设计，适配不同屏幕尺寸。

### 6.4 侧边栏菜单组件（`components/SideMenu.vue`）
- 实现垂直侧边栏菜单，固定在页面左侧。
- 菜单项包括：仪表盘、系统设置、各模块设置（n8n、Dify、OneAPI、RagFlow）、系统日志、性能监控。
- 使用Ant Design Vue的Menu组件实现。
- 菜单项包含图标和文字标签。
- 底部显示系统信息，包括版本号和运行状态。

样式要点：
- 半透明白底、阴影与毛玻璃效果；
- 菜单项需要hover效果和选中状态样式；
- 菜单图标使用Ant Design Vue的图标组件；
- 响应式设计，在小屏幕设备上可隐藏/显示。

### 6.5 欢迎横幅组件（`components/WelcomeBanner.vue`）
- 实现欢迎横幅，显示在首页顶部。
- 包含系统概览信息：运行服务数、系统状态、运行时间。
- 提供快速操作按钮：启动所有服务、刷新状态、查看日志。
- 使用几何图形装饰背景，增加视觉效果。
- 使用Ant Design Vue的Button组件实现操作按钮。

样式要点：
- 渐变背景色，使用主色调；
- 几何图形动画效果；
- 文字信息清晰可读；
- 操作按钮需要hover效果和阴影；
- 响应式设计，在小屏幕设备上调整布局。

### 6.6 服务卡片组件（`components/ServiceCard.vue`）
- 实现服务卡片组件，用于显示单个模块的详细信息。
- 显示模块名称、描述、状态指示器、资源使用情况（CPU、内存）、端口和运行时间。
- 提供操作按钮：启动/停止、打开、查看日志。
- 使用Ant Design Vue的Button和Spin组件。
- 状态指示器需要丰富的动画效果。

样式要点：
- 半透明白底、阴影与毛玻璃效果；
- 状态指示器动画（绿脉动/红闪烁）；
- 资源使用情况进度条；
- 操作按钮需要hover效果和阴影；
- 响应式设计，在小屏幕设备上调整布局。

### 6.7 全局样式和变量（`assets/styles/variables.css` 和 `assets/styles/global.css`）
- 定义全局CSS变量，包括颜色、间距、字体、圆角、阴影等设计系统变量。
- 实现毛玻璃效果样式类。
- 定义状态指示器样式和动画。
- 实现响应式设计媒体查询。
- 定义通用组件样式增强，如按钮、卡片、菜单等。

样式要点：
- 使用现代化的设计系统变量；
- 实现毛玻璃效果（backdrop-filter）；
- 定义丰富的动画和过渡效果；
- 支持深色模式；
- 响应式设计，适配不同屏幕尺寸。

### 6.8 首页概览卡片（`components/OverviewCard.vue`）
- 展示：Docker 服务运行状态（加载态 + 绿/红点）、运行服务 `x/n`、运行时间文本、操作按钮（刷新状态、启动所有服务）。
- `启动 Docker` 按钮：若 `docker.running=false` 则可见；点击后调用 `dockerStart()` 并轮询 `dockerCheck()` 最多 60s，成功后再刷新一次状态。
- `启动所有服务`：调用 `listModules()` 并循环 `startModule(m.name)`。
- 使用 `a-spin`、`a-button`、`ReloadOutlined`、`PlayCircleOutlined` 等。

### 6.9 Store 与 IPC 封装
- `stores/modules.ts`：
  - 维护 `dots: Record<string, 'running'|'stopped'|'error'|'loading'>`、统计字段 `running/total/uptimeText` 等。
- `services/ipc.ts`：
  - 暴露 `dockerCheck()`、`dockerStart()`、`listModules()`、`startModule(name)`、窗口控制 `windowMinimize/Maximize/Close` 等；
  - 采用 preload 暴露的 `window.api`（如 `invoke`, `on`, `off`）。

### 6.10 登录页面（`views/LoginView.vue`）
- 实现美观的登录界面，包含渐变背景和动画效果。
- 包含用户名/邮箱和密码输入框。
- 提供"记住我"复选框和"忘记密码"链接。
- 包含登录按钮和注册跳转链接。
- 实现表单验证和错误提示。
- 使用Ant Design Vue的表单组件。

样式要点：
- 美观的渐变背景设计；
- 输入框和按钮需要hover效果和阴影；
- 响应式设计，在不同屏幕尺寸下表现良好；
- 动画效果增强用户体验。

### 6.11 注册页面（`views/RegisterView.vue`）
- 实现美观的注册界面，包含渐变背景和动画效果。
- 包含用户名、邮箱、密码和确认密码输入框。
- 提供用户协议和隐私政策同意复选框。
- 包含注册按钮和登录跳转链接。
- 实现表单验证和错误提示。
- 使用Ant Design Vue的表单组件。

样式要点：
- 美观的渐变背景设计；
- 输入框和按钮需要hover效果和阴影；
- 响应式设计，在不同屏幕尺寸下表现良好；
- 动画效果增强用户体验。

### 6.12 设置页面（`views/SettingsView.vue`）
- 实现完整的设置页面，根据路由参数显示不同设置内容。
- 包含系统设置、n8n设置、Dify设置、OneAPI设置、RagFlow设置等子页面。
- 每个设置页面包含相应的配置选项和保存按钮。
- 实现表单验证和错误提示。
- 使用Ant Design Vue的表单、输入框、选择器等组件。

样式要点：
- 清晰的页面布局和导航；
- 表单元素需要hover效果和焦点状态；
- 响应式设计，在不同屏幕尺寸下表现良好；
- 一致的设计风格和交互体验。

### 6.13 日志页面（`views/LogsView.vue`）
- 实现完整的日志查看功能。
- 支持按模块和日志级别筛选。
- 提供日志清空、刷新、自动滚动等操作。
- 实现实时日志流显示。
- 支持日志导出功能。
- 使用Ant Design Vue的表格、选择器、按钮等组件。

样式要点：
- 清晰的日志显示格式；
- 筛选器和操作按钮布局合理；
- 响应式设计，在不同屏幕尺寸下表现良好；
- 良好的可读性和用户体验。

### 6.14 监控页面（`views/MonitoringView.vue`）
- 实现完整的性能监控功能。
- 包含系统资源使用率图表（CPU、内存、磁盘、网络）。
- 显示服务状态监控信息。
- 提供性能趋势图表和历史数据查看。
- 支持监控数据刷新和时间范围选择。
- 使用Ant Design Vue的图表、卡片、表格等组件。

样式要点：
- 美观的图表展示；
- 清晰的数据可视化；
- 响应式设计，在不同屏幕尺寸下表现良好；
- 良好的信息层次和用户体验。

### 6.15 个人资料页面（`views/ProfileView.vue`）
- 实现完整的个人资料管理功能。
- 包含用户头像、姓名、邮箱等信息显示和编辑。
- 提供个人资料保存和取消功能。
- 实现表单验证和错误提示。
- 使用Ant Design Vue的表单、输入框、上传等组件。

样式要点：
- 清晰的个人信息展示；
- 表单元素需要hover效果和焦点状态；
- 响应式设计，在不同屏幕尺寸下表现良好；
- 良好的用户体验和交互反馈。

### 6.16 账户设置页面（`views/AccountView.vue`）
- 实现完整的账户安全设置功能。
- 包含密码修改、双重认证、登录历史等选项。
- 提供安全设置保存和取消功能。
- 实现表单验证和错误提示。
- 使用Ant Design Vue的表单、输入框、开关等组件。

样式要点：
- 清晰的安全设置选项；
- 表单元素需要hover效果和焦点状态；
- 响应式设计，在不同屏幕尺寸下表现良好；
- 良好的用户体验和交互反馈。

---

## 7. IPC 契约（`src/shared/ipc-contract.ts`）
- 定义 `IPC` 常量枚举，至少包含：
  - `ModuleStatusEvent`（主进程 → 渲染：推送模块状态）
  - `ModuleLogEvent`（主进程 → 渲染：实时日志流）
  - 其余按需：`DockerCheck`, `DockerStart`, `ModuleList`, `ModuleStart`, `ModuleStop`, `ModuleStatus`, `Window.Minimize/Maximize/Close` 等
- 定义类型：
  - `ModuleName = 'n8n' | 'dify' | 'oneapi' | 'ragflow' | <其它基础模块名>`
  - `ModuleType = 'feature' | 'basic'`
  - `ModuleStatus = { running: boolean; status: 'running'|'stopped'|'error'|'parse_error'; ports: Record<string,string>; usedBy?: string[] }`
  - `IpcResponse<T = any> = { success: boolean; message?: string; code?: string; data?: T }`

---

## 8. 配置与注册表（`src/main/config/store.ts`）
- 提供：
  - `loadRegistry()`：返回模块注册表，含模块 `name`、`type`、`dependsOn`、`healthCheck`、端口映射信息等。
  - `getGlobalConfig()`：返回全局配置（如 `autoStopUnusedDeps`）。
  - `resetRegistryCache()`：清空内部缓存，供主进程启动时调用。
- 注册表需覆盖 feature 模块：`n8n`、`dify`、`oneapi`、`ragflow`，并定义其对基础服务的依赖关系与健康检查目标。

---

## 9. 构建与运行脚本（`package.json`）
- `scripts` 要求：
  - `dev:kill`（Windows PowerShell 清理开发残留 electron/node、5173/5174 端口）
  - `dev:main`（tsup watch 构建主进程到 `out/main`，格式 cjs，外部化 electron）
  - `dev:renderer`（vite）
  - `dev:electron`（Node 启动辅助脚本，等待端口后启动 electron）
  - `dev:all`（concurrently 同时跑三者）
  - `build:main`、`build:renderer`、`build`、`dist`（`electron-builder -w` Windows NSIS）
- `build` 字段（electron-builder）：
  - `appId: com.example.aiserver`，`productName: AI-Server`
  - `directories.output: release`，`files: ["out/main/**", "dist/renderer/**", "package.json"]`
  - `win.target: ["nsis"]`，`win.icon: build/icon.ico`
  - `mac.target: ["dmg"]`，`mac.icon: build/icon.icns`
- 依赖：
  - 运行依赖：`vue@^3.5`、`ant-design-vue@^4`、`@ant-design/icons-vue`、`vue-router@^4.3`、`pinia@^2.1.7`、`dockerode@^4.0.8`、`js-yaml@^4.1.0`
  - 开发依赖：`electron@^31`、`electron-builder@^24.9.1`、`vite@^5`、`@vitejs/plugin-vue@^5`、`tsup@^8`、`typescript@^5.4`、`concurrently@^8.2.0`、`wait-on@^7`、`cross-env@^7`

---

## 10. UI 与交互细节（必须满足）
- 顶部栏视觉：半透明白底、阴影、毛玻璃；活动标签为主色渐变背景；状态点动画（绿脉动/红闪烁）。
- Mac/Windows 窗口控制按钮均可点击并通过 IPC 控制窗口行为。
- 概览卡片有 Docker 状态点、启动按钮与"启动所有服务"。
- 顶部服务标签右侧的状态点需跟随 `IPC.ModuleStatusEvent` 实时变化。
- 实现完整的侧边栏菜单，包含系统设置、模块设置、日志和监控入口。
- 首页包含欢迎横幅，显示系统概览和快速操作按钮。
- 服务卡片组件显示详细模块信息和操作按钮。
- 使用全局样式变量统一设计风格。
- 实现毛玻璃效果和丰富的动画过渡。
- 响应式设计，适配不同屏幕尺寸。

---

## 11. 健康检查、端口与依赖
- 端口冲突检查：在启动依赖与模块前，对计划启动项与已运行容器进行端口占用检测，给出具体冲突地址与模块名提示。
- 健康检查：按注册表 `healthCheck` 定义等待，超时返回 `E_HEALTH_TIMEOUT` 错误。
- 依赖环检测：若发现环，返回 `E_DEP_CYCLE` 并展示环路径。

---

## 12. 打包产物与运行
- 开发：
  - `npm run dev:all` 一键启动（主进程 watch、Vite、Electron）。
- 构建：
  - `npm run build` 生成 `out/main/**` 与 `dist/renderer/**`。
- 打包：
  - `npm run dist` 生成 Windows 安装包到 `release/`。

---

## 13. 验收标准（必测）
- 顶部标签与首页 UI 与交互一致（包括动画与悬停效果）。
- `home` 页面加载后可正确显示 Docker 运行状态；未运行时能点击"启动 Docker"并在 60s 内自动刷新状态。
- 点击"启动所有服务"后，依赖会被自动处理，端口冲突会给出清晰错误信息，健康检查通过后状态变为 running。
- 进入 `n8n/dify/oneapi/ragflow` 路由，顶部相应 Tab 被选中；顶部状态点可在服务启动/停止后实时变化（事件驱动）。
- 关闭应用前，Docker 事件监听会被正确清理，不产生残留定时器或流。
- `electron-builder` 能在 Windows 上成功打出安装包。
- 侧边栏菜单功能完整，包含所有设置项和系统功能入口。
- 欢迎横幅显示正确，包含系统概览和快速操作按钮。
- 服务卡片组件显示详细模块信息，操作按钮功能正常。
- 全局样式统一，包含毛玻璃效果和丰富的动画过渡。
- 响应式设计在不同屏幕尺寸下表现良好。
- 登录/注册页面具有美观的渐变背景、动画效果、完整的表单验证和用户体验设计。
- 设置页面包含系统设置、n8n设置、Dify设置、OneAPI设置、RagFlow设置等完整配置选项。
- 日志页面具有完整的日志查看功能，支持日志级别筛选、清空、刷新等操作。
- 监控页面具有完整的性能监控功能，包括系统资源使用率、服务状态监控、趋势图表等。
- 个人资料和账户设置页面具有完整的用户管理功能。

---

## 14. 交付清单
- 完整代码仓（含上述目录与文件）。
- 可运行的 `package.json` 脚本与打包配置。
- README（开发、构建、打包、依赖与环境说明）。

---

## 15. 生成与实现提示
- 先搭建最小可运行骨架（主进程、渲染入口、路由、TopTabs、OverviewCard、基础 IPC），再补齐 Docker 管理子模块。
- 所有被 `index.ts` 引用的工具模块须实现对应函数或以最小 stub 返回符合预期的结构以便联调。
- 使用 TypeScript，注意 ESM/CJS 互操作（主进程侧使用 `require` 来获取 `electron` 与部分 CJS 依赖）。
- Windows 环境对 Docker 套接字路径：`//./pipe/docker_engine`；Linux/Mac 使用 `/var/run/docker.sock`。
- 渲染层只能通过 preload 暴露的安全 API 访问主进程，严禁直接启用 `nodeIntegration`。

---

请严格按照以上规范生成项目，确保界面与功能与原项目一致。完成后请运行自检（见验收标准），若有偏差请迭代修正直至全部通过。

---

## 16. Orchestration 目录与容器规范（必须一次性生成 Dockerfile 与依赖）

为确保在新建项目时可“一次性生成所有容器”的 Dockerfile 与依赖，请严格生成如下目录与内容：

- `orchestration/`
  - `networks/`
    - `ai-net.yml`（可选的元数据说明，实际网络由 dockerode 创建：`name=ai-net`, `driver=bridge`）
  - `volumes/`
    - 仅文档化声明，实际卷由 dockerode 创建：`ai-pg-data`, `ai-redis-data`, `ai-minio-data`, `ai-qdrant-data`, `ai-meili-data`
  - `basic/`（基础服务，类型为 `basic`）
    - `postgres/`
      - `Dockerfile`：基于 `postgres:14-alpine`
      - `env.example`：`POSTGRES_USER=ai`, `POSTGRES_PASSWORD=ai_pass`, `POSTGRES_DB=ai_db`
    - `redis/`
      - `Dockerfile`：基于 `redis:7-alpine`
    - `minio/`
      - `Dockerfile`：基于 `minio/minio:RELEASE`，`CMD ["server","/data","--console-address","0.0.0.0:9001"]`
      - `env.example`：`MINIO_ROOT_USER=aiadmin`, `MINIO_ROOT_PASSWORD=aiadmin123`
    - `qdrant/`
      - `Dockerfile`：基于 `qdrant/qdrant:latest`
    - `meilisearch/`（如 Dify 选用）
      - `Dockerfile`：基于 `getmeili/meilisearch:latest`
  - `features/`（功能模块，类型为 `feature`）
    - `n8n/`
      - `Dockerfile`：基于 `n8nio/n8n:latest` 或轻量化基础镜像 + 安装脚本
      - `env.example`：`DB_TYPE=postgresdb`, `DB_POSTGRESDB_HOST=postgres`, `DB_POSTGRESDB_PORT=5432`, `DB_POSTGRESDB_DATABASE=ai_db`, `DB_POSTGRESDB_USER=ai`, `DB_POSTGRESDB_PASSWORD=ai_pass`，`N8N_HOST=localhost`, `N8N_PORT=5678`
    - `dify/`
      - `Dockerfile`：基于官方/社区镜像（如 `langgenius/dify:latest`），或自构建
      - `env.example`：与 Postgres/Redis/向量库/对象存储对接所需环境变量（举例：`DB_HOST=postgres`, `DB_PORT=5432`, `REDIS_HOST=redis`, `QDRANT_URL=http://qdrant:6333`, `S3_ENDPOINT=http://minio:9000` 等）
    - `oneapi/`
      - `Dockerfile`：选用对应后端实现镜像（例如 OneAPI 社区镜像）
      - `env.example`：数据库与缓存指向 Postgres 与 Redis
    - `ragflow/`
      - `Dockerfile`：基于官方/社区镜像，或自构建
      - `env.example`：`QDRANT_URL=http://qdrant:6333`，对象存储/DB 按需

命名规范与默认端口（可在设置中覆盖）：
- 网络：`ai-net`
- 卷：`ai-<svc>-data`，例如 `ai-pg-data`
- 基础服务容器名：`ai-<svc>`，端口对外默认映射：
  - `postgres`: 5432→`localhost:5432`
  - `redis`: 6379→`localhost:6379`
  - `minio`: 9000→`localhost:9000`（API），9001→`localhost:9001`（Console）
  - `qdrant`: 6333→`localhost:6333`
  - `meilisearch`: 7700→`localhost:7700`
- 功能模块容器名：`ai-<module>-<service>`（如 `ai-dify-web`、`ai-dify-worker`）；若单体，则 `ai-<module>`。外部端口示例：
  - `n8n`: 5678→`localhost:5678`
  - `dify`: 80/3000→`localhost:5175`（示例）
  - `oneapi`: 3000→`localhost:5176`（示例）
  - `ragflow`: 7860/8080→`localhost:5177`（示例）

健康检查（HealthCheck）约定：
- 尽量在 Dockerfile 中声明 `HEALTHCHECK`（如 `curl -f http://localhost:port/health || exit 1`）。
- 若镜像不便内置健康检查，则在注册表配置 `healthCheck: { target: "http://<host>:<port>/health", timeoutMs, intervalMs, retries }`，主进程通过 HTTP 轮询实现。

依赖关系（建议默认图，可在设置中改写）：
- `n8n` → 依赖：`postgres`
- `dify` → 依赖：`postgres`、`redis`、`qdrant`、`minio`（或 `meilisearch` 替换向量/检索组件）
- `oneapi` → 依赖：`postgres`、`redis`
- `ragflow` → 依赖：`qdrant`、`minio`、（可选 `postgres`）

注册表（`src/main/config/store.ts`）需为每个模块/服务提供：
- `type`：`basic` | `feature`
- `services`：对于 feature，列出子服务（如 `web`、`worker`）；对于 basic，通常只有自身
- `build`：`{ context: "orchestration/<path>", dockerfile: "Dockerfile" }`
- `image`（可选）：若直接使用官方镜像
- `env`：键值与敏感项的占位；支持从 `.env`/UI 设置读取覆盖
- `ports`: `[{ containerPort, hostPort, bind: "127.0.0.1" }]`
- `volumes`: `[{ source: "ai-xxx-data", target: "/data" }]`
- `networks`: `["ai-net"]`
- `dependsOn`: `string[]`
- `healthCheck`: 目标与策略

主进程在首次启动 feature 时，若镜像不存在需先 `dockerode` 构建或拉取镜像，再创建网络/卷/容器并启动。

## 17. 仅用 dockerode 完成容器生命周期与监听（禁止 CLI）

重要：本项目所有容器构建、创建、启动、停止、日志、事件订阅、健康检测等操作，必须通过 `dockerode` 完成。除 `dockerode` 无法覆盖的极端情况外，禁止调用任何 `docker`/`docker-compose` 命令行。

API 对照与落地（示例）：
- 镜像：
  - 构建：`dockerode.buildImage(tarStream, { t: imageTag })`
  - 拉取：`dockerode.pull(imageTag)`
  - 列表/检查：`dockerode.listImages()` / `dockerode.getImage(id).inspect()`
- 网络：
  - 创建：`dockerode.createNetwork({ Name: 'ai-net', Driver: 'bridge' })`
  - 连接容器：创建容器时通过 `HostConfig.NetworkMode` 或 `EndpointsConfig`
- 卷：
  - 创建：`dockerode.createVolume({ Name: 'ai-pg-data' })`
- 容器：
  - 创建：`dockerode.createContainer({ name, Image, Env, ExposedPorts, HostConfig: { PortBindings, Binds, NetworkMode }, Healthcheck })`
  - 启动/停止：`container.start()` / `container.stop()`
  - 删除：`container.remove({ force: true })`（谨慎使用）
  - Inspect：`container.inspect()`（用于状态与端口聚合）
  - 日志（聚合）：`container.logs({ stdout: true, stderr: true, timestamps: true, tail: N })`
  - 日志（流式）：`container.attach({ stream: true, stdout: true, stderr: true })`
- 事件：
  - 订阅：`dockerode.getEvents({ filters: { type: ['container'], event: ['start','stop','die','restart','health_status','destroy'] }})`

端口占用检测：
- 使用 Node `net`/`tcp-port-used` 检查宿主机端口是否被占用；或通过 `dockerode.listContainers({ all: true })` 聚合已有容器的端口绑定，结合注册表预期端口进行冲突检测。

健康检查：
- 优先使用容器内 `HEALTHCHECK`；其次由主进程基于 `healthCheck.target` 进行 HTTP 轮询。

依赖启动顺序：
- 先构建/启动基础服务，等待健康，再创建并启动 feature 容器。
- 停止 feature 时，若 `autoStopUnusedDeps=true` 且无其它 feature 使用该基础服务，则停止基础服务。

## 18. 示例：n8n（feature）与 postgres（basic）的注册表条目（参考）

以下为最小可行的参考结构（请按需扩展到 `dify`、`oneapi`、`ragflow` 与其它基础服务）：

```ts
// 伪代码：位于 src/main/config/registry.example.ts
export const registry = {
  modules: [
    {
      name: 'postgres',
      type: 'basic',
      build: { context: 'orchestration/basic/postgres', dockerfile: 'Dockerfile' },
      env: { POSTGRES_USER: 'ai', POSTGRES_PASSWORD: 'ai_pass', POSTGRES_DB: 'ai_db' },
      ports: [{ containerPort: 5432, hostPort: 5432, bind: '127.0.0.1' }],
      volumes: [{ source: 'ai-pg-data', target: '/var/lib/postgresql/data' }],
      networks: ['ai-net'],
      healthCheck: { target: 'tcp://localhost:5432', timeoutMs: 60000 }
    },
    {
      name: 'n8n',
      type: 'feature',
      dependsOn: ['postgres'],
      build: { context: 'orchestration/features/n8n', dockerfile: 'Dockerfile' },
      env: {
        DB_TYPE: 'postgresdb',
        DB_POSTGRESDB_HOST: 'postgres',
        DB_POSTGRESDB_PORT: '5432',
        DB_POSTGRESDB_DATABASE: 'ai_db',
        DB_POSTGRESDB_USER: 'ai',
        DB_POSTGRESDB_PASSWORD: 'ai_pass',
        N8N_HOST: 'localhost',
        N8N_PORT: '5678'
      },
      ports: [{ containerPort: 5678, hostPort: 5678, bind: '127.0.0.1' }],
      networks: ['ai-net'],
      healthCheck: { target: 'http://localhost:5678/healthz', timeoutMs: 120000 }
    }
  ]
}
```

实现要求：
- 当调用 `firstStartModule('n8n')` 时：
  - 若镜像缺失则按 `build` 拉取/构建；
  - 确保网络与卷存在；
  - 启动 `postgres`，等待健康；
  - 创建并启动 `n8n` 容器，等待健康；
  - 全程使用 `dockerode`，并通过事件/日志流反馈到渲染端。

---

## 19. 容器依赖关系 Mermaid 图（生成时请参照）

```
graph LR
  %% 基础服务
  subgraph Basic Services
    postgres[(postgres)]
    redis[(redis)]
    minio[(minio)]
    qdrant[(qdrant)]
    meili[(meilisearch)]
  end

  %% 功能模块（可细分为子服务）
  subgraph Feature Modules
    n8n[n8n]
    dify_web[dify-web]
    dify_worker[dify-worker]
    oneapi[oneapi]
    ragflow[ragflow]
  end

  %% 硬依赖
  n8n --> postgres
  oneapi --> postgres
  oneapi --> redis
  dify_web --> postgres
  dify_web --> redis
  dify_web --> qdrant
  dify_web --> minio
  dify_worker --> postgres
  dify_worker --> redis
  dify_worker --> qdrant
  dify_worker --> minio
  ragflow --> qdrant
  ragflow --> minio

  %% 可选/替代依赖（虚线）
  dify_web -. optional .-> meili
  dify_worker -. optional .-> meili
  ragflow -. optional .-> postgres

  %% 样式
  classDef basic fill:#f6ffed,stroke:#b7eb8f,color:#389e0d;
  classDef feature fill:#e6f7ff,stroke:#91d5ff,color:#096dd9;
  class postgres,redis,minio,qdrant,meili basic;
  class n8n,dify_web,dify_worker,oneapi,ragflow feature;
```

说明：
- 实线代表必选依赖；虚线代表可选/替代依赖（例如 `dify` 可改用 `meilisearch`）。
- 依赖关系对应于注册表 `dependsOn` 与各服务的网络/端口/环境变量对接。
- 生成项目时请确保与第 16 章命名规范、端口与健康检查策略保持一致。

---

## 20. 最小可行 Dockerfile 与 env.example 模板（可直接生成）

镜像策略优先级：若注册表同时给出 `image` 与 `build`，优先拉取 `image`；缺失 `image` 时再按 `build.context + dockerfile` 构建。若两者都缺失则报错提示补全。

基础服务 Basic（建议使用官方镜像，内置 HEALTHCHECK 或提供可访问端点）：

- postgres（`orchestration/basic/postgres/Dockerfile`）
```dockerfile
FROM postgres:14-alpine
ENV POSTGRES_USER=ai POSTGRES_PASSWORD=ai_pass POSTGRES_DB=ai_db
HEALTHCHECK --interval=10s --timeout=3s --retries=10 CMD pg_isready -U $$POSTGRES_USER || exit 1
```

- redis（`orchestration/basic/redis/Dockerfile`）
```dockerfile
FROM redis:7-alpine
HEALTHCHECK --interval=10s --timeout=3s --retries=10 CMD redis-cli ping | grep PONG || exit 1
```

- minio（`orchestration/basic/minio/Dockerfile`）
```dockerfile
FROM minio/minio:RELEASE.2024-06-13T22-53-52Z
ENV MINIO_ROOT_USER=aiadmin MINIO_ROOT_PASSWORD=aiadmin123
EXPOSE 9000 9001
HEALTHCHECK --interval=10s --timeout=5s --retries=20 CMD wget -qO- http://127.0.0.1:9001/minio/health/ready || exit 1
CMD ["server","/data","--console-address","0.0.0.0:9001"]
```

- qdrant（`orchestration/basic/qdrant/Dockerfile`）
```dockerfile
FROM qdrant/qdrant:latest
EXPOSE 6333
HEALTHCHECK --interval=10s --timeout=5s --retries=20 CMD wget -qO- http://127.0.0.1:6333/healthz | grep -q '"status":"ok"' || exit 1
```

- meilisearch（`orchestration/basic/meilisearch/Dockerfile`）
```dockerfile
FROM getmeili/meilisearch:latest
EXPOSE 7700
HEALTHCHECK --interval=10s --timeout=5s --retries=20 CMD wget -qO- http://127.0.0.1:7700/health | grep -q 'status' || exit 1
```

对应 `env.example`（位于各目录）：
```
POSTGRES_USER=ai
POSTGRES_PASSWORD=ai_pass
POSTGRES_DB=ai_db

MINIO_ROOT_USER=aiadmin
MINIO_ROOT_PASSWORD=aiadmin123
```

功能模块 Feature（可直接使用官方镜像或自构建，以下给出可运行最小模板）：

- n8n（`orchestration/features/n8n/Dockerfile`）
```dockerfile
FROM n8nio/n8n:latest
ENV N8N_PORT=5678
EXPOSE 5678
# 若官方镜像未提供健康端点，可选：
#   - 在 Dockerfile 中安装 `curl`/`wget` 并添加 `HEALTHCHECK` 针对本地端口；
#   - 或在注册表中配置 `healthCheck.target`（http/tcp），由主进程轮询。
```

`env.example`：
```
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=ai_db
DB_POSTGRESDB_USER=ai
DB_POSTGRESDB_PASSWORD=ai_pass
N8N_HOST=localhost
N8N_PORT=5678
```

- dify（示例拆分 web 与 worker，`orchestration/features/dify/web/Dockerfile` 与 `worker/Dockerfile`）
```dockerfile
# web
FROM langgenius/dify:latest
ENV PORT=3000
EXPOSE 3000
# 如需静态端口健康：主进程轮询 http://localhost:3000/ 或容器内自定义健康脚本
```
```dockerfile
# worker（如同镜像或轻量化镜像 + 指定 WORKER 启动命令）
FROM langgenius/dify:latest
ENV WORKER=true
```

`env.example`（最小集合，按需增补）：
```
DB_HOST=postgres
DB_PORT=5432
DB_USER=ai
DB_PASSWORD=ai_pass
DB_NAME=ai_db
REDIS_HOST=redis
REDIS_PORT=6379
QDRANT_URL=http://qdrant:6333
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY_ID=aiadmin
S3_SECRET_ACCESS_KEY=aiadmin123
S3_BUCKET=ai-bucket
```

- oneapi（`orchestration/features/oneapi/Dockerfile`）
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production || npm i --production
EXPOSE 3000
CMD ["node","server.js"]
# 说明：若使用官方镜像或已有后端，请改为 FROM <image> 并暴露 3000 端口
```

`env.example`（示例）：
```
DB_HOST=postgres
DB_PORT=5432
DB_USER=ai
DB_PASSWORD=ai_pass
DB_NAME=ai_db
REDIS_HOST=redis
REDIS_PORT=6379
PORT=3000
```

- ragflow（`orchestration/features/ragflow/Dockerfile`）
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
EXPOSE 7860 8080
CMD ["python","app.py"]
# 说明：若采用官方/社区镜像则改为 FROM <image> 并按其健康/端口规则处理
```

`env.example`（示例）：
```
QDRANT_URL=http://qdrant:6333
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY_ID=aiadmin
S3_SECRET_ACCESS_KEY=aiadmin123
S3_BUCKET=ai-bucket
```

健康检查使用建议：
- 若镜像内不提供健康端点，可选：
  - 在 Dockerfile 中安装 `curl`/`wget` 并添加 `HEALTHCHECK` 针对本地端口；
  - 或在注册表中配置 `healthCheck.target`（http/tcp），由主进程轮询。

---

## 21. UI Demo 参考与禁止引用策略

- 在代码仓根目录提供 `ui-ai-server-v11/` 文件夹，作为 UI Demo 的“像素级参考实现”。
- 生成的新项目 UI 必须与 `ui-ai-server-v11/` 外观与交互一模一样，但严禁在新项目代码中以任何形式（import/require/相对路径引用）引用该文件夹内的任何代码或资源。
- 你应当在生成的新项目中独立实现等效的组件与样式（如 `TopTabs.vue`、`OverviewCard.vue`、`HomeView.vue` 等），并在测试前手动删除 `ui-ai-server-v11/` 目录验证完全脱离依赖。
