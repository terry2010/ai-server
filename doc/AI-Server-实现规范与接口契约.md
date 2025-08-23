# AI-Server 实现规范与接口契约（交付给代码生成AI）

本规范是本仓库唯一的“实现落地文档”。配合《AI-Server 编排设计与实施方案（权威）》使用，使得只凭这两份文档即可一次性生成完整可运行的代码与模板。

更新时间：2025-08-23
适用平台：Windows 10（主）、macOS（次）

## 0. 开发模式调整与最小化原型

为配合新的开发计划，首先交付一个 Electron 最小化原型（单窗口）。该原型仅包含：

- 环境检测面板：检测 Docker/Compose 安装与运行、Docker Desktop 可启动性、Node/npm/PowerShell 版本、基本端口可用性抽检。
- 基础服务模块列表（basic）：展示并操作基础服务（如 MySQL/Postgres/Redis/MinIO/OpenSearch/Elasticsearch/Valkey/Weaviate 等）的映射端口、运行状态、启动、停止、清空缓存后启动。
- 功能模块列表（feature）：展示并操作 `dify`、`ragflow`、`n8n`、`oneapi` 等模块的映射端口、运行状态、启动、停止、清空缓存后启动。

实施约束：

- UI 端操作必须通过 JS 直接调用主进程（IPC -> Docker/Compose），禁止在渲染进程中调用 PowerShell 脚本。
- 每完成一个系统模块（无论 basic 还是 feature）的容器化与启停能力，都需要在仓库中新增对应的 PowerShell 辅助脚本（`start-<module>.ps1`、`stop-<module>.ps1`）供人工/CI 使用；但 UI 不调用这些脚本。
- 完成并自测一个模块后，将该模块操作集（设置端口/启停/清理）接入 UI，再进入下一个模块开发与验收。

本章为优先交付范围；容器管理的完整实现继续遵循《实施方案》。


## 1. 目录与术语
- 应用：Electron 应用，本项目。
- 主进程：Electron Main（Node 环境），负责 Docker/Compose 操作与配置持久化。
- 渲染进程：前端 UI（Vue），提供设置页、启停、日志查看。
- 模块 Module：`dify`、`ragflow`、`n8n`、`oneapi` 中的任意一个。
- Compose 模板：`docker-compose/*.template.yml`，通过替换占位符生成运行时 compose 文件。
- 用户数据目录：`{electronApp.getPath('userData')}`。Windows 回退约定：`%APPDATA%/dify-n8n-ragflow-oneapi-client/user-data/`。

关键路径约定：
- 运行时生成 compose：`{userData}/docker-compose/<module>.yml`
- 模块数据根：`{userData}/data/<module>/`
- NLTK 宿主目录：`third_party/nltk_data`（由 `NLTK_HOST_DIR` 指向；容器内挂载到 `/root/nltk_data`）

---

## 2. 跨平台与命令兼容
- 必须优先使用 Docker Compose v2 子命令：`docker compose ...`；若不可用则回退 `docker-compose ...`。
- 统一封装一个解析函数，缓存判断结果。
- Windows 路径必须正斜杠化写入 compose（特别是卷挂载路径）。
- 如 Docker 未运行：
  - Windows：尝试启动 Docker Desktop（`C:\Program Files\Docker\Docker\Docker Desktop.exe` 或 `C:\Program Files\Docker Desktop\Docker Desktop.exe`），轮询 `docker info` 直至就绪或超时。
  - macOS：`open -a "Docker Desktop"` 后轮询。

---

## 3. 配置持久化与数据模型
主进程通过 `moduleConfig` 保存四个模块的配置。必须提供默认值，允许 UI 覆盖。配置写入与读取走统一管理器（示例文件 `src/main/config/`）。

