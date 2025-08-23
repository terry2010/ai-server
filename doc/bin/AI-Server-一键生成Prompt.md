AI-Server 基于现有代码的增量开发 Prompt（Win10）

请严格遵循本文档、仓库内两份权威文档与现有代码结构进行增量开发，保证 Windows 10 下可直接运行。

仓库路径（本地）：`c:/code/ai-server`
权威文档：
- `C:\code\ai-server\doc\AI-Server-编排设计与实施方案.md`
- `C:\code\ai-server\doc\AI-Server-编排设计与实施方案.md`
- `C:\code\ai-server\doc\脚本使用手册.md`
---

## 0. 执行原则
- 以“最小可运行、按域拆分、渐进完善”为准则。
- 不破坏现有目录与文件命名；增量提交新文件或在指定位置补全骨架。
- 任何改动需与两份权威文档一致；如发现不一致，优先按文档修正并在提交信息中注明。
- 严格兼容 Windows 10 环境，避免依赖 bash-only 命令。

---

## 1. 必做任务清单（按顺序执行）
1) 主进程配置与注册表
    - 新增/补全 `src/main/config/schema.ts`：定义模块 Schema/全局配置类型与校验函数（与文档第6章一致）。
    - 新增/补全 `src/main/config/store.ts`：
        - 读取内置注册表：`src/main/config/registry/*.json`
        - 读取用户覆盖：`app.getPath('userData')/modules/*.json`
        - 合并与校验，输出模块清单与依赖图缓存。
        - 提供读写“首次启动标记”：`firstRunDone`、`schemaVersion`、`lastInitAt`、`lastError`。
    - 首次启动：
        - 预检失败路径（资源/端口/连通性）返回正确错误码
        - 镜像拉取失败有重试与提示
        - 初始化失败可回滚，日志可见
        - 标记 `firstRunDone` 后二次启动跳过初始化

2) Docker 启停编排
    - 新增/补全 `src/main/docker/template.ts`：
        - 渲染 `compose.templateRef|fragment` 与变量合并（模块 variables + 全局配置），处理 Windows 路径正斜杠化。
    - 新增/补全 `src/main/docker/index.ts`：
        - 导出：`list/start/stop/status/clear`。
        - 按文档第5章实现：依赖拓扑、端口占用检测、健康等待（tcp/http/container_healthy）。
        - 支持外部依赖开关（如 `useExternalDB/Redis`）。
    - 补强 `src/main/docker/utils.ts`：
        - `hasDockerCompose()`、版本检测、端口检测、超时与日志工具。

3) 首次启动（first-run）流程
    - 在 `start()` 内按文档“5.4 首次启动流程”实现串行步骤：
        - 预检 → 镜像准备 → 依赖启动 → 模块启动 → 初始化/迁移 → 健康与验证 → 标记与幂等 → 失败与回滚。
    - 错误码覆盖：`E_PREFLIGHT_RESOURCE`、`E_EXT_CONN_FAIL`、`E_IMAGE_PULL`、`E_INIT_SCRIPT`、`E_FIRST_RUN_ABORTED`。

4) IPC 契约与通道
    - 确保 `src/shared/ipc-contract.ts` 定义齐全：`IpcResponse`、`ModuleItem`、`ModuleStatus`、`EnvDiagnoseResult`、错误码等。
    - 在 `src/main/ipc/` 内实现/补全：
        - `modules.ts`：`ModulesList`、`ModuleStart`、`ModuleStop`、`ModuleStatus`、`ModuleClear`。
        - `docker.ts`：`DockerCheck`、`EnvDiagnose`、`DockerStart`（如有需要）。
        - `config.ts`：`ConfigGet/ConfigSet`（读取/写入全局配置、first-run 标记）。

