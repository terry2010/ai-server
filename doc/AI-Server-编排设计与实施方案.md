# AI-Server 编排设计与实施方案（权威）

本文件为 AI-Server 在本仓库的唯一权威实施文档，定义统一的容器编排、网络/卷/端口策略、配置与启停算法、跨平台规范及迭代步骤。所有实现与讨论以本文为准。

更新时间：2025-08-23（知识截止：2024-10）

---

### 7.1 RagFlow 版本矩阵（以最新代码为准）

- 功能容器：
  - ragflow: `${RAGFLOW_IMAGE}`（未在 compose 固定；变体示例：`edwardelric233/ragflow:oc9` 用于 CN/GPU）
- 基础服务：
  - 数据库：MySQL `8.0.39`
  - 对象存储：MinIO `RELEASE.2025-06-13T11-33-47Z`
  - 缓存：Valkey `8`（注意：并非 Redis）
  - 检索（均需安装，按 profiles 可分别启用模块复用）：
    - OpenSearch `2.19.1`（镜像：`hub.icert.top/opensearchproject/opensearch:2.19.1`）
    - Elasticsearch `${STACK_VERSION}`（镜像：`elasticsearch:${STACK_VERSION}`）
  - 可选：Infinity `v0.6.0-dev5`

统一建议：如需统一到“统一矩阵”，可将 Valkey 8 视作 Redis 7 的等价替代或改回 Redis 7-alpine；检索层面 OpenSearch 与 Elasticsearch 均需安装与可用，推荐以 OpenSearch 2.19.1 为主、Elasticsearch 8.14.3 为辅（按需切换）。

### 7.2 OneAPI 版本矩阵（以最新代码为准）

- 功能容器：
  - one-api：`justsong/one-api:latest`（建议后续固定到明确 tag 或 digest）
- 基础服务：
  - Redis：`redis:latest`（建议后续固定到 `7.x` 稳定小版本）
  - MySQL：`8.2.0`（与 RagFlow 的 `8.0.39` 存在差异，需仓库层面统一）

### 7.3 n8n 版本矩阵（生产：Postgres + Redis）

- 功能容器：
  - n8n：`n8nio/n8n:1.108.1`
- 基础服务（生产建议）：
  - 数据库：Postgres `16-alpine`
  - 缓存与队列：Redis `7.2-alpine`

说明：采用“生产 Postgres + Redis”方案以获得更好的并发与可扩展性（多实例/多 worker、行级锁、稳定吞吐），不使用最简 SQLite 方案。

### 7.4 Dify 版本矩阵与依赖（Postgres + Redis）

- 功能容器：
  - API：`langgenius/dify-api:1.7.2`
  - Web：`langgenius/dify-web:1.7.2`
- 基础服务：
  - 数据库：Postgres `16`（服务名 `postgres`，容器名 `ai-postgres`）
  - 缓存：Redis `7.2-alpine`（服务名 `redis`，容器名 `ai-redis`）
- 网络与卷：
  - 网络：均加入 `ai-server-net`（external: true）
  - 卷：`ai-server-postgres-data`（Postgres 数据），`ai-server-redis-data`（Redis 数据），`ai-dify-data`（Dify 持久化）
- 端口映射（默认，仅宿主可配）：
  - Dify Web: `127.0.0.1:${DIFY_WEB_PORT:-18090} -> 3000`
  - Dify API: `127.0.0.1:${DIFY_API_PORT:-18091} -> 5001`
- 启动提示：
  - 先启动基础设施：`docker compose -f orchestration/infra/docker-compose.infra.yml up -d postgres redis`
  - 再启动 Dify：`./scripts/module.ps1 -Name dify -Action start -ApiPort 18091`
  - 已启用 `MIGRATION_ENABLED=true`，容器启动时自动执行 Alembic 迁移（等价 `flask db upgrade`）。对已有数据执行增量迁移，正常不丢数据；生产建议先做数据库快照。

#### 7.4.1 UI 启动流与 CORS 配置变更（关键）