### 3.1 通用结构（JSON Schema）
```json
{
  "$id": "ModuleConfig",
  "type": "object",
  "properties": {
    "dataDir": { "type": "string", "description": "模块数据根目录，默认位于 userData/data/<module>" },
    "ports": { "type": "object", "additionalProperties": { "type": ["string", "number"] } },
    "env": { "type": "object", "additionalProperties": { "type": ["string", "number", "boolean"] } }
  },
  "required": [],
  "additionalProperties": false
}
```

### 3.2 各模块默认值与约束
- Dify：
  - 固定：插件守护与插件相关密钥/端口写死；Web 默认路由 `/apps` 固定。
  - 模板占位：`${DATA_DIR}`、`${DIFY_API_PORT}`、`${DIFY_WEB_PORT}`、`${POSTGRES_PORT}`、`${REDIS_PORT}`、`${WEAVIATE_PORT}`、`${DB_*}`、`${REDIS_PASSWORD}`、`${SECRET_KEY}`、`${STORAGE_TYPE}`。
  - 默认端口建议：API 5001，WEB 5002，PG 5432，REDIS 6379，WEAVIATE 8080。
- RagFlow：
  - 不做容器内 NLTK 预下载，改为宿主挂载 `NLTK_HOST_DIR -> /root/nltk_data`。
  - DB/Redis 默认与官方对齐：`DB_PASSWORD=infini_rag_flow`、`REDIS_PASSWORD=infini_rag_flow`、`DB_NAME=rag_flow`、`MYSQL_USER=root`、传递 `MYSQL_DBNAME`。
  - 通过 `.env` 支持 `DATA_DIR`、`NLTK_HOST_DIR`、`RAGFLOW_WEB_PORT`、`RAGFLOW_API_PORT`。
  - 依赖 ES/OpenSearch/MinIO/Valkey 版本参考“实施方案”。
- n8n：
  - 镜像标签固定写死。
  - 端口与卷可配置。
- OneAPI：
  - `LISTEN_PORT` 可配置；主机绑定地址可配置。
  - 镜像写死；`DB_*` 写死。
- 通用：
  - `DATA_DIR` 可配置；网络名可配置（如 `ai_stack_net`）。

---

## 4. IPC 契约（主进程 <-> 渲染进程）
统一以 `ipcMain.handle` + `ipcRenderer.invoke` 实现，所有响应返回 `{ success: boolean, message?: string, data?: any }`。

- `ai/env/diagnose` -> 环境检测（最小原型）
  - 入参：无
  - 出参：`{ docker: { installed: boolean, running: boolean, compose: 'docker compose'|'docker-compose'|null, version?: string }, node?: string, npm?: string, powershell?: string, issues: string[] }`
- `ai/docker/checkDocker` -> 检查 Docker 安装与运行
  - 入参：无
  - 出参：`{ installed: boolean, running: boolean, version: string }`
- `ai/docker/startDocker` -> 启动 Docker Desktop（视平台）
  - 入参：无
  - 出参：`{ success, message? }`
- `ai/modules/list` -> 列出所有模块
  - 入参：`{ type?: 'basic'|'feature'|'all' }`
  - 出参：`{ items: Array<{ name: string, type: 'basic'|'feature' }> }`
- `ai/module/start`
  - 入参：`{ name: 'dify'|'ragflow'|'n8n'|'oneapi' }`
  - 出参：`{ success, message? }`
- `ai/module/stop`
  - 入参：同上
  - 出参：`{ success, message? }`
- `ai/module/status`
  - 入参：同上
  - 出参：`{ running: boolean, status: 'running'|'stopped'|'error'|'parse_error', ports: Record<string,string>, usedBy?: string[] }`
    - `usedBy`：可选，仅当查询对象为基础服务（basic）时返回其被哪些运行中的功能模块占用（模块名数组）。
- `ai/module/clear`
  - 入参：同上
  - 出参：`{ success, message }`
- `ai/config/get`
  - 入参：无/或 `{ name }`
  - 出参：`{ success, data: moduleConfig | Record<module, moduleConfig> }`
- `ai/config/set`
  - 入参：`{ name, config: ModuleConfig }`
  - 出参：`{ success, message? }`

