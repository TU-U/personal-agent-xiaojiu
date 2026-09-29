# 系统与记忆设计

> Android 阶段更新：请先阅读 [手机端实施文档](mobile/README.md)。本文件保留早期完整产品提案；当前后端实际为 Express + SQLite，Android 具体范围、接口现状与开发顺序以新文档为准。


版本：v0.2 · 2026-09-22 · 提案，待 PoC 验证。

## 1. 架构与技术建议

已确认先做 Web Demo，再开发 Android App。Demo 使用同一套响应式 React Web 界面覆盖手机与电脑浏览器；下图的手机本地 SQLite、文件与待同步队列属于后续 Android App。后端数据模型、账号、引用与任务接口在 Demo 阶段即复用正式设计。

```text
手机 App（本地 SQLite、文件、待同步队列）   电脑 Web 工作台
                    \                   /
                     HTTPS API + 增量同步
                              |
                  账号 / 资料 / 记忆 / 任务模块
                       |               |
               PostgreSQL         后台 Worker
            业务表 + pgvector       解析 / 检索 / 生成
                       |               |
                 私有对象存储      模型服务适配层
```

采用模块化单体后端加独立 Worker 进程。手机与电脑不各自维护一套 AI 后端；服务器保存权威业务版本，手机保存离线草稿与缓存。

| 层 | 初始建议 | 选择原因 / 待验证项 |
|---|---|---|
| Android App（Demo 后） | React Native + Expo + TypeScript | 共用业务类型；录音、文件、后台行为须真机验证 |
| Web Demo / 电脑 | React + TypeScript Web | 适配 Windows/macOS 浏览器，适合长文编辑；安装包后置 |
| API | Python + FastAPI | 与文档/AI 处理生态衔接；通过 OpenAPI 生成客户端类型 |
| 数据 | PostgreSQL + pgvector | 业务事务、来源、任务与检索同库；见[参考评估](02-references.md) |
| 附件 | 私有对象存储，使用 S3 兼容接口抽象 | 大文件不写进数据库，授权后短时下载 |
| 异步任务 | 首版 PostgreSQL jobs/outbox + Worker 租约 | 控制基础设施数量；吞吐不足时再换专用队列 |
| AI 流程 | 显式状态机；LangGraph 作为候选 | 先保证恢复、取消、步骤幂等，再决定框架 |
| 模型 | ASR/OCR、embedding、文本生成分别适配 | 不绑定供应商；中文效果、时延、价格与数据处理条款待评估 |

手机和电脑联网到统一可达服务，不能把开发电脑的 localhost 当成跨端部署方案。自用可部署私有服务器；多人 SaaS 的注册、计费和运营不属于当前默认范围。

## 2. 资料处理流程

创建本地记录 → 上传并校验附件 → 提交资源版本 → outbox 入队 → 解析 → 规范化片段 → 摘要/标签建议 → 建索引 → 抽取候选记忆。

每一步记录 resource_id、resource_version、pipeline_version。幂等键包含用户、资料版本、阶段与管线版本；Worker 至少一次执行，写结果必须幂等。重新处理只切换成功完成的新版本；旧任务迟到时不能覆盖新结果。附件上传完成不等于可检索，两个状态分别展示。

Worker 领取任务使用有过期时间的租约与心跳。失败按阶段重试，超过次数进入 failed，保留可解释错误；永久解析失败不反复计费。网络中断时外部模型可能已收费，成本不能保证严格一次，需保留请求标识和用量记录。

## 3. 核心数据模型

所有业务对象包含 owner_id、created_at、updated_at；可同步对象另有 revision 和 deleted_at。单用户试用也不省略所有者隔离。

| 实体 | 关键字段 | 用途 |
|---|---|---|
| Resource / ResourceVersion | type、title、project_id、version、status、content_hash | 一条记录与它的不可变内容版本 |
| Attachment | object_key、mime、size、checksum、upload_status | 原始音频、图片、文档 |
| Chunk | resource_version_id、text、locator、embedding_version | 检索单元；定位 PDF 页、音频时间段或文本段落 |
| Memory | kind、statement、scope、status、valid_from/to、supersedes_id | 已确认事实、偏好与项目背景 |
| MemoryEvidence | memory_id、resource_version_id/message_id、locator | 记忆的多来源证据关系 |
| Conversation / Message | conversation_id、role、text、provenance_type | 交互上下文，区分用户与模型内容 |
| Task / TaskRun / Step | input_scope、status、budget、checkpoint、error | 任务意图、每次执行及步骤结果 |
| Artifact / ArtifactVersion | task_run_id、body、citations、revision | 可编辑成果与历史版本 |
| Feedback | target_id、kind、before/after、scope | 用户纠错与偏好确认 |
| Device / SyncOperation / ChangeLog | device_id、op_id、base_revision、cursor | 跨端同步与幂等 |
| Job / Outbox / AuditEvent | status、lease_until、attempt、event_type | 可靠异步处理与审计 |