- UI 启动链路：`Start(dify)` 会先确保 `postgres`、`redis` 运行并 healthy，然后一次性拉起 `dify-api` 与 `dify-web`（通过解析 feature compose 的 `services` 键实现，不再依赖硬编码）。
- 端口与绑定：
  - Web: `http://{BIND_ADDRESS}:${DIFY_WEB_PORT}`（默认 `127.0.0.1:18090`）
  - API: `http://{BIND_ADDRESS}:${DIFY_API_PORT}`（默认 `127.0.0.1:18091`）
- CORS：
  - `dify-api` 环境变量新增并启用 `CORS_ALLOW_ORIGINS="http://127.0.0.1:${DIFY_WEB_PORT:-18090}"`，允许前端从 Web 端口访问 API。
  - 为兼容/冗余，保留 `WEB_API_CORS_ALLOW_ORIGINS="*"`、`CONSOLE_CORS_ALLOW_ORIGINS="*"`（若上游镜像忽略则不生效）。
  - `dify-web` 指向宿主 API：`CONSOLE_API_URL` 与 `NEXT_PUBLIC_CONSOLE_API_URL` 统一为 `http://127.0.0.1:${DIFY_API_PORT:-18091}`；内部调用使用 `DIFY_API_URL=http://ai-dify-api:5001`。

实现要点：
- 服务映射通用化：`src/main/docker/naming.ts` 的 `servicesForModule(name)` 通过读取“物化后的 feature compose”（`materializeFeatureCompose` 输出）动态解析 `services` 列表，取代先前针对 `dify` 的特判；如解析失败则回退为 `[name]`。
- 注册表变量清理：`src/main/config/registry/dify.json` 统一为 Postgres + Redis 方案，移除 MySQL 风格键，仅保留 `DIFY_WEB_PORT`、`DIFY_API_PORT`、`BIND_ADDRESS` 等与端口/绑定相关的变量，避免混淆。

## 1. 目标与原则

- 以模块为粒度进行持续集成：Dify、RagFlow、n8n、OneAPI 等。
- OneAPI 为必选模块，统一提供上游模型网关（密钥/路由/配额/审计）。
- 区分“基础服务容器（basic）”与“功能容器（feature）”，按需启动、可复用、无引用即回收。
- 使用统一外部网络，固定容器内部端口，用户仅修改宿主机映射端口。
- 保持跨平台一致性（Win10、macOS），尽量使用命名卷，避免宿主机路径差异。
- 旧的 docker-compose 模板不做改动；新方案放入新的编排目录。

---

## 2. 目录结构（新建，不改旧文件）

```
orchestration/
  infra/
    docker-compose.infra.yml        # 仅基础服务：mysql/redis/opensearch|minio 等
    env/infra.example.env           # 基础服务示例 env
  modules/
    dify/docker-compose.feature.yml
    ragflow/docker-compose.feature.yml
    n8n/docker-compose.feature.yml
    oneapi/docker-compose.feature.yml
  common.env                        # 统一端口/网络/卷命名与默认值
```

旧文件保持不变：`docker-compose/*.template.yml`、`doc/system-code/`。

配置注册表位置（新建）：

- 内置注册表（随代码发布）：`src/main/config/registry/*.json`
- 用户覆盖注册表：`%APPDATA%/ai-server/modules/*.json`（Electron：`app.getPath('userData')/modules/`）
- 合并顺序：内置 → 用户覆盖 → 运行时矫正（端口冲突自动建议等）
- 热加载（可选）：监听 `userData/modules/` 文件变更，运行时刷新模块清单

---

## 3. 网络、卷与端口策略

- 网络（必须共享）
  - 统一外部网络：`ai-server-net`（external: true）。
  - 所有基础服务与功能容器均加入该网络，模块间可复用基础服务。

- 卷（共享策略）
  - 共享卷（external: true）：
    - 日志：`ai-server-logs`
    - 基础服务数据：
      - `ai-server-mysql-data`（如选 MySQL）或 `ai-server-postgres-data`
      - `ai-server-redis-data`
      - `ai-server-minio-data`
      - `ai-server-es-data`（或 `ai-server-opensearch-data`）
      - 可选：`ai-server-weaviate-data`
  - 模块私有卷：各模块的缓存/临时/构建数据不共享，留在模块内部。