错误码扩展（可选）：`code` 使用字符串，如 `E_DOCKER_NOT_INSTALLED`、`E_COMPOSE_FAILED`，便于 UI 显示定制文案。
  - `E_IN_USE`：当尝试停止某基础服务时，该服务仍被至少一个运行中的功能模块依赖；应阻止停止。
  - `E_DEP_CYCLE`：在启动流程前检测到依赖图存在有向环，返回并中止启动；`message` 包含环路路径（如 `a -> b -> c -> a`）。

---

## 5. Compose 模板与占位符映射
模板放置在 `docker-compose/*.template.yml`，通过 `src/main/docker/template.ts` 生成。

### 5.1 占位符写法
- `${VAR}`：从变量字典取值，若不存在则报错 `E_VAR_MISSING`（主进程返回 `code` 与缺失项列表）。
- `${VAR:default}`：同上，但若未提供变量，则使用 `default` 字面量作为回退值（不会报错）。
- 路径必须在替换前做 Windows 正斜杠化（`C:\\path\\to` -> `C:/path/to`）。

### 5.2 变量来源与优先级（主进程合并字典）
变量字典由三部分按“后者覆盖前者”的顺序合并：
1. 模块注册表 `registry.byName[module].variables`（如端口、网络名、数据目录等默认变量）
2. 全局配置 `getGlobalConfig()`（如绑定地址 `bindAddress` 等）
3. 进程环境变量 `process.env`

说明：
- 任何非字符串值会被转为字符串写入 YAML。
- 未提供值且无默认（`${VAR}`）将收集到缺失列表并返回错误 `E_VAR_MISSING`。

### 5.3 生成器与合并策略（摘要）
```javascript
function generateComposeFromTemplate(module, mergedConfig) {
  // 1) 读取模板并用 js-yaml 解析为对象
  // 2) 合并注册表 fragment（支持字符串 YAML 与对象），对象深合并、数组覆盖
  // 3) 构建变量字典（registry.variables + global + process.env），执行 `${VAR}` / `${VAR:default}` 替换
  // 4) 校验缺失变量：若存在则返回 { success:false, code:'E_VAR_MISSING', message, data? }
  // 5) dump 为 YAML，输出到 {userData}/docker-compose/<module>.yml
}
```

### 5.4 关键变量映射表示例（片段）
```json
{
  "DATA_DIR": "{userData}/data/<module>",
  "NLTK_HOST_DIR": "{repo}/third_party/nltk_data",
  "DIFY_API_PORT": 5001,
  "DIFY_WEB_PORT": 5002,
  "POSTGRES_PORT": 5432,
  "REDIS_PORT": 6379,
  "WEAVIATE_PORT": 8080,
  "RAGFLOW_WEB_PORT": 7860,
  "RAGFLOW_API_PORT": 7861
}
```

---

## 6. 启停状态机与重试
- 状态：`idle` -> `starting` -> `running` -> `stopping` -> `stopped`；异常进入 `error`。
- `start`: 先 `checkDocker.installed && running`；否则尝试 `startDocker()`；随后 `generateComposeFromTemplate()`；最后 `compose up -d`。
- `stop`: 以生成的 compose 路径 `compose down`；如缺省文件，降级用 label/name 搜索容器并 `docker rm -f`。
- 超时/失败：
  - 启动 Docker 最长 30s；
  - `compose up`/`down` 报错将原始输出回传 UI；
  - `getContainerStatus` 优先 `compose ps -q`，失败回退 label/name 策略。

最小原型阶段的操作覆盖：

- 基础服务（basic）与功能模块（feature）均支持：检查状态、启动、停止、清空缓存后启动。
- “设置模块对外映射端口”通过 `ai/config/set` 写入 `ports` 后再执行 `start` 生效；渲染端需做端口占用预检与冲突提示。

### 6.1 UI 按钮语义（严格依赖处理）

