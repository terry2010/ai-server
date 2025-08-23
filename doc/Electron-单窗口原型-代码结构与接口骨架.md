# Electron 单窗口最小原型：代码结构与接口骨架（Vue3 + TS + Ant Design Vue）

本文件定义最小化原型（单窗口）的技术选型、目录结构、IPC 接口骨架、UI 布局与交互、模块化约束与脚手架建议。该原型将作为后续功能扩展的基础。

更新时间：2025-08-23
支持平台：Windows 10、macOS

---

## 1. 技术选型

- 前端框架：Vue 3 + TypeScript
- 构建工具：Vite（前端） + Electron（主进程）
- UI 组件库：Ant Design Vue（企业级审美与交互规范，成熟稳定，暗色主题支持）
- 状态管理：Pinia
- 进程通信：Electron IPC（`ipcMain.handle` + `ipcRenderer.invoke`），响应统一 `{ success, message?, data? }`
- 代码规范：ESLint + Prettier + TypeScript 严格模式

---

## 2. 顶层目录结构（原型阶段）

```text
ai-server/
  src/
    main/                      # Electron 主进程（Node 环境）
      app.ts                   # 应用入口（创建 BrowserWindow）
      preload.ts               # 预加载脚本（安全暴露 API）
      ipc/
        docker.ts              # docker/compose 检测与启动
        modules.ts             # 模块启停、状态、清理
        config.ts              # 配置读写
        env.ts                 # 环境诊断
      docker/
        index.ts               # CLI 调用与依赖算法（与实施方案一致）
        template.ts            # compose 模板生成
        utils.ts               # 路径/命令解析/超时/日志
      config/
        store.ts               # 配置持久化（userData）
        schema.ts              # 类型/默认值
        registry/              # 内置模块注册表（JSON），可被用户覆盖
    renderer/                  # 渲染进程（Vite + Vue + TS）
      main.ts                  # Vue 入口
      app.vue
      router/
        index.ts
      store/
        index.ts               # Pinia 根
      pages/
        Home.vue               # 单窗口主界面（环境+列表）
      components/
        ModuleList.vue         # 通用模块列表（basic/feature）
        EnvCard.vue            # 环境检测卡片
        LogsPanel.vue          # 日志面板（可后续补充）
      styles/
        index.less
    shared/                    # 通用类型与常量（主/渲染共享，仅类型）
      ipc-contract.ts
      models.ts
  docker-compose/              # 模板（历史/示例保持）
  third_party/
    nltk_data/                 # RagFlow 宿主 NLTK 数据目录
```

约束：
- 严禁“上帝文件”，单文件 ≤ 400 行；必要时继续拆分到按域模块目录。
- `shared/` 仅放 TS 类型与常量，避免引入 Node/DOM 环境特定依赖。

注册表位置与合并（与《实施方案》一致）：

- 内置注册表：`src/main/config/registry/*.json`
- 用户覆盖注册表：`app.getPath('userData')/modules/*.json`
- 合并顺序：内置 → 用户覆盖 → 运行时矫正（端口冲突自动建议等）
- 可选热加载：监听 `userData/modules/` 文件变更以刷新模块清单

---

## 3. IPC 接口骨架（与《实现规范》一致）

文件：`src/shared/ipc-contract.ts`

```ts
export type ModuleName = 'dify' | 'ragflow' | 'n8n' | 'oneapi' | string;
export type ModuleType = 'basic' | 'feature';

export interface IpcResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface DockerCheck {
  installed: boolean;
  running: boolean;
  version?: string;
}

export interface EnvDiagnoseResult {
  docker: { installed: boolean; running: boolean; compose: 'docker compose' | 'docker-compose' | null; version?: string };
  node?: string;
  npm?: string;
  powershell?: string;
  issues: string[];
}

export interface ModuleItem { name: string; type: ModuleType; }
export interface ModuleStatus { running: boolean; status: 'running' | 'stopped' | 'error' | 'parse_error'; ports: Record<string, string>; }

export const IPC = {
  EnvDiagnose: 'ai/env/diagnose',
  DockerCheck: 'ai/docker/checkDocker',
  DockerStart: 'ai/docker/startDocker',
  ModulesList: 'ai/modules/list',
  ModuleStart: 'ai/module/start',
  ModuleStop: 'ai/module/stop',
  ModuleStatus: 'ai/module/status',
  ModuleClear: 'ai/module/clear',
  ConfigGet: 'ai/config/get',
  ConfigSet: 'ai/config/set',
} as const;
```

### 3.1 错误码与数据契约细化

- IpcResponse 错误码（`message` 需可读，开发态在 console 追加 stack）：
  - `E_COMPOSE_NOT_FOUND`：未检测到 docker compose 命令
  - `E_TEMPLATE_MISSING`：模块缺少模板或模板引用不存在
  - `E_VAR_MISSING`：必需变量缺失（含端口/密码等）
  - `E_PORT_CONFLICT`：宿主端口冲突
  - `E_DEP_CYCLE`：循环依赖
  - `E_HEALTH_TIMEOUT`：健康检查超时
  - `E_RUNTIME`：其他运行时错误