- 端口映射（关键约定）
  - 容器内部端口固定；用户可配置宿主机映射端口。
  - 默认仅绑定到 127.0.0.1；用户可选改为 0.0.0.0。
  - 推荐默认映射（可在 UI/配置中修改）：
    - MySQL: 127.0.0.1:13306 -> 3306
    - Postgres: 127.0.0.1:15432 -> 5432
    - Redis: 127.0.0.1:16379 -> 6379
    - OpenSearch/Elasticsearch: 127.0.0.1:19200 -> 9200
    - MinIO: 127.0.0.1:19000 -> 9000（API）、127.0.0.1:19001 -> 9001（Console）
    - 各模块 Web/API：为模块分配互不冲突的宿主机端口区段（详见各模块 feature 文件）。

---

## 4. 容器角色与标签

为自动化启停提供可查询的元信息，所有服务统一添加 labels：

- 基础服务容器（infra）
  - `com.ai.role=basic`
  - `com.ai.service=mysql|postgres|redis|minio|es|opensearch|weaviate|...`
  - `com.ai.stack=ai-server`

- 功能容器（各模块）
  - `com.ai.role=feature`
  - `com.ai.module=dify|ragflow|n8n|oneapi|...`
  - `com.ai.requires=mysql,redis`（逗号分隔，声明依赖的基础服务）

---

## 5. 启停算法（在 `src/main/docker/index.ts` 实现）

- 启动模块 X：
  1) 读取模块配置（含 `useExternalDB` 等），计算“基础依赖集合”。
  2) 对每个依赖 `svc`：
     - 若 `useExternal*` 对应服务为 true，则跳过本地基础服务并检查连接参数完整性；
     - 否则检查是否已有运行中的 `basic` 容器（同 service label）。没有则 `docker compose up -d --no-recreate` 拉起；有则复用。
  3) 启动模块 X 的 `feature` 容器（同样使用 `--no-recreate` 幂等启动）。

- 停止模块 X：
  1) 停止该模块所有 `feature` 容器。
  2) 遍历 X 的基础依赖集合：扫描是否仍有其它运行中的 `feature` 容器声明需要该服务（基于 labels）。
     - 若无引用，则停止对应 `basic` 容器；有引用则保留。

- 健康检查与幂等：
  - 基础服务与功能容器统一 healthcheck，实现“等待就绪再启动依赖”。
  - 启动均使用 `up -d --no-recreate`；停止优先 `stop`，必要时再 `down`（避免误删共享网络/卷）。

- 端口占用校验：
  - 启动前检测宿主机端口占用；冲突则提示用户修改，或自动寻找下一个空闲端口（可配置）。

- 运行态识别：
  - 通过 Docker CLI/SDK 依据 labels 过滤容器，实现“无状态实时判断法”（无需持久化引用计数）。

### 5.3 可配置的模块注册与依赖图

- 模块以“声明式”方式注册，主进程在运行时加载注册表生成依赖图：
  - 注册来源：内置 `src/main/config/registry/*.json` + 用户覆盖 `userData/modules/*.json`
  - 字段见“6.1 模块 Schema 定义”
  - 拓扑排序：依据 `dependsOn` 生成启动/停止序列，循环依赖直接报错并指引
  - Profiles：通过 `profiles` 开关实现互斥/可选依赖（如 OpenSearch/Elasticsearch 二选一）
- 启动时序（可配置策略）：
  - `autoStartDeps`（默认 true）：启动功能模块前先确保依赖基础服务已运行并 healthy
  - `healthCheck`（模块内定义）：支持 `tcp`/`http`/`container_healthy`，带重试/超时
  - 端口占用：启动前校验宿主端口，冲突时可按策略 `autoSuggestNextPort`
- 模板渲染：
  - 每个模块可声明 `compose.templateRef` 或内联 `compose.fragment`
  - 渲染变量来源：模块 `variables` + 全局配置（第6章）
  - 组合策略：将所需基础服务与模块片段合并为一次 `docker compose up -d`，或按服务分步 `up`（实现可选）
  - Windows 路径做正斜杠化与转义处理
  - 错误码：模板缺失、变量缺失、循环依赖、端口冲突、健康超时