- 启动（Start）：
  - 基础服务模块（basic）：仅启动自身。
  - 功能模块（feature）：先检查自身依赖的基础服务模块是否全部运行；若有未运行则按依赖顺序启动之，待所有依赖 healthy 后再启动自身。
- 停止（Stop）：
  - 基础服务模块（basic）：先检查是否存在正在运行且依赖该基础服务的功能模块；若存在则返回错误并不停止；若不存在则停止自身。
  - 功能模块（feature）：停止自身；随后遍历其依赖的基础服务，判断是否仍被其他运行中的功能模块使用；若无人使用则可选择停止对应基础服务（默认不自动停止，可作为“智能回收”选项）。

上述语义需由主进程实现，并通过 IPC 提供给渲染端；渲染端仅触发动作与展示结果。

#### 6.1.1 全局配置：autoStopUnusedDeps（智能回收）
- 类型：`boolean`，默认值 `false`。
- 含义：当停止一个功能模块时，若开启该开关，将自动停止其依赖的、且当前不再被任何运行中的功能模块占用的基础服务模块。
- 安全性：默认关闭，需用户在“配置中心”勾选启用。关闭时不会触发自动回收，基础服务需手动停止。
- UI：`src/renderer/pages/Home.vue` 的“配置中心”中提供复选框；通过 `ai/config/set` 同步到主进程。

### 6.2 PS1 脚本一致性

- 每个模块（包含基础服务与功能模块）都需提供 `start-<module>.ps1` 与 `stop-<module>.ps1` 供人工/CI 使用。
- PowerShell 脚本的启动/停止逻辑必须与本节 UI 按钮语义保持一致的依赖处理与安全检查。
- UI 不调用 ps1；UI 通过 JS/IPC 直接操作 Docker/Compose。

---

## 7. 日志与错误处理
- 主进程将 `spawn` 的 `stdout/stderr` 追加到模块级 ring buffer（如 2000 行），UI 可拉取最近日志。
- 标准错误码与提示：
  - `E_DOCKER_NOT_INSTALLED`：提示“未安装 Docker，请安装后重试”。
  - `E_DOCKER_NOT_RUNNING`：提示“一键启动 Docker Desktop 或手动启动”。
  - `E_COMPOSE_NOT_FOUND`：提示“未检测到 docker compose 或 docker-compose”。
  - `E_TEMPLATE_MISSING`：模块模板或引用片段缺失。
  - `E_TEMPLATE_GEN_FAILED`：模板生成失败（兜底）。
  - `E_VAR_MISSING`：存在 `${VAR}` 未提供值且无默认；`message` 包含缺失变量列表。
  - `E_COMPOSE_UP_FAILED` / `E_COMPOSE_DOWN_FAILED`。

UI 建议：
- 在 `src/renderer/pages/Home.vue` 中对 `E_TEMPLATE_MISSING`、`E_VAR_MISSING`、`E_RUNTIME` 用 Modal 详细展示错误与命令输出，并提供“一键复制详情”。

---

## 8. 安全与敏感信息
- UI 对敏感字段（如 `SECRET_KEY`、数据库密码）启用掩码显示，支持“显示/隐藏”。
- 主进程存储时不明文写入日志。
- 导出/导入配置时对敏感字段进行脱敏或二次确认。

---

## 9. UI 交互要点（四个独立设置页）
每个模块设置页：
- 显示：运行状态（端口映射）、最近日志。
- 配置：`dataDir` 目录选择、常用端口与变量编辑（带默认值、校验）。
- 操作：启动、停止、清理缓存。
- 校验：端口冲突（本机占用检测）、路径可写检测。
- 全局：网络名、`DATA_DIR` 基础目录等集中设置。

---