- ModuleStatus 补充：`errorCode?: string; errorDetail?: string`

首次启动相关错误码：

- `E_PREFLIGHT_RESOURCE`：资源不足（CPU/内存/磁盘）
- `E_EXT_CONN_FAIL`：外部 DB/Redis 连通性失败
- `E_IMAGE_PULL`：镜像拉取失败
- `E_INIT_SCRIPT`：初始化/迁移脚本失败
- `E_FIRST_RUN_ABORTED`：用户中止首次启动

---

## 4. 主进程骨架

- `src/main/app.ts`
  - 创建单窗口、加载 Vite 开发服务器或生产包
  - 注入 `preload.ts`

- `src/main/preload.ts`
  - 通过 `contextBridge.exposeInMainWorld('api', { ... })` 暴露仅允许的 `invoke()` 封装，防止直接访问 Node API

- `src/main/ipc/*.ts`
  - 每个文件注册相关通道的 `ipcMain.handle`
  - 返回 `IpcResponse`

- `src/main/docker/index.ts` 要点
  - 组合命令适配：优先 `docker compose`，回退 `docker-compose`
  - 启停算法遵循《实施方案》第 5 章与《实现规范》6.1
  - 端口占用检测、健康检查等待、依赖计算

### 4.1 注册表加载与合并（实现细则）

- 入口：`src/main/docker/index.ts` 在首次调用前懒加载注册表；或在 `app.whenReady()` 时由 `src/main/config/store.ts` 预加载缓存。
- 步骤：
  1) 读取内置 `src/main/config/registry/*.json`
  2) 合并用户覆盖 `userData/modules/*.json`
  3) 使用 `schema.ts`（Zod/自定义校验）做 schema 校验与默认值填充
  4) 生成依赖图（拓扑排序），预检测循环依赖并缓存
  5) 生成渲染所需列表：`{ basic: ModuleItem[]; feature: ModuleItem[] }`
- 运行态：每次 `ModuleStatus` 走 Docker CLI 过滤 labels 即时计算，不存持久化状态
- 模板渲染：`docker/template.ts` 负责 `templateRef`/`fragment` 合成，变量来自“模块 variables + 全局配置 store”

示例：`src/main/ipc/modules.ts`

```ts
import { ipcMain } from 'electron';
import { IPC, ModuleName } from '../../shared/ipc-contract';
import { startModule, stopModule, getModuleStatus, clearModuleCache, listModules } from '../docker';

ipcMain.handle(IPC.ModulesList, async () => ({ success: true, data: { items: listModules() } }));

ipcMain.handle(IPC.ModuleStart, async (_e, payload: { name: ModuleName }) => {
  return startModule(payload.name); // 内部负责依赖启动与 healthy 等待
});

ipcMain.handle(IPC.ModuleStop, async (_e, payload: { name: ModuleName }) => {
  return stopModule(payload.name); // 内部负责依赖引用检测与保护
});

ipcMain.handle(IPC.ModuleStatus, async (_e, payload: { name: ModuleName }) => {
  return getModuleStatus(payload.name);
});

ipcMain.handle(IPC.ModuleClear, async (_e, payload: { name: ModuleName }) => {
  return clearModuleCache(payload.name);
});
```

---

## 5. 渲染进程骨架（Vue3 + Ant Design Vue）

- `src/renderer/main.ts`
  - 创建 Vue 应用，注册 Pinia、Router、Ant Design Vue（按需或全量引入）
- `src/renderer/pages/Home.vue`（单窗口主界面）
  - 顶部：环境检测卡片（`EnvCard`）
  - 中部：两个选项卡 Tabs（基础服务模块 / 功能模块）
  - 列表：`ModuleList` 组件渲染模块卡片（可使用 a-card、a-space、a-tag 等），每项包含：
    - 名称、类型、状态（运行中/停止/错误）
    - 端口映射预览
    - 操作按钮：启动、停止、清理缓存、设置端口（弹窗表单）

动态清单：`ModulesList` 由 IPC 动态返回，前端不硬编码模块。提交设置后调用 `ConfigSet` 并刷新清单。

界面布局（示意）：

```text
+---------------------------------------------------------+
| Env Diagnose (Docker/Compose/Node/npm/PS)  [Run / Auto] |
+-------------------------+-------------------------------+
| Basic Modules           | Feature Modules               |
| [MySQL] [Redis] [...]   | [dify] [ragflow] [n8n] [...]  |
|  Start Stop Clear Conf  |  Start Stop Clear Conf        |
+-------------------------+-------------------------------+
```

Pinia store 示例：`src/renderer/store/index.ts`

```ts
import { defineStore } from 'pinia';
import type { ModuleItem, ModuleStatus } from '../../shared/ipc-contract';

export const useModuleStore = defineStore('modules', {
  state: () => ({
    basic: [] as ModuleItem[],
    feature: [] as ModuleItem[],
    status: new Map<string, ModuleStatus>(),
    loading: false,
  }),
});
```

