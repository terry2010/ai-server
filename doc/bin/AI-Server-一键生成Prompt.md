AI-Server 一键生成完整项目 Prompt（权威版）

本 Prompt ，用于从零实现并迭代本仓库“AI-Server Electron 单窗口原型（Vue3+TS+Ant Design Vue）”项目。AI 需严格遵循下述规范、接口契约与文档结构，交付可直接在 Windows 10 上运行的开发环境与应用。

---

## 0. 目标与范围
- 交付 Electron 单窗口最小原型，含：
  - 环境检测（Docker/Compose/Node/npm/PowerShell）
  - 基础服务模块（basic）与功能模块（feature）的列表、启停、状态、清理
  - 可配置的“模块注册表 + 依赖图 + 启停算法 + 模板渲染”机制
  - 首次启动（first-run）标准流程与错误码
- 必须兼容 Windows 10；macOS 优先不阻塞（必要时预留适配）。
- 项目基于 Vue3+TypeScript+Ant Design Vue+Vite，主进程用 Electron+TypeScript。

---

## 1. 技术/工具要求
- 前端：Vue 3、TypeScript、Vite、Ant Design Vue、Pinia
- 主进程：Electron（TypeScript）、IPC（ipcMain.handle + ipcRenderer.invoke）
- 构建：Vite、tsup/tsx（任选其一，但需留脚本位兼容）
- 代码规范：ESLint + Prettier + TS 严格
- 开发脚本：npm（兼容 pnpm），一键 `npm run dev:all` 可启动

---

## 2. 目录结构（要求落地）
```
ai-server/
  src/
    main/
      app.ts
      preload.ts
      ipc/
        docker.ts
        modules.ts
        config.ts
        env.ts
      docker/
        index.ts
        template.ts
        utils.ts
      config/
        store.ts
        schema.ts
        registry/              # 内置模块注册表（JSON），可被用户覆盖
    renderer/
      main.ts
      app.vue
      router/
        index.ts
      store/
        index.ts
      pages/
        Home.vue
      components/
        ModuleList.vue
        EnvCard.vue
        LogsPanel.vue
      styles/
        index.less
    shared/
      ipc-contract.ts
      models.ts
  doc/
    AI-Server-编排设计与实施方案.md        # 已有，保持一致
    Electron-单窗口原型-代码结构与接口骨架.md # 已有，保持一致
    AI-Server-一键生成Prompt.md              # 本文件
  docker-compose/      # 历史/示例保留，不修改
  third_party/
    nltk_data/
```

---

## 3. 关键契约与类型（必须实现）
- 文件：`src/shared/ipc-contract.ts`
- 内容要点：
  - `ModuleName`、`ModuleType('basic'|'feature')`
  - `IpcResponse<{ success:boolean; message?; data? }>`
  - `DockerCheck`、`EnvDiagnoseResult`
  - `ModuleItem { name; type }`、`ModuleStatus { running; status; ports; errorCode?; errorDetail? }`
  - IPC 通道常量：
    - `EnvDiagnose`、`DockerCheck`、`DockerStart`
    - `ModulesList`、`ModuleStart`、`ModuleStop`、`ModuleStatus`、`ModuleClear`
    - `ConfigGet`、`ConfigSet`
- 错误码（必须覆盖）：
  - 基础：`E_COMPOSE_NOT_FOUND` `E_TEMPLATE_MISSING` `E_VAR_MISSING` `E_PORT_CONFLICT` `E_DEP_CYCLE` `E_HEALTH_TIMEOUT` `E_RUNTIME`
  - 首启：`E_PREFLIGHT_RESOURCE` `E_EXT_CONN_FAIL` `E_IMAGE_PULL` `E_INIT_SCRIPT` `E_FIRST_RUN_ABORTED`

---

## 4. 可配置模块注册与依赖图（必须实现）
- 内置注册表：`src/main/config/registry/*.json`
- 用户覆盖注册表：`app.getPath('userData')/modules/*.json`
- 合并顺序：内置 → 用户覆盖 → 运行时矫正
- 热加载（可选）：监听 `userData/modules/` 变更刷新清单
- 模块 Schema（关键字段）：
```
{
  name: string,
  type: 'basic' | 'feature',
  dependsOn?: string[],
  profiles?: string[],
  image?: string,
  env?: Record<string, string>,
  ports?: { container: number, host: string|number, bind?: string }[],
  volumes?: { host: string, container: string }[],
  variables?: Record<string, string>,
  healthCheck?: { type: 'tcp'|'http'|'container_healthy', target?: string, interval?: number, timeout?: number, retries?: number },
  compose?: { templateRef?: string, fragment?: string },
  lifecycle?: { preUp?: string[], postUp?: string[], preDown?: string[] }
}
```
- 依赖图：拓扑排序，检测循环依赖；Profiles 支持互斥或可选依赖（如 ES/OS 二选一）。