### 5.4 功能模块首次启动流程（标准）

- 目标：可预测、幂等可重试、可观测、安全。
- 步骤（主进程串行实施）：
  1) 预检 Preflight：`docker/compose` 安装与运行态、CPU/内存/磁盘余量、端口占用、外部依赖连通性（如启用 `useExternalDB/Redis`）。
  2) 镜像准备：按版本矩阵拉取/校验镜像；输出 tag/digest。
  3) 依赖启动：拓扑顺序对基础服务 `up -d --no-recreate` 并等待 healthy；外部依赖跳过本地。
  4) 模块启动：渲染模板与 env，`up -d --no-recreate`。首次可能较慢，UI 给出“首次启动需数分钟”的提示。
  5) 初始化/迁移：数据库迁移、桶/索引/队列创建、必要的种子数据或默认管理员账号（如需要）。
  6) 健康与验证：`tcp/http/container_healthy` 重试 + 关键 API 验证；超时报 `E_HEALTH_TIMEOUT`。
  7) 标记与幂等：在 `userData` 记录 `firstRunDone`、`schemaVersion`、时间戳；下次启动跳过初始化。
  8) 失败与回滚：停止模块容器，必要时回滚初始化痕迹（可选），保留日志与上下文；返回明确错误码。
- 安全：默认 `127.0.0.1` 绑定；生成初始凭据后强提示修改。
- 错误码补充：`E_PREFLIGHT_RESOURCE`、`E_EXT_CONN_FAIL`、`E_IMAGE_PULL`、`E_INIT_SCRIPT`、`E_FIRST_RUN_ABORTED`。

### 5.1 UI 按钮语义（严格依赖处理）

- 启动（Start）：
  - 基础服务模块（basic）：仅启动自身（`up -d --no-recreate`）。
  - 功能模块（feature）：先计算依赖集合，检查依赖是否运行；若未运行则按依赖顺序启动基础服务并等待 healthy，再启动自身。
- 停止（Stop）：
  - 基础服务模块（basic）：先扫描是否存在正在运行且依赖该服务的功能模块（基于 labels `com.ai.requires`）；若存在则返回错误并不停止；否则停止自身。
  - 功能模块（feature）：停止自身；随后遍历其依赖的基础服务，判断是否仍被其他运行中的功能模块使用；若无人使用，可作为“智能回收”选项停止对应基础服务（默认不自动回收）。

说明：上述语义由主进程统一实现，渲染端仅负责触发与显示。该语义需与《实现规范》6.1 小节保持一致。

### 5.2 PowerShell 脚本一致性（供人工/CI 使用）

- 每个模块（包含基础服务与功能模块）都需提供 `start-<module>.ps1` 与 `stop-<module>.ps1`，其依赖处理与安全检查逻辑应与 5.1 完全一致。
- UI 不调用 PowerShell 脚本；UI 通过 JS/IPC 直接操作。 Docker/Compose。ps1 仅供人工/CI 调用，验证与诊断场景使用。

---

## 6. 配置模型（Schema）与注入

- 合并顺序：模块默认 → 用户覆盖 → 运行时校验/矫正。
- 关键项（示例）：
  - 监听端口：`moduleWebPort/moduleApiPort/...`（仅宿主机映射端口可配，容器内端口固定）
  - 外部数据库：`useExternalDB`（true/false）、`dbType`（mysql|postgres）、`dbHost/dbPort/dbUser/dbPassword/dbName`
  - 外部 Redis：`useExternalRedis`（true/false）、`redisHost/redisPort/redisPassword`
  - 绑定地址：`bindAddress`（默认 `127.0.0.1`，可改 `0.0.0.0`）
  - 密钥类：`SECRET_KEY`、`ACCESS_KEY/SECRET_KEY`（MinIO）等
- 注入方式：
  - `src/main/docker/index.ts` 生成 `orchestration/modules/<module>/.env` 与 `orchestration/infra/.env`（或临时 env），并以 `--env-file` 方式传入 compose。
  - Windows 路径在生成 `.env` 前做正斜杠化（沿用既有 `NLTK_HOST_DIR` 策略）。