---

## 6. UI 交互与规则（与规范一致）

- 启动：
  - 基础服务：仅启动自身
  - 功能模块：自动启动未运行的依赖基础服务，等待 healthy，再启动自身
- 停止：
  - 基础服务：若有运行中的功能模块依赖，阻止并给出错误提示
  - 功能模块：先停自身，再判断依赖基础服务是否仍被其他功能模块使用，默认不自动回收，可提供“智能回收”选项
- 清理缓存：清除 compose 缓存文件与容器（谨慎操作确认）
- 端口设置：提交前做占用检测

补充实现细则：

- 端口校验：`a-form` 自定义异步校验器，调用 IPC `ai/module/validatePorts`（或在 `ModuleStart` 前统一校验）
- 健康等待：启动后轮询 `ModuleStatus` 或由主进程返回 `progress`（可后续扩展事件通道），当前版本以主进程阻塞等待后再返回成功

### 首次启动向导与日志查看

- 向导式提示：展示“镜像准备 → 依赖启动 → 初始化 → 健康检查”的进度条；可中止。
- 错误呈现：以错误码 + 详细信息形式展示，并提供“查看日志”按钮。
- 日志查看：
  - UI 提供 `LogsPanel.vue` 打开模块日志（或打开日志目录）。
  - 日志位置与挂载规范见《实施方案》9.1；主进程可返回日志路径。
- 成功输出：首次启动完成后在 UI 显示连接信息（URL/端口/默认账号等），并提示尽快修改默认密码。

### 清除数据（危险操作，需二次确认）

- 入口位置：模块列表项的“更多”菜单中提供“清除数据”。
- 二次确认：弹窗详细列出将被删除的内容（容器、命名卷、宿主目录、数据库/索引/对象存储数据），需输入模块名确认或勾选 `我已知风险`。
- 执行方式：
  - 应用内：通过主进程 IPC 调用 `ModuleClear`，由主进程完成容器/卷/目录清理；成功后刷新状态。
  - 开发/CI：提供 `scripts/module.ps1 -Name <module> -Action clear -Force` 脚本用于离线验证（UI 不直接调用脚本）。
- 日志：成功与失败均需落日志，失败返回可读 `errorCode/errorDetail` 并指向日志路径。

---

## 7. 模块化与代码约束

- 文件行数：单文件 ≤ 400 行
- 目录拆分：按域分层（ipc/docker/config/ui/store），避免集中式上帝文件
- 跨平台：Windows/macOS 差异在主进程适配层解决（路径、命令、权限）
- UI 不调用 PowerShell 脚本；仅通过 JS/IPC 操作。PS1 仅供人工/CI

---

## 8. 开发与运行（建议脚本）

- 开发模式：
  - `pnpm dev:renderer`：启动 Vite（渲染）
  - `pnpm dev:main`：ts-node/tsx 启动主进程，或使用 electron-vite 集成
  - `pnpm dev`：并行启动（推荐使用 concurrently 或 electron-vite）
- 构建与打包：
  - `pnpm build`：构建渲染与主进程产物
  - `pnpm dist`：使用 electron-builder 生成安装包（Win/mac）

脚本示例（package.json 段落，使用 npm）：

```json
{
  "scripts": {
    "dev:all": "concurrently -n main,renderer,electron -c blue,green,magenta \"npm:dev:main\" \"npm:dev:renderer\" \"npm:dev:electron\"",
    "dev:main": "tsx src/main/app.ts",
    "dev:renderer": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "vite build && tsx build-main.ts",
    "dist": "electron-builder -mwl"
  }
}
```

说明：
- 一键启动命令为 `npm run dev:all`，会并行启动主进程、渲染进程与 Electron。
- 若使用 pnpm，将脚本中的 `npm:` 改为 `pnpm -C .` 或直接：
  - `pnpm dev:all`：`concurrently ... "pnpm dev:main" "pnpm dev:renderer" "pnpm dev:electron"`

---

## 9. UI 组件与样式（Ant Design Vue）

- 主题：Ant Design 默认主题，支持暗色模式与自定义主题变量（Less）。
- 表单校验：`a-form` + 自定义端口校验器（异步校验端口占用）。
- 反馈：`message`/`modal`（停止基础服务被依赖时弹出错误）。

---

## 10. 后续扩展位

- 日志拉取：主进程维护 ring buffer，暴露 `ai/logs/get?name=<module>`（可后续补充）
- 高级设置：四个模块的独立设置页，沿用同一组件样式
- 动态端口自动分配策略：端口冲突时建议下一个空闲端口

---

## 11. 验收标准（原型）

- 单窗口可用：环境检测、模块列表（basic/feature）
- 按钮语义：严格按依赖规则启停，错误反馈清晰
- Windows/macOS 上可运行（Docker Desktop 检测、compose 命令选择）