---

## 5. 启停算法与模板渲染（必须实现）
- 命令适配：优先 `docker compose`，回退 `docker-compose`
- 启动模块：
  1) 计算依赖集合，处理 `useExternalDB/Redis` 等外部开关
  2) 依赖顺序 `up -d --no-recreate` 并等待 healthy
  3) 渲染模块模板与 env，`up -d --no-recreate`
- 停止模块：
  1) 先 stop 自身 feature
  2) 扫描基础服务是否仍被其他模块使用，若否可“智能回收”（默认不自动）
- 端口占用：启动前校验；冲突返回 `E_PORT_CONFLICT`，支持自动建议下一个空闲端口
- 模板渲染：`src/main/docker/template.ts` 合并 `templateRef|fragment` 与变量（模块 variables + 全局配置），Windows 路径正斜杠化

---

## 6. 首次启动（first-run）流程（必须实现）
- 目标：可预测、幂等可重试、可观测、安全
- 步骤：预检 → 镜像准备 → 依赖启动 → 模块启动 → 初始化/迁移 → 健康与验证 → 标记与幂等 → 失败与回滚
- 标记持久化：`src/main/config/store.ts` 在 `userData` 记录 `firstRunDone`、`schemaVersion`、时间戳、`lastError`
- 错误码：见第3节“首启错误码”

---

## 7. 主进程实现要点（必须实现）
- `src/main/ipc/*.ts`：提供统一 `IpcResponse`
- `src/main/docker/index.ts`：封装 list/start/stop/status/clear，内含依赖计算、端口校验、健康等待
- `src/main/docker/utils.ts`：命令存在性检测、版本检测、路径与超时、日志工具
- `src/main/config/store.ts`：合并内置/用户注册表与全局配置，读写 `userData`

---

## 8. 渲染进程与 UI（必须实现）
- `Home.vue`：
  - 顶部 `EnvCard`：环境诊断、Docker 一键启动
  - Tabs：Basic / Feature 两类模块列表（动态获取，不硬编码）
  - 列表项：名称、状态、端口预览；启动/停止/清理/设置端口
- 端口设置：`a-form` + 异步端口占用校验（IPC）
- 首启向导：进度条（镜像→依赖→初始化→健康），错误码展示与“查看日志”按钮
- `styles/index.less`：基础布局与主题

---

## 9. 脚本与运行（必须实现）
- `npm run dev:all`：并行启动 main/renderer/electron（concurrently + wait-on/electron）
- `npm run build`：构建主/渲染产物
- `npm run dist`（可选）：electron-builder 产包（Win/mac）

---

## 10. 版本矩阵与镜像（参考实施方案）
- 基础服务：MySQL 8.4.6、Postgres 16-alpine、Redis 7.2-alpine、OpenSearch 2.19.1、Elasticsearch 8.14.3、MinIO RELEASE.2025-06-13T11-33-47Z 等
- 应用：Dify 1.7.2、n8n 1.108.1、RagFlow v0.20.3、OneAPI v0.6.11-preview.7
- RagFlow 还可用 Valkey 8 与 Infinity（可选）

---

## 11. 测试清单（验收必过）
- 启停顺序与依赖：先依赖后模块；停止保护基础服务
- 外部依赖开关：useExternalDB/Redis 工作正常
- 端口：默认 127.0.0.1；改 0.0.0.0 可被局域网访问
- Win10/mac：命名卷持久化与健康检查都通过
- 日志：各容器日志落在统一目录，UI 可快速定位
- 首次启动：
  - 预检失败路径（资源/端口/连通性）返回正确错误码
  - 镜像拉取失败有重试与提示
  - 初始化失败可回滚，日志可见
  - 标记 `firstRunDone` 后二次启动跳过初始化

---

## 12. 交付要求
- 代码完整可运行，`npm i && npm run dev:all` 在 Windows 10 可启动
- 填充必要 README，说明开发/构建/打包
- 关键模块与函数具备注释，错误码统一
- 文档与实现保持一致（两份权威文档已存在）

---

## 13. 质量约束
- 单文件 ≤ 400 行，按域拆分
- 严禁渲染进程执行 PowerShell；仅 JS/IPC 调用 docker/compose
- 重要路径/命令均需日志与错误处理

---

## 14. 输出格式（AI 执行规范）
- 直接在对应路径创建/修改文件，保证可运行
- 若替换/新增脚本，更新 package.json
- 如需新增注册表样例，提供 1~2 个基础服务与 1 个功能模块示例 JSON（放入 `src/main/config/registry/`）
- 所有路径与命名遵循本文档

---

请严格按以上清单一次性生成与修正，优先保证“可运行与一致性”。