## 10. 测试清单（写代码AI必须产出对应自动化/手测脚本）
- 组合命令兼容：仅有 `docker compose` 时、仅有 `docker-compose` 时、两者皆有时。
- Windows 路径卷挂载正确（`C:/...` 形式出现在 yml）。
- RagFlow：不下载 NLTK，正确挂载 `third_party/nltk_data`，容器启动 healthy。
- Dify：全栈模板变量替换正确，容器健康检查通过（api/worker/web 等）。
- `getContainerStatus`：在缺少 compose 文件情况下可通过 label/name 检测到状态。
- 清理缓存：compose 缓存文件删除，`docker rm -f` 回退逻辑可用，数据目录可选清理（危险操作需确认）。
- 环境检测：`ai/env/diagnose` 能准确识别 Docker/Compose、Node/npm/PowerShell 版本与潜在问题列表。
- 模块列表：`ai/modules/list` 能区分 basic/feature，并与 UI 列表一致。

PowerShell 脚本（仅用于人工/CI，不被 UI 调用）：

- 为每个模块提供 `start-<module>.ps1` / `stop-<module>.ps1`，并在 CI 脚本中调用以验证最低可用性；UI 通过 JS/IPC 直接操作 Docker/Compose。

---

## 11. 示例 .env（位于 docker-compose/ 目录）
```env
DATA_DIR=C:/Users/you/AppData/Roaming/dify-n8n-ragflow-oneapi-client/user-data/data
NLTK_HOST_DIR=C:/code/dify-n8n-ragflow-oneapi-client/third_party/nltk_data
RAGFLOW_WEB_PORT=7860
RAGFLOW_API_PORT=7861
```

---

## 12. 代码生成要求
- 主进程：
  - 在 `src/main/docker/index.ts` 实现：
    - `checkDocker()`、`startDocker()`、`startContainer()`、`stopContainer()`、`getContainerStatus()`、`clearModuleCache()`、`listModules()`、`envDiagnose()`。
    - Compose 命令解析与缓存：优先 `docker compose`，回退 `docker-compose`。
  - 在 `src/main/docker/template.ts` 实现模板替换：
    - 路径正斜杠化；各模块占位符替换；输出到 `{userData}/docker-compose/`。
- 渲染进程：
  - 单窗口最小原型：环境检测面板、基础服务列表、功能模块列表与操作区。
  - 后续扩展为四个设置页（Dify、RagFlow、n8n、OneAPI）；统一组件风格；表单校验与保存。
  - 日志面板与状态展示；一键启动 Docker；端口占用预检与风险提示。
- 模板：
  - `docker-compose/*.template.yml` 与 `.env` 示例齐全，对齐“实施方案”的版本矩阵。

编码与模块化（硬性要求）：

- 禁止“上帝类/上帝文件”；主进程与渲染进程均需按模块拆分（如 `src/main/docker/*`, `src/main/config/*`, `src/renderer/modules/*`）。
- 单个代码文件不超过 400 行；如接近限制，必须进一步拆分模块或提炼公共库。
- 保持平台兼容：Windows 10 与 macOS 均需通过；路径/进程/权限差异需在主进程适配层统一处理。

---

## 13. 与《实施方案》的差异/一致性确认
- 一致：RagFlow 不在容器内做 NLTK 预下载；改为宿主挂载，目录固定。
- 一致：n8n 镜像标签写死；OneAPI 端口可配置；Dify 全栈模板位占齐全。
- 待确认（若冲突以本规范为准）：Dify 的 `SECRET_KEY/DB_*` 是否最终对外可配。默认按“可配置但给出默认值”实现，UI 标注“非必要勿改”。

---

## 14. 交付清单（写代码AI应输出）
- 主进程与渲染进程完整代码（含 IPC）。
- 单窗口最小原型（环境检测 + 基础服务/功能模块列表与操作）。
- 4 份 compose 模板与 `.env` 示例。
- 端到端运行脚本与测试用例。
- README：启动指引与常见问题。
- 每模块 `start-<module>.ps1` / `stop-<module>.ps1`（供人工/CI），且在 README 中注明：UI 以 JS/IPC 直接操作，不调用 ps1。

---

以上即完整实现规范。严格按照本文件与《实施方案》实现，即可一次性生成可运行的 AI-Server 桌面应用与容器编排。