- UI 形态：
  - 简易模式：暴露常用项（宿主端口、密码、是否使用外部DB/Redis）。
  - 高级模式：可编辑全部键值。

### 6.1 模块 Schema 定义（关键字段）

示例（JSON 结构，非最终约束）：

```json
{
  "name": "mysql",
  "type": "basic",
  "dependsOn": [],
  "profiles": ["default"],
  "image": "mysql:8.0.39",
  "env": { "MYSQL_ROOT_PASSWORD": "${MYSQL_ROOT_PASSWORD:root}" },
  "ports": [{ "container": 3306, "host": "${MYSQL_PORT:13306}", "bind": "${BIND_ADDRESS:127.0.0.1}" }],
  "volumes": [{ "host": "${DATA_DIR}/mysql", "container": "/var/lib/mysql" }],
  "variables": { "DATA_DIR": "${USER_DATA}/data" },
  "healthCheck": { "type": "tcp", "target": "localhost:${MYSQL_PORT:13306}", "interval": 2000, "timeout": 15000, "retries": 20 },
  "compose": { "templateRef": "mysql" },
  "lifecycle": { "preUp": [], "postUp": [], "preDown": [] }
}
```

字段说明：

- `name`、`type`：模块标识与角色（`basic|feature`）
- `dependsOn`：依赖模块名数组；支持通过 `profiles` 互斥选择
- `profiles`：场景开关（如 `opensearch` | `elasticsearch`）
- `image/env/volumes/ports`：容器要素（容器内端口固定；仅宿主映射端口可配）
- `variables`：模板变量，允许默认值 `${VAR:default}`，最终与全局配置合并
- `healthCheck`：`tcp`/`http`/`container_healthy`，包含 `interval/timeout/retries`
- `compose`：引用命名模板 `templateRef` 或提供 `fragment`
- `lifecycle`：预留钩子，执行简单命令或校验（不建议复杂脚本）

---

## 7. 版本矩阵（统一建议）

为避免同一服务多版本并存，建议在新编排中固定小版本（以下为本项目确认的稳定版本）：

- MySQL：`8.4.6`
- Postgres：`16-alpine`
- Redis：`7.2-alpine`
- OpenSearch：`2.19.1`
- Elasticsearch（如选 ES）：`8.14.3`
- MinIO：`RELEASE.2025-06-13T11-33-47Z`
- 应用镜像：
  - Dify：`langgenius/dify-api:1.7.2`、`langgenius/dify-web:1.7.2`
  - n8n：`n8nio/n8n:1.108.1`
  - RagFlow：`infiniflow/ragflow:v0.20.3`
  - OneAPI：`justsong/one-api:v0.6.11-preview.7`

备注：`doc/system-code/` 下的 compose 仍保留历史版本快照，不随本矩阵自动变更；后续编排以本矩阵为准。

选型方法（推荐流程）：
- 优先参考官方发行说明与兼容矩阵（DB/搜索/对象存储与依赖客户端版本匹配）。
- 遵循“主版本稳定 + 次版本固定 + 补丁可滚动”的策略（例：`16-alpine`、`8.0.39`）。
- 查验安全公告（CVE）与重大变更（Breaking Changes）。
- 在本地/CI 以最小 E2E 场景验证健康检查与冷启动数据迁移。
- 如需更强可复现性，可在生产使用镜像 digest 锁定（`image: repo:tag@sha256:...`）。

应用镜像（补充说明）：以上为定稿版本，后续仅在安全/兼容性评估后小幅滚动。

---

### 7.x 各系统最新代码版本快照（来源：`doc/system-code/`）

以下为当前仓库 `doc/system-code/` 目录下 docker-compose 文件所示的“实际使用版本快照”，用于校准版本矩阵与后续编排对齐：

