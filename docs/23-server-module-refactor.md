# 服务端模块重组方案与完整迁移表

> 2026-10-08 更新 · 以当前工作区为准：迁移前 `server/` 根层共有 **123 个 `.mjs` 文件**，包括被忽略的本机配置 `provider.local.mjs`。原表覆盖90个，本次补齐33个；**2个保留原位、121个已移动**。
> 状态：**目录迁移已执行。** 本文是 [架构评审第9.6节](21-architecture-review.md#96-服务端模块重组已执行--2026-10-08) 的执行记录。文件名保持不变，近期未提交的修复和新增文件同样属于迁移基线。

## 1. 职责与数量

下表按目标目录互斥计数，每个文件只计一次，合计123个。旧表中重复计入解析worker及未覆盖新增模块的问题已消除。不沿用旧的4863行、312处import等改写量估算，实施时按当时源码清点。

| 目标目录（相对 `server/`） | 文件数 | 职责 |
| --- | ---: | --- |
| `根层` | 2 | 组装入口与 SQLite 权威层 |
| `core` | 7 | 校验、能力诊断、认证、日志及存储状态 |
| `core/backups` | 3 | 完整备份/恢复、备份路由和业务 JSON 导出 |
| `ai` | 8 | 模型调用、转写契约、语音探测及本机配置 |
| `ai/web` | 4 | 搜索、网页正文读取、网络传输与搜索简报 |
| `retrieval` | 3 | 混合检索、范围与相关性 |
| `retrieval/index` | 4 | 索引迁移、切换、校验与托管 |
| `jobs` | 4 | 文件/语音/要事作业入口及 worker 状态 |
| `jobs/workers` | 2 | 独立进程入口 |
| `domain/notes` | 5 | 分类、待办、图文归纳输入 |
| `domain/events` | 8 | 要事生命周期、图片、关联、保存与复核 |
| `domain/library` | 11 | 资料副本、解析调度、元数据、筛选与电脑文件映射 |
| `domain/memory` | 8 | 长期记忆生命周期、冲突、来源与人工确认 |
| `domain/accounting` | 9 | 记账、导入、核对、OCR、分类、统计与提醒设置 |
| `domain/shared` | 1 | 跨业务对象的正文/转写只读视图 |
| `agent` | 12 | 会话、上下文、工具、成果取材与输出 |
| `agent/research` | 18 | 调研图、证据、预算、检查点、接力与候选 |
| `pet` | 2 | 小九陪伴与提醒聚合 |
| `pet/supervision` | 12 | 监督任务、证据、计时、日历、反馈与复盘 |
| **合计** | **123** | 不含计划新建的一致性说明、未来独立协议模块或 Electron 工程 |

## 2. 目标结构与归属边界

```text
server/
├── index.mjs                 # 保留位置；后续再拆路由组装
├── store.mjs                 # 保留位置；SQLite 权威数据层
├── core/
│   └── backups/
├── consistency/              # 新建说明目录；不在本次123文件计数内
├── ai/
│   └── web/
├── retrieval/
│   └── index/
├── jobs/
│   └── workers/
├── domain/
│   ├── notes/
│   ├── events/
│   ├── library/
│   ├── memory/
│   ├── accounting/
│   └── shared/
├── agent/
│   └── research/
└── pet/
    └── supervision/
```

本轮沿用原90项的目录决策。对新增或容易混淆的模块，归属依据如下：

- `ai-context.mjs` → `core/`：它是日志关联元数据的 AsyncLocalStorage，不是搭子会话上下文；与 `ai-log.mjs` 同层。
- `source-content.mjs` → `domain/shared/`：提供记录/转写等业务内容的只读视图，供会话、检索和监督复用；不放入无业务语义的core，也不归某一种模型供应商。
- `data-export.mjs` → `core/backups/`：与数据导出/备份管理相邻，但保留“JSON业务导出不等于完整恢复包”的区别。
- `worker-status.mjs` → `jobs/`；`local-audio-probe.mjs` → `ai/`：分别诊断任务进程状态和本地语音能力。
- `artifact-context.mjs`、`artifact-memories.mjs`、`work-task-context.mjs` → `agent/`：负责生成前的来源/话题组装；记忆权威状态仍归domain/memory，监督生命周期仍归pet/supervision。
- `research-*` → `agent/research/`：包括模型费用、搜索费用、执行计时和来源证据。它们是调研业务约束，不因pi-agent接管供应商适配而交出确认、预算或持久化职责。
- `public-page.mjs`、`web-transport.mjs` → `ai/web/`：与既有搜索接入同处，不再为调研复制一套网页读取器。
- 新增8个 `accounting-*` → `domain/accounting/`：维护已有完整记账闭环，不借目录重组扩展产品功能。

这是文件归属整理，不声称现有依赖已完全单向化；本次不同时重写跨域调用、数据库结构或业务接口。

## 3. 完整迁移映射（123项）

迁移前路径和目标路径均相对 `server/`。**补入**表示原90项表中遗漏，不表示本轮新开发代码；表内所有“移动”均已执行，可按旧文件名查找新位置。

| # | 迁移前路径 | 当前路径 | 操作 / 来源 |
| --- | --- | --- | --- |
| 1 | `index.mjs` | `index.mjs` | 保留原位 |
| 2 | `store.mjs` | `store.mjs` | 保留原位 |
| 3 | `ai-context.mjs` | `core/ai-context.mjs` | 移动 · 补入 |
| 4 | `ai-log.mjs` | `core/ai-log.mjs` | 移动 · 原表已有 |
| 5 | `background-jobs.mjs` | `core/background-jobs.mjs` | 移动 · 原表已有 |
| 6 | `capabilities.mjs` | `core/capabilities.mjs` | 移动 · 原表已有 |
| 7 | `device-auth.mjs` | `core/device-auth.mjs` | 移动 · 原表已有 |
| 8 | `storage-status.mjs` | `core/storage-status.mjs` | 移动 · 补入 |
| 9 | `validation.mjs` | `core/validation.mjs` | 移动 · 原表已有 |
| 10 | `backup-routes.mjs` | `core/backups/backup-routes.mjs` | 移动 · 原表已有 |
| 11 | `backups.mjs` | `core/backups/backups.mjs` | 移动 · 原表已有 |
| 12 | `data-export.mjs` | `core/backups/data-export.mjs` | 移动 · 补入 |
| 13 | `embedding-contract.mjs` | `ai/embedding-contract.mjs` | 移动 · 原表已有 |
| 14 | `engine.mjs` | `ai/engine.mjs` | 移动 · 原表已有 |
| 15 | `local-asr.mjs` | `ai/local-asr.mjs` | 移动 · 原表已有 |
| 16 | `local-audio-probe.mjs` | `ai/local-audio-probe.mjs` | 移动 · 补入 |
| 17 | `long-summary.mjs` | `ai/long-summary.mjs` | 移动 · 原表已有 |
| 18 | `model-completion.mjs` | `ai/model-completion.mjs` | 移动 · 原表已有 |
| 19 | `provider.local.mjs` | `ai/provider.local.mjs` | 本机配置迁移，禁止入库 |
| 20 | `transcripts.mjs` | `ai/transcripts.mjs` | 移动 · 原表已有 |
| 21 | `public-page.mjs` | `ai/web/public-page.mjs` | 移动 · 补入 |
| 22 | `search-brief.mjs` | `ai/web/search-brief.mjs` | 移动 · 原表已有 |
| 23 | `web-search.mjs` | `ai/web/web-search.mjs` | 移动 · 原表已有 |
| 24 | `web-transport.mjs` | `ai/web/web-transport.mjs` | 移动 · 补入 |
| 25 | `retrieval-relevance.mjs` | `retrieval/retrieval-relevance.mjs` | 移动 · 原表已有 |
| 26 | `retrieval-scope.mjs` | `retrieval/retrieval-scope.mjs` | 移动 · 原表已有 |
| 27 | `retrieval.mjs` | `retrieval/retrieval.mjs` | 移动 · 原表已有 |
| 28 | `index-migration.mjs` | `retrieval/index/index-migration.mjs` | 移动 · 原表已有 |
| 29 | `index-switch.mjs` | `retrieval/index/index-switch.mjs` | 移动 · 原表已有 |
| 30 | `index-verification.mjs` | `retrieval/index/index-verification.mjs` | 移动 · 原表已有 |
| 31 | `managed-index.mjs` | `retrieval/index/managed-index.mjs` | 移动 · 原表已有 |
| 32 | `audio-jobs.mjs` | `jobs/audio-jobs.mjs` | 移动 · 原表已有 |
| 33 | `event-jobs.mjs` | `jobs/event-jobs.mjs` | 移动 · 原表已有 |
| 34 | `file-jobs.mjs` | `jobs/file-jobs.mjs` | 移动 · 原表已有 |
| 35 | `worker-status.mjs` | `jobs/worker-status.mjs` | 移动 · 补入 |
| 36 | `file-worker.mjs` | `jobs/workers/file-worker.mjs` | 移动 · 原表已有 |
| 37 | `library-parse-worker.mjs` | `jobs/workers/library-parse-worker.mjs` | 移动 · 原表已有 |
| 38 | `categories.mjs` | `domain/notes/categories.mjs` | 移动 · 原表已有 |
| 39 | `classification.mjs` | `domain/notes/classification.mjs` | 移动 · 原表已有 |
| 40 | `note-summary-images.mjs` | `domain/notes/note-summary-images.mjs` | 移动 · 补入 |
| 41 | `todo-days.mjs` | `domain/notes/todo-days.mjs` | 移动 · 原表已有 |
| 42 | `todo-supervision.mjs` | `domain/notes/todo-supervision.mjs` | 移动 · 原表已有 |
| 43 | `event-draft.mjs` | `domain/events/event-draft.mjs` | 移动 · 原表已有 |
| 44 | `event-images.mjs` | `domain/events/event-images.mjs` | 移动 · 原表已有 |
| 45 | `event-lifecycle.mjs` | `domain/events/event-lifecycle.mjs` | 移动 · 原表已有 |
| 46 | `event-operation.mjs` | `domain/events/event-operation.mjs` | 移动 · 原表已有 |
| 47 | `event-relations.mjs` | `domain/events/event-relations.mjs` | 移动 · 原表已有 |
| 48 | `event-review-context.mjs` | `domain/events/event-review-context.mjs` | 移动 · 原表已有 |
| 49 | `event-save.mjs` | `domain/events/event-save.mjs` | 移动 · 补入 |
| 50 | `events.mjs` | `domain/events/events.mjs` | 移动 · 原表已有 |
| 51 | `computer-files.mjs` | `domain/library/computer-files.mjs` | 移动 · 原表已有 |
| 52 | `library-decisions.mjs` | `domain/library/library-decisions.mjs` | 移动 · 原表已有 |
| 53 | `library-extract.mjs` | `domain/library/library-extract.mjs` | 移动 · 原表已有 |
| 54 | `library-filters.mjs` | `domain/library/library-filters.mjs` | 移动 · 原表已有 |
| 55 | `library-index-state.mjs` | `domain/library/library-index-state.mjs` | 移动 · 原表已有 |
| 56 | `library-job-state.mjs` | `domain/library/library-job-state.mjs` | 移动 · 原表已有 |
| 57 | `library-members.mjs` | `domain/library/library-members.mjs` | 移动 · 原表已有 |
| 58 | `library-metadata.mjs` | `domain/library/library-metadata.mjs` | 移动 · 原表已有 |
| 59 | `library-parser.mjs` | `domain/library/library-parser.mjs` | 移动 · 原表已有 |
| 60 | `library-task-links.mjs` | `domain/library/library-task-links.mjs` | 移动 · 原表已有 |
| 61 | `library.mjs` | `domain/library/library.mjs` | 移动 · 原表已有 |
| 62 | `memory-conflicts.mjs` | `domain/memory/memory-conflicts.mjs` | 移动 · 原表已有 |
| 63 | `memory-lifecycle.mjs` | `domain/memory/memory-lifecycle.mjs` | 移动 · 原表已有 |
| 64 | `memory-operation.mjs` | `domain/memory/memory-operation.mjs` | 移动 · 原表已有 |
| 65 | `memory-output.mjs` | `domain/memory/memory-output.mjs` | 移动 · 原表已有 |
| 66 | `memory-review.mjs` | `domain/memory/memory-review.mjs` | 移动 · 原表已有 |
| 67 | `memory-scope.mjs` | `domain/memory/memory-scope.mjs` | 移动 · 原表已有 |
| 68 | `memory-source.mjs` | `domain/memory/memory-source.mjs` | 移动 · 原表已有 |
| 69 | `memory-state.mjs` | `domain/memory/memory-state.mjs` | 移动 · 原表已有 |
| 70 | `accounting-classification.mjs` | `domain/accounting/accounting-classification.mjs` | 移动 · 补入 |
| 71 | `accounting-import-parser.mjs` | `domain/accounting/accounting-import-parser.mjs` | 移动 · 补入 |
| 72 | `accounting-import-review.mjs` | `domain/accounting/accounting-import-review.mjs` | 移动 · 补入 |
| 73 | `accounting-imports.mjs` | `domain/accounting/accounting-imports.mjs` | 移动 · 补入 |
| 74 | `accounting-ocr.mjs` | `domain/accounting/accounting-ocr.mjs` | 移动 · 补入 |
| 75 | `accounting-settings.mjs` | `domain/accounting/accounting-settings.mjs` | 移动 · 补入 |
| 76 | `accounting-statistics.mjs` | `domain/accounting/accounting-statistics.mjs` | 移动 · 补入 |
| 77 | `accounting-transactions.mjs` | `domain/accounting/accounting-transactions.mjs` | 移动 · 补入 |
| 78 | `accounting.mjs` | `domain/accounting/accounting.mjs` | 移动 · 原表已有 |
| 79 | `source-content.mjs` | `domain/shared/source-content.mjs` | 移动 · 补入 |
| 80 | `artifact-context.mjs` | `agent/artifact-context.mjs` | 移动 · 补入 |
| 81 | `artifact-memories.mjs` | `agent/artifact-memories.mjs` | 移动 · 补入 |
| 82 | `artifact-output.mjs` | `agent/artifact-output.mjs` | 移动 · 原表已有 |
| 83 | `context-compression.mjs` | `agent/context-compression.mjs` | 移动 · 原表已有 |
| 84 | `conversation-requests.mjs` | `agent/conversation-requests.mjs` | 移动 · 原表已有 |
| 85 | `conversation-scope.mjs` | `agent/conversation-scope.mjs` | 移动 · 原表已有 |
| 86 | `conversation-source-excerpt.mjs` | `agent/conversation-source-excerpt.mjs` | 移动 · 补入 |
| 87 | `conversation-source-state.mjs` | `agent/conversation-source-state.mjs` | 移动 · 补入 |
| 88 | `source-threads.mjs` | `agent/source-threads.mjs` | 移动 · 原表已有 |
| 89 | `task-tools.mjs` | `agent/task-tools.mjs` | 移动 · 原表已有 |
| 90 | `thread-context.mjs` | `agent/thread-context.mjs` | 移动 · 原表已有 |
| 91 | `work-task-context.mjs` | `agent/work-task-context.mjs` | 移动 · 补入 |
| 92 | `research-approval.mjs` | `agent/research/research-approval.mjs` | 移动 · 原表已有 |
| 93 | `research-budget.mjs` | `agent/research/research-budget.mjs` | 移动 · 原表已有 |
| 94 | `research-candidates.mjs` | `agent/research/research-candidates.mjs` | 移动 · 补入 |
| 95 | `research-checkpoints.mjs` | `agent/research/research-checkpoints.mjs` | 移动 · 原表已有 |
| 96 | `research-context.mjs` | `agent/research/research-context.mjs` | 移动 · 补入 |
| 97 | `research-contract.mjs` | `agent/research/research-contract.mjs` | 移动 · 原表已有 |
| 98 | `research-evidence-history.mjs` | `agent/research/research-evidence-history.mjs` | 移动 · 补入 |
| 99 | `research-evidence.mjs` | `agent/research/research-evidence.mjs` | 移动 · 补入 |
| 100 | `research-execution-clock.mjs` | `agent/research/research-execution-clock.mjs` | 移动 · 补入 |
| 101 | `research-graph.mjs` | `agent/research/research-graph.mjs` | 移动 · 原表已有 |
| 102 | `research-jobs.mjs` | `agent/research/research-jobs.mjs` | 移动 · 原表已有 |
| 103 | `research-limits.mjs` | `agent/research/research-limits.mjs` | 移动 · 补入 |
| 104 | `research-model.mjs` | `agent/research/research-model.mjs` | 移动 · 原表已有 |
| 105 | `research-pricing.mjs` | `agent/research/research-pricing.mjs` | 移动 · 原表已有 |
| 106 | `research-retrieval.mjs` | `agent/research/research-retrieval.mjs` | 移动 · 补入 |
| 107 | `research-search-pricing.mjs` | `agent/research/research-search-pricing.mjs` | 移动 · 补入 |
| 108 | `research-tasks.mjs` | `agent/research/research-tasks.mjs` | 移动 · 原表已有 |
| 109 | `research-web.mjs` | `agent/research/research-web.mjs` | 移动 · 补入 |
| 110 | `pet-chat.mjs` | `pet/pet-chat.mjs` | 移动 · 原表已有 |
| 111 | `pet-reminders.mjs` | `pet/pet-reminders.mjs` | 移动 · 原表已有 |
| 112 | `supervision-calendar.mjs` | `pet/supervision/supervision-calendar.mjs` | 移动 · 原表已有 |
| 113 | `supervision-conditions.mjs` | `pet/supervision/supervision-conditions.mjs` | 移动 · 原表已有 |
| 114 | `supervision-evidence-history.mjs` | `pet/supervision/supervision-evidence-history.mjs` | 移动 · 原表已有 |
| 115 | `supervision-evidence.mjs` | `pet/supervision/supervision-evidence.mjs` | 移动 · 原表已有 |
| 116 | `supervision-feedback.mjs` | `pet/supervision/supervision-feedback.mjs` | 移动 · 原表已有 |
| 117 | `supervision-jobs.mjs` | `pet/supervision/supervision-jobs.mjs` | 移动 · 原表已有 |
| 118 | `supervision-recap.mjs` | `pet/supervision/supervision-recap.mjs` | 移动 · 原表已有 |
| 119 | `supervision-runs.mjs` | `pet/supervision/supervision-runs.mjs` | 移动 · 原表已有 |
| 120 | `supervision-schedule.mjs` | `pet/supervision/supervision-schedule.mjs` | 移动 · 原表已有 |
| 121 | `supervision-source-reading.mjs` | `pet/supervision/supervision-source-reading.mjs` | 移动 · 补入 |
| 122 | `supervision-timer.mjs` | `pet/supervision/supervision-timer.mjs` | 移动 · 原表已有 |
| 123 | `work-tasks.mjs` | `pet/supervision/work-tasks.mjs` | 移动 · 原表已有 |

## 4. 迁移时必须一起更新的引用

| 位置 | 必须处理的内容 |
| --- | --- |
| `server/`、`tests/`、`scripts/` | 静态import/export、动态import、模块mock或缓存键；以每个调用文件的**新位置**计算相对路径，不能全局盲替换 `./`。 |
| `index.mjs` | 每批移动时同步该批import和worker入口；“最后再拆路由”不等于“最后才修入口import”。 |
| `index.mjs` → `file-worker.mjs` | fork入口改为 `jobs/workers/file-worker.mjs`，保留进程环境、DATA_DIR和IPC状态协议。 |
| `library-parser.mjs` → `library-parse-worker.mjs` | 两个文件迁入不同目录，`new URL(..., import.meta.url)`须跨到 `jobs/workers/`；同步workerPath测试及进程退出处理。 |
| `local-asr.mjs`、`local-audio-probe.mjs` | 当前由 `import.meta.url` 向上一层取项目根；移动后需重新定位根目录，确保Python、scripts/asr、模型、探测音频与cwd仍指向原位置。 |
| 本机配置加载方 | `engine.mjs`、worker、能力诊断、评测及启动脚本中对 `provider.local.mjs` 的引用全部核对；不能因找不到新配置静默回退到另一模型。 |
| `.gitignore`、`vite.config.ts` | 在移动本机配置**之前**加入 `server/ai/provider.local.mjs` 的Git排除及Vite私有路径拒绝规则，过渡期保留旧路径规则。不能只改import。 |
| `package.json`、`eslint.config.mjs` | 调整如 `server/accounting*.mjs` 的lint匹配；检查启动/测试/构建脚本中的文件路径。不能让“零文件匹配”冒充检查通过。 |
| 运行说明与测试fixture | 修正可执行命令和fixture导入；历史验收日志保留当时路径，不批量改写历史事实。 |

项目根仍为 `/mnt/d/OpenResource/PersonalAgent`。数据目录、原件、资料副本、模型及运行时不跟源码搬家；不扫描或改动E盘原件，不移动Android仓库。

`store.mjs`保留根层不代表所有模块都统一写 `../../store.mjs`：例如core用 `../store.mjs`，domain/notes用 `../../store.mjs`，应按实际目录深度计算。

## 5. 执行批次与必要验证（尚未执行）

1. **固定基线**：核对当时工作区与本表，保留所有已修改/未跟踪文件及既有业务数据；不reset、clean或还原此前修复。迁移表有新增遗漏时先补表。
2. **沉淀一致性规则**：计划新增 `consistency/README.md`，整理revision、opId、changes游标、租约、迟到结果等共同约定；复用已有相关回归。测试继续放在当前 `tests/*.test.mjs` 可发现位置，不把搬到新目录后未被执行的文件当作守护。
3. **分域迁移**：按core → ai → retrieval → domain → agent → pet → jobs推进；真实依赖可能跨批次，每批必须同时更新所有调用方，包括index、测试、脚本及Worker路径。遇到强耦合入口就作为一组迁移，不留下半可运行状态。
4. **区别跟踪状态**：已跟踪源码可用 `git mv`；未跟踪新增源码用普通移动并保留内容；被忽略的 `provider.local.mjs`只在本机迁移，始终不纳入Git。文件重命名历史由Git按内容识别，不能靠命令形式保证。
5. **按影响验证**：每批做引用解析和受影响模块的定向检查；worker批次补真实子进程启动/完成的最小场景。全部路径迁完后统一做一次启动检查和与变动有关的网页/构建检查；不要求每批都跑全套npm test、手机测试或付费模型样本。
6. **随后拆路由**：确认分层后的入口正常，再拆 `index.mjs` 路由和组装；供应商接入、协议版本、Electron分别实施，避免一次混改导致无法定位退化。

目录迁移的完成条件：123个基线文件一一对应，两个根文件保留；无遗漏或重复目标；静态/动态引用、Worker、根路径和配置保护均正确；已有功能及数据语义保持，相关定向检查通过。执行结果见第7节；后续路由拆分仍是单独任务。

## 6. 与第九节后续工作的边界

- `ai/`是pi-agent统一接入的落点；具体包/版本和能力覆盖仍需在接入阶段核实。本次完成目录重组，不安装pi-agent，也不让它接管业务确认/记忆状态/调研预算。
- 本次目录迁移本身不改变客户端接口或搬走Zod业务校验。后续9.3已完成独立协议仓库/Submodule、版本化API及服务端/Web字段迁移（协议0.2.0，149个现行操作、3个退役操作），协议远端已发布，Android接入仍是后续阶段，见[协议实施记录](26-contract-governance-implementation.md)。
- Electron是后续小九宿主，监督后端仍保留；Android已分离，迁移时保持服务端设备认证能力。
- 记账保持维护模式。开源排除个人数据、密钥、模型和运行产物的规则继续适用。

## 7. 执行记录（2026-10-08）

- **123/123 一一对应，121个移动、2个根文件保留。** 近期未提交的修复和新增模块随原文件保留，没有重置工作区或重写业务逻辑。
- 跨域依赖互相引用，本次先按映射统一计算所有调用方的新路径，再将文件作为一组迁移；没有按目录分别重跑全套测试。
- 静态/动态导入、测试中嵌入的子进程脚本、两个Worker入口、ASR根目录、embedding配置、索引验收资源路径均已同步；启动命令仍使用 `server/index.mjs`。
- 本机配置原样移动到 `server/ai/provider.local.mjs`，移动前增加Git忽略及Vite拒绝规则；旧路径保护也保留。未加入版本控制。
- 更新启动脚本、评测/备份脚本、测试导入、记账lint范围、README与本文；新增 [一致性规则](../server/consistency/README.md)。历史验收文档里的旧路径保留为当时记录，可用第3节映射查新位置。
- 本轮不改SQLite结构、业务API、数据目录、模型供应商协议，也不实施路由拆分、独立Schema或Electron。目录归属不等于已消除现有跨域依赖。

### 定向验证

| 检查 | 结果 |
| --- | --- |
| 迁移映射与模块解析 | 123项映射完整；122个非私密服务端文件语法通过；837处模块引用检查无断链 |
| 已有回归 | 8个文件、17项通过：独立解析子进程、embedding契约、语音能力、要事/记忆操作重试、备份、调研检查点恢复、Worker状态 |
| 构建 | `npm run build` 通过；仍有原有的前端大包提示，前端资源哈希未变化 |
| 记账lint | `npm run lint:accounting` 通过，新目录已纳入原检查范围 |
| 网页流程 | desktop单场景通过：扫描隔离资料 → 复制并解析 → 全文检索 → 定位正文末尾 → 下载副本 → 引用搭子 → 刷新后来源保持 |
| 现有服务加载新目录 | 已沿用原环境重启；`/api/health` 正常，Worker为ready，存储接口确认数据目录未变化 |

网页测试首次直接启动Playwright因缺少 `libnspr4.so` 未启动浏览器；改用现有 `scripts/test-browser.sh` 加载本机运行库后通过（1项，18.9秒），没有修改应用来绕过测试。

没有执行手机测试、全套应用回归或付费模型请求。迁移前源码快照保存在本机 `/tmp/server-module-refactor-20261008-143951/before.tar.gz`（目录仅当前用户可访问，包含本机配置，不应提交或分享）；它用于恢复本轮代码移动，不是个人数据备份。
