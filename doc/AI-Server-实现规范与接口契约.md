# AI-Server 实现规范与接口契约（交付给代码生成AI）

本规范是本仓库唯一的“实现落地文档”。配合《AI-Server 编排设计与实施方案（权威）》使用，使得只凭这两份文档即可一次性生成完整可运行的代码与模板。

更新时间：2025-08-23
适用平台：Windows 10（主）、macOS（次）

---

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

- `ai/docker/checkDocker` -> 检查 Docker 安装与运行
  - 入参：无
  - 出参：`{ installed: boolean, running: boolean, version: string }`
- `ai/docker/startDocker` -> 启动 Docker Desktop（视平台）
  - 入参：无
  - 出参：`{ success, message? }`
- `ai/module/start`
  - 入参：`{ name: 'dify'|'ragflow'|'n8n'|'oneapi' }`
  - 出参：`{ success, message? }`
- `ai/module/stop`
  - 入参：同上
  - 出参：`{ success, message? }`
- `ai/module/status`
  - 入参：同上
  - 出参：`{ running: boolean, status: 'running'|'stopped'|'error'|'parse_error', ports: Record<string,string> }`
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

---

## 5. Compose 模板与占位符映射
模板放置在 `docker-compose/*.template.yml`，通过 `src/main/docker/template.ts` 生成。

### 5.1 占位符写法
- `${VAR}` 统一由生成器替换。
- 路径必须在替换前做 Windows 正斜杠化（`C:\\path\\to` -> `C:/path/to`）。

### 5.2 变量来源优先级
1. `moduleConfig.env` / `moduleConfig.ports` / `moduleConfig.dataDir`
2. 默认值（`getDefaultModuleConfig(module)`）
3. `.env`（仅用于 compose 引擎需要的外部变量，如 RagFlow 端口/NLTK_HOST_DIR）

### 5.3 生成器算法（伪码）
```
function generateComposeFromTemplate(module, mergedConfig) {
  // 1. 读取模板文本 docker-compose/<module>.template.yml
  // 2. 准备上下文 ctx：
  //    - DATA_DIR: mergedConfig.dataDir 或 {userData}/data/<module>
  //    - PORTS: mergedConfig.ports
  //    - ENV: mergedConfig.env
  //    - NLTK_HOST_DIR: {repo}/third_party/nltk_data （若模块为 ragflow）
  // 3. 对 ctx 中的所有路径执行 windowsPathToPosix()
  // 4. 执行字符串替换生成最终文本
  // 5. 输出到 {userData}/docker-compose/<module>.yml
  // 6. 返回 { success: true, filePath }
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

---

## 7. 日志与错误处理
- 主进程将 `spawn` 的 `stdout/stderr` 追加到模块级 ring buffer（如 2000 行），UI 可拉取最近日志。
- 标准错误码与提示：
  - `E_DOCKER_NOT_INSTALLED`：提示“未安装 Docker，请安装后重试”。
  - `E_DOCKER_NOT_RUNNING`：提示“一键启动 Docker Desktop 或手动启动”。
  - `E_COMPOSE_NOT_FOUND`：提示“未检测到 docker compose 或 docker-compose”。
  - `E_TEMPLATE_GEN_FAILED`：模板生成失败。
  - `E_COMPOSE_UP_FAILED` / `E_COMPOSE_DOWN_FAILED`。

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
    - `checkDocker()`、`startDocker()`、`startContainer()`、`stopContainer()`、`getContainerStatus()`、`clearModuleCache()`。
    - Compose 命令解析与缓存：优先 `docker compose`，回退 `docker-compose`。
  - 在 `src/main/docker/template.ts` 实现模板替换：
    - 路径正斜杠化；各模块占位符替换；输出到 `{userData}/docker-compose/`。
- 渲染进程：
  - 四个设置页（Dify、RagFlow、n8n、OneAPI）；统一组件风格；表单校验与保存。
  - 日志面板与状态展示；一键启动 Docker。
- 模板：
  - `docker-compose/*.template.yml` 与 `.env` 示例齐全，对齐“实施方案”的版本矩阵。

---

## 13. 与《实施方案》的差异/一致性确认
- 一致：RagFlow 不在容器内做 NLTK 预下载；改为宿主挂载，目录固定。
- 一致：n8n 镜像标签写死；OneAPI 端口可配置；Dify 全栈模板位占齐全。
- 待确认（若冲突以本规范为准）：Dify 的 `SECRET_KEY/DB_*` 是否最终对外可配。默认按“可配置但给出默认值”实现，UI 标注“非必要勿改”。

---

## 14. 交付清单（写代码AI应输出）
- 主进程与渲染进程完整代码（含 IPC）。
- 4 份 compose 模板与 `.env` 示例。
- 端到端运行脚本与测试用例。
- README：启动指引与常见问题。

---

以上即完整实现规范。严格按照本文件与《实施方案》实现，即可一次性生成可运行的 AI-Server 桌面应用与容器编排。