- RagFlow（`doc/system-code/ragflow/docker/`）
  - 功能容器：
    - `ragflow`: `${RAGFLOW_IMAGE}`（未在 compose 明确，GPU/CN 变体示例：`edwardelric233/ragflow:oc9`）
  - 基础服务：
    - MySQL: `mysql:8.0.39`（`docker-compose-base.yml`）
    - 对象存储: `quay.io/minio/minio:RELEASE.2025-06-13T11-33-47Z`
    - 缓存: `valkey/valkey:8`（注意：为 Valkey 而非 Redis）
    - 检索：
      - OpenSearch: `hub.icert.top/opensearchproject/opensearch:2.19.1`（profiles: opensearch）
      - 或 Elasticsearch: `elasticsearch:${STACK_VERSION}`（profiles: elasticsearch，版本取自环境变量）
    - Infinity: `infiniflow/infinity:v0.6.0-dev5`（可选 profiles: infinity）

- OneAPI（`doc/system-code/one-api/docker-compose.yml`）
  - 功能容器：
    - `justsong/one-api:latest`
  - 基础服务：
    - Redis: `redis:latest`
    - MySQL: `mysql:8.2.0`

- n8n（`doc/system-code/n8n/docker-compose.yml`）
  - 功能容器：
    - n8n：`n8nio/n8n:1.108.1`
  - 基础服务：
    - Postgres：`postgres:16-alpine`
    - Redis：`redis:7.2-alpine`

对齐策略：
- 版本矩阵在无冲突前提下以本快照为基准优先对齐；如需统一为更稳定/安全的小版本，将在提交前于此节注明差异与理由。

---

## 8. 跨平台注意事项（Win10 / macOS）

- 优先使用命名卷（external）持久化数据，减少宿主路径差异与权限问题。
- 如必须绑定宿主目录（如 NLTK/模型），在 `.env` 里以绝对路径配置，生成时做正斜杠化。
- Docker Desktop：
  - Win10 建议启用 WSL2；确认共享磁盘权限。
- 健康检查尽量使用通用命令（wget/curl/TCP 探测），减少 shell 差异。

---

## 9. 安全与可观测性

- 绑定地址默认 `127.0.0.1`，避免默认对局域网暴露；若用户切换为 `0.0.0.0`，UI 给出风险提示。
- Redis 必须设置 `requirepass`；DB 默认强口令（或首次随机生成并持久化到用户配置目录）。
- 日志统一挂载到 `ai-server-logs`，便于排障与跨模块分析（见下节目录结构）。
- 可选：在设置页提供“基础服务状态”面板，列出运行中的基础服务与被哪些模块引用，并支持“一键回收未被引用的基础服务”。

### 9.1 日志目录结构与挂载规范

为避免日志混杂，`ai-server-logs` 下采用分门别类的目录结构：

```
ai-server-logs/
  basic/                      # 基础服务日志
    mysql/
    postgres/
    redis/
    minio/
    es/                       # 或 opensearch/
    weaviate/
  modules/                    # 功能模块日志
    dify/
      api/
      web/
      worker/
      worker_beat/
      plugin-daemon/
    ragflow/
    n8n/
    oneapi/
```

挂载建议：
- 在各 compose 中将对应服务的日志路径挂载到上述子目录（如 `/var/log/mysql` -> `ai-server-logs/basic/mysql`）。
- 若服务只输出到 stdout/stderr，可通过 docker logging driver 或 sidecar 收集后落盘到相应子目录。
- 保留 7~14 天轮转策略（按模块配置），避免日志无限增长。

---

## 10. 实施步骤（迭代计划）

- 阶段 0（Electron 单窗口最小原型）
  1) 交付一个最小化原型（单窗口），包含：
     - 环境检测面板：检测 Docker/Compose、Docker Desktop 可启动、Node/npm/PowerShell 版本、端口可用性抽检。
     - 基础服务模块列表（basic）：设置映射端口、查看运行状态、启动、停止、清空缓存后启动。
     - 功能模块列表（feature）：设置映射端口、查看运行状态、启动、停止、清空缓存后启动。
  2) 约束：UI 以 JS/IPC 直接操作 Docker/Compose，禁止调用 PowerShell 脚本。
  3) 交付标准：上述操作在 Win10 本机可用，有基础日志/错误提示。