locator 保存结构化定位，不把模型输出的一段网址直接当作可信引用。导入日期与事件发生日期分开；“下周五”等相对日期依据记录时间、用户时区解释，不确定就询问。

## 4. 四类记忆

| 类别 | 内容 | 生效方式 |
|---|---|---|
| 原始记录 | 原音频、图片、文档、用户输入 | 可检索证据，保留版本 |
| 情节记录 | 某次会议、某日工作、一次决策 | 摘要链接原件，不提升为永久个人属性 |
| 长期记忆 | 写作偏好、当前角色、项目背景 | 用户明确要求记住或确认候选后生效 |
| 任务上下文 | 当前检索结果、约束、临时计划 | 限定 TaskRun，完成后不自动变个人事实 |

推荐生命周期：candidate → active → superseded / expired / rejected / deleted。

例如“这篇文章短一点”只约束当前任务；“以后周报控制在 500 字内”可成为周报范围的偏好。模型自行推断“用户喜欢所有文章都短”只能进入候选区。

同一事实出现矛盾时保留时间与来源。明确的新状态可替代旧状态用于当前问题，历史查询仍能找到旧状态；无法判断则并列展示并请用户纠正。不用上传时间简单覆盖事件时间。

生成稿不是个人事实来源。用户采纳稿件也不自动证明其中每项事实，只保存成果与采纳事件。只有明确修正、确认或受验证的工具回执才能触发相应记忆更新。

## 5. 检索与引用

1. 服务端先确定 owner、项目、日期、未删除范围，客户端不能覆盖授权范围。
2. 并行检索原文关键词、向量相似片段与适用的 active 记忆。
3. 合并排序、去重，可选 rerank；保留来源、事件日期、版本。
4. 组装有 token 上限的证据包；标明原文、已确认记忆与不确定信息。
5. 生成后校验 citation_id 存在、归属正确、仍可访问。关键陈述缺乏证据时提示缺口。

首版中文关键词路径建议预分词后建索引，另保留人名、项目编号精确匹配；不能假定默认英文全文检索配置适用于中文。模型和切片长度需用中文资料评测，不在此固定最优参数。

引用优先精确到 PDF 页码、音频时间段、文字段落。DOCX 页码受排版影响，首版定位标题与段落。OCR 或 ASR 错误可纠正；新文本版本触发派生索引与记忆重评估。

## 6. Agent 任务

首版使用两个受限模板：周报、主题文章。流程为范围确认 → 取证 → 大纲 → 草稿 → 引用检查 → 保存成果。用户缺省范围可以采用当前项目并显式展示，避免静默搜索全部私人资料。

状态：queued → running → succeeded / failed / cancelled；必要时进入 waiting_for_input。每次运行有最大步骤数、时长、token 预算和取消标记，避免无限循环。取消后迟到结果可以记录，但不得变成新的可见成果。

工具先限于搜索本人资料、读指定原件、读取已确认记忆、保存草稿。外部连接器后续按具体动作授权；资料中的指令视为待分析内容，不能改变工具权限。

主动协助演进：先由用户手动运行，随后支持明确订阅的每周回顾，最后才研究事件触发的建议。定时任务在服务器执行，记录时区、去重键和最近运行时间；通知包含触发原因，可关闭。

## 7. 数据隔离、删除与成本

查询、对象下载、后台任务、引用打开都校验归属。数据库可增加行级隔离，设计依据见 [PostgreSQL 行安全策略](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)；应用角色不能依赖数据库所有者权限绕过隔离。

删除先提交 tombstone 并立即拒绝检索，再异步清理附件、片段、向量、摘要与对应派生记忆。多来源记忆需重新评估剩余证据；被删来源不能继续支撑原陈述。已有成果标记相关引用失效，用户可选择保留自己的成稿或一并删除。备份保留时间需单独配置并告知，不能宣称点击删除即所有备份物理擦除。

资料存储加密、传输 HTTPS、密钥留服务端。调用云端模型意味着相关资料需发给该供应商，不能把自托管数据库称为端到端私密；若要求完全本地推理，需要重估硬件、质量和运维。

成本按每月音频分钟、OCR 页数、embedding token、输入/输出 token、存储与流量计量。每次任务记录用量与估算费用；摘要与 embedding 按版本复用。供应商和预算未定，因此此阶段不承诺固定月费。