5) 渲染端最小 UI 骨架（如缺失则补全）
    - `src/renderer/pages/Home.vue`：
        - 顶部 `EnvCard`（环境诊断、Docker 一键启动）。
        - 模块列表 Tabs：Basic / Feature 动态清单，按钮：Start/Stop/Status/Clear，端口设置弹窗（异步占用校验）。
    - `src/renderer/components/LogsPanel.vue`：
        - 提供“查看日志”占位；主进程返回日志路径或打开目录。
    - 首次启动向导：显示“镜像→依赖→初始化→健康”的进度提示及错误码与查看日志入口。

6) 脚本与运行
    - `package.json` 保证：
        - `dev:all` 一键启动（concurrently + wait-on/electron）。
        - `build` 构建主/渲染产物。
    - README 补充 Windows 运行说明（如需）。

---

## 9. 脚本与运行（必须实现）
- `npm run dev:all`：并行启动 main/renderer/electron（concurrently + wait-on/electron）
- `npm run build`：构建主/渲染产物
- `npm run dist`（可选）：electron-builder 产包（Win/mac）

PowerShell 脚本（Win10，强制）：

- 统一调度脚本：`scripts/module.ps1`
    - 用法：`./scripts/module.ps1 -Name <ModuleName> -Action start|stop|status|clear [-Force]`
    - 行为：
        - `start`：按文档第5章启停算法启动模块（含依赖）
        - `stop`：停止模块（保护基础服务）
        - `status`：打印容器与健康信息
        - `clear`：清除所有数据（容器、命名卷、宿主数据目录、数据库/索引/对象存储），默认带二次确认；`-Force` 免确认
- 模块脚本目录：`scripts/modules/<module>/start.ps1|stop.ps1|status.ps1|clear-data.ps1`
    - 供 `module.ps1` 内部调用，也可单独运行；失败需返回非零退出码
    - 所有功能模块必须提供 `clear-data.ps1`（强制）

---

## 2. 约束与不变更项
- 目录与命名保持：`src/main/`、`src/renderer/`、`src/shared/`、`doc/`。
- 不在渲染进程调用 PowerShell 或直接执行 docker 命令；一律经 IPC。
- 单文件 ≤ 400 行；超过则按域拆分。
- 错误码与数据结构与文档一致；统一从 `src/shared/ipc-contract.ts` 引用。

---

## 11. 测试清单（验收必过）
- 基础：`E_COMPOSE_NOT_FOUND`、`E_TEMPLATE_MISSING`、`E_VAR_MISSING`、`E_PORT_CONFLICT`、`E_DEP_CYCLE`、`E_HEALTH_TIMEOUT`、`E_RUNTIME`。
- 首启：`E_PREFLIGHT_RESOURCE`、`E_EXT_CONN_FAIL`、`E_IMAGE_PULL`、`E_INIT_SCRIPT`、`E_FIRST_RUN_ABORTED`。

---

## 4. 交付物与验收
- 代码可在 Win10 下：`npm i && npm run dev:all` 启动。
- IPC 功能经 UI 可完成：
    - 列表加载、启动/停止、状态查询、清理。
    - 首次启动完整链路（可通过模拟/占位实现迁移步骤，但接口需齐全）。
- 日志可定位：提供日志路径或打开目录能力。
- 测试清单通过：详见 `doc/AI-Server-编排设计与实施方案.md` 第11章。

---

## 5. 开发提示
- 先以最小可用的“1~2 个基础服务 + 1 个功能模块”的注册表样例跑通链路，再扩展。
- 端口占用用 Node 端口探测或 `netstat`（注意 Windows 兼容）。
- 健康检查先实现 tcp/http 简版，`container_healthy` 可基于 `docker inspect` 状态字段。

---

## 6. 输出格式（你需要直接进行的操作）
- 在上述指定路径创建/修改文件；自动补全 import/export。
- 不产生与文档冲突的命名；若需新增字段，先在文档中补充再实现。
- 修改 `package.json` 时，同步修正脚本依赖。

---

项目已经开发了几天了，你要审阅项目， 确认项目开发进度， 并把开发进度 和 接下来要做的todo 写到 doc 的新文件中