- 阶段 1（最小可用）
  1) 新建 `orchestration/` 目录骨架与占位 compose/env（不改旧 compose）。
  2) 为 infra 与 modules/* 的服务补齐 labels、网络 `ai-server-net`、共享卷与固定容器端口。
  3) 在 `src/main/docker/index.ts` 实现：
     - 依赖计算（含外部DB/Redis开关）
     - 按需拉起基础服务与幂等启动（`up -d --no-recreate`）
     - 停止模块并回收无引用的基础服务
     - 宿主端口占用校验
  4) 提供简易模式配置 UI：宿主端口、密码、外部DB开关。

- 阶段 2（增强）
  1) 高级模式配置 UI（完整 Schema + 校验）。
  2) 基础服务状态面板（显示引用关系、回收未引用）。
  3) 版本矩阵定稿并在 orchestration 中全面对齐。

- 阶段 3（优化与文档）
  1) 增加一键导出连接串（MySQL/Redis/ES/MinIO）。
  2) 支持动态端口自动分配策略（端口冲突时自动选择空闲端口）。
  3) 扩展更多模块的 feature 文件与预设。

开发约束（适用于全阶段）：

- UI 必须通过 JS/IPC 直接操作 Docker/Compose，不得在渲染进程中调用 PowerShell 脚本。
- 每完成一个系统模块（basic/feature），需在仓库新增 `start-<module>.ps1`、`stop-<module>.ps1` 供人工/CI 使用；但 UI 不调用这些脚本。

---

## 11. 测试清单

- 启动/停止顺序：A → B、B → A、仅 A、仅 B，基础服务复用与回收符合预期。
- 外部DB/Redis：勾选后跳过本地服务启动，模块连接外部实例成功。
- 端口：默认 127.0.0.1 绑定；切换 0.0.0.0 后可从局域网访问。
- Win10/mac：命名卷持久化，路径挂载（如有）无报错；健康检查通过。
- 日志：各模块与基础服务日志落在 `ai-server-logs`。

- 首次启动：
  - 预检失败路径（资源不足/端口冲突/外部依赖不可达）错误码准确
  - 镜像拉取失败处理与重试提示
  - 初始化/迁移失败可回滚且日志可见
  - 标记 `firstRunDone` 后二次启动跳过初始化且可用

---

## 12. 术语与约定

- “基础服务（basic）”：数据库、缓存、向量库、对象存储、检索引擎等可被多个模块共享的服务。
- “功能容器（feature）”：Dify/RagFlow/n8n/OneAPI 等模块自身的业务容器。
- `ai-server-net`：统一外部网络名。
- `ai-server-logs`、`ai-server-<svc>-data`：统一命名卷，external。

---

## 13. 开发与验收流程（模块级）

本节用于指导每个功能模块（feature）与基础服务（basic）的增量开发、联调与验收。统一以 PowerShell 脚本在 Win10 环境验证启停与清理，确保工程外的运行一致性。

### 13.1 脚本规范（Win10 PowerShell）

- 统一调度脚本：`scripts/module.ps1`
  - 用法：`./scripts/module.ps1 -Name <ModuleName> -Action start|stop|status|clear`
  - 行为：
    - `start`：按第5章启停算法，触发依赖启动与模块启动（可调用主进程 CLI 或直接 docker compose 命令）
    - `stop`：停止模块（含保护基础服务）
    - `status`：打印容器状态、端口、健康信息
    - `clear`：清除模块所有数据（包含数据库/对象存储/索引/卷与宿主数据目录）
- 模块级脚本目录：`scripts/modules/<module>/`
  - `start.ps1`、`stop.ps1`、`status.ps1`、`clear-data.ps1`（供 `module.ps1` 调用）
  - 所有脚本必须可独立运行并在失败时返回非零退出码
  - 清理脚本须带二次确认或 `-Force` 参数

注意：渲染进程不得调用 PS1；PS1 脚本用于开发/验收/CI。应用内启停仍由主进程 JS 实现。

### 13.2 通用开发流程（每个模块）

1) 设计阶段
   - 在 `src/main/config/registry/` 填写模块 JSON：`name/type/dependsOn/ports/variables/healthCheck/compose` 等
   - 明确外部依赖（如 `useExternalDB/Redis`）与默认端口
2) 后端实现
   - 在 `src/main/docker/template.ts` 增加模板渲染片段
   - 在 `src/main/docker/index.ts` 扩展启停逻辑与健康等待
   - 在 `src/shared/ipc-contract.ts` 补充必要字段
3) 前端实现
   - 列表项展示、端口设置表单、首次启动向导与日志入口
4) 脚本落地
   - 创建 `scripts/modules/<module>/start.ps1|stop.ps1|status.ps1|clear-data.ps1`
   - 在 `scripts/module.ps1` 中注册 `<module>` 分支
5) 联调与验收前预检
   - 通过 `./scripts/module.ps1 -Name <module> -Action start` 启动
   - 观察日志、健康探测；若首次启动，完成初始化/迁移

### 13.3 模块验收流程（Checklist）

- 配置与注册表
  - 注册表 JSON 校验通过；依赖拓扑无环
  - 端口默认绑定 127.0.0.1，可改为 0.0.0.0
- 启停链路
  - `./scripts/module.ps1 -Name <module> -Action start` 成功，健康检查通过
  - `./scripts/module.ps1 -Name <module> -Action stop` 成功，基础服务保护生效
  - `./scripts/module.ps1 -Name <module> -Action status` 输出正确
- 首次启动
  - 预检/镜像拉取/初始化/健康检查链路可观测、可重试、错误码正确
  - `firstRunDone` 标记正确，二次启动跳过初始化
- 清除数据（强制要求）
  - `./scripts/module.ps1 -Name <module> -Action clear -Force` 清理容器、命名卷、宿主数据目录、数据库/索引/对象存储数据
  - 清理后再次 `start` 能干净拉起且成功初始化
- UI 验收
  - 模块在列表正确展示，可进行 Start/Stop/Status/清理数据操作（清理为高级操作，需要确认）

### 13.4 典型模块附加项

- RagFlow：
  - 需要 MySQL/对象存储（MinIO）与检索（ES/OS 二选一）；清理脚本应额外删除对应桶与索引
- n8n：
  - 生产使用 Postgres + Redis；清理脚本需删除 Postgres 数据卷与 Redis 缓存
- OneAPI：
  - 清理脚本需清除数据库与默认密钥（若生成），并提示用户重新配置
- Dify：
  - 多容器；清理需覆盖 api/web/worker 等相关卷

---

## 附录A：容器与版本总览（定稿）

为便于统一管理与对齐，下列为“本项目最终确认”的容器与版本清单（与“7. 版本矩阵（统一建议）”一致）：

- 基础服务（infra）：
  - MySQL：`mysql:8.4.6`
  - Postgres：`postgres:16-alpine`
  - Redis：`redis:7.2-alpine`
  - Valkey（RagFlow 用）：`valkey/valkey:8`
  - OpenSearch：`opensearchproject/opensearch:2.19.1`
  - Elasticsearch：`elasticsearch:8.14.3`
  - MinIO：`quay.io/minio/minio:RELEASE.2025-06-13T11-33-47Z`
  - Weaviate（Dify 可选）：`semitechnologies/weaviate:1.19.0`

- 应用/模块（feature）：
  - Dify：
    - API：`langgenius/dify-api:1.7.2`
    - Web：`langgenius/dify-web:1.7.2`
    - 其他进程（worker/worker_beat/plugin-daemon）：随 Dify 版本一致
  - RagFlow：`infiniflow/ragflow:v0.20.3`
  - n8n：`n8nio/n8n:1.108.1`（生产：Postgres + Redis）
  - OneAPI：`justsong/one-api:v0.6.11-preview.7`（必选模块）

- 可选/附加：
  - Infinity（实验性）：`infiniflow/infinity:v0.6.0-dev5`
  - nginx：`latest`
  - ubuntu/squid：`latest`

说明：`doc/system-code/` 目录中的 docker-compose 文件记录的是“历史/当前仓库快照”，可能与本清单存在差异；以本清单与第 7 章矩阵为最终对齐依据。

---

## 13. 变更记录

- 2025-08-22：首次创建文档，确定统一网络/卷/端口策略与启停算法，落地新目录编排与迭代计划。
