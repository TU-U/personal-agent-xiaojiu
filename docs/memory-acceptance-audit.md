# 长期记忆实施核对

2026-10-08。按长期记忆 spec、plan 和总执行文档核对当前代码。本文是阶段审查，不是全模块验收通过声明；本轮没有重复调用真实模型或重跑全套测试。

| 需求 | 当前实现与证据 | 剩余工作 |
| --- | --- | --- |
| MEM-01 用户事实候选 | engine.proposeTurnMemories 只传当前用户消息，严格解析最多三条；index 在成功回答提交时保存批次。历史真实模型样本包含稳定事实与临时提问两类，结果文件已重新读取。 | 语义质量结论仅限样本；不能保证模型永不推断。 |
| MEM-02 人工选择 | memory-review 原子确认选择、清空其余；memory-state 手动创建候选、active 更正生成副本。memory-operation 保存请求回执；既有丢响应网页证据见执行记录。 | 手动回执及网页丢响应恢复已验证；本次同步20号编号表。 |
| MEM-03 混合冲突 | memory-conflicts 先 hybrid 排序，再分批覆盖传入的全部适用 active，包括未索引条目；显式 null 才算无冲突，失败保留候选。真实样本在85条填充后找出居住地更新。 | 大库时按全量适用记忆批次调用，耗时随库增长；没有大规模性能保证，不以最近N条截断换速度。 |
| MEM-04 原子与并发 | memory-state/review 对配置、记忆集合、候选版本作提交前复核；替代旧条目和新确认在同事务。memory-cross-entry 覆盖两个胜出顺序及多旧冲突；2026-10-08 source-review 补全来源并发。 | 10月8日memory-source-review网页已通过，见文末。 |
| MEM-05 仅载入相关有效记忆 | retrieval-scope.memoryApplies 与 memory-source 读取 SQLite 有效状态/范围/来源；CHAT 在保存回答前再次复核。小九按混合检索取最多3条通用记忆。 | 2026-10-08 后续已改为 artifactMemories 按写作要求/来源标题混合召回、SQLite 复核和限额；定向替身测试通过，10月8日真实Qwen/生成接口和成果采用依据网页已通过，见文末。 |
| MEM-06 可见与纠正 | Memories、MemoryReview、MemoryScopeFields、MemoryOrigin 提供状态、来源、范围、冲突及人工编辑；source-review 可读取记录/要事/文件/对话最新版本并先保存候选。 | 10月8日来源预览/再次变更409/人工复核，以及成果记忆快照刷新保留网页已通过，见文末；其他来源类型后端证据复用。 |
| MEM-07 责任划分 | SQLite 保留事实与人工状态；Qdrant 为索引。thread-context 摘要存 settings，不直接转 memory；要事/任务用独立 kind。 | 无需新增另一套“技能记忆”存储。 |
| MEM-08 五轮与小九 | memory-lifecycle 用每话题持久成功轮次 N+5；refresh/confirm 校验；pet-reminders 使用 pendingMemoryBatches 并聚合手工 candidate，不将查看当确认。既有生命周期/PET证据见执行记录。 | 小九五轮排除、原轮次回源及共享刷新证据已复核，见PET对照。 |
| MEM-09 范围与版本 | memory-scope 保留用途限制并校验 global/project/thread；确认新对话记忆写入最终来源版本；旧来源确认后补版本，不在读取时伪造。项目聚合按 scopeId。 | 来源修复新界面和成果引用快照已联验，详见后文。 |

## plan 与验收对应

- P01：人工门槛、手动/批次确认已实现，A01/A02/A03 有定向及历史真实样本证据；未将多个服务复制逻辑说成单一函数。
- P02：混合优先+全量补查已实现，A02/A05 使用模型样本与纯逻辑测试分别佐证，不互相替代。
- P03：来源、版本、失效和并发已实现；2026-10-08 修复改变了旧测试对 sourceRef 不含 revision 的假设，本轮更新其断言，仍要求保留来源身份和版本。
- P04：管理页面及成果相关记忆取材已实现；来源重新核对及真实成果采用依据网页证据已补齐，详见后文。
- P05：期限、规范范围、项目聚合和小九来源已接；A06/A07及PET对应证据见下方编号收口。
- A04/A07：源码与既有来源/范围定向案例支持即时失效、范围合法；不能据此宣称每条模型消费者都已按相关性召回。

## 可复用证据

- `artifacts/memory-live-2026-09-29T00-14-07-055Z.json`：已读取，8项通过，真实 Qwen/Qdrant/生成接口；合成数据，独立集合已清理，不是当前服务健康证明。
- `tests/memory-conflicts.test.mjs`、`memory-cross-entry.test.mjs`、`memory-operation.test.mjs`、`memory-lifecycle.test.mjs`：代码核对，既有运行证据位于20号执行记录；本轮不重复运行。
- `tests/memory-source-review.test.mjs`：上一轮4项通过，涵盖来源并发与对话确认最终版本，冲突判断使用替身。

成果真实召回和来源核对网页缺项已在下方记录关闭；不再把本句旧下一步作为重测理由。

## 2026-10-08 记忆来源人工复核网页

memory-source-review.spec.ts 单项desktop通过（17.3秒，用例2.7秒）。真实API/隔离SQLite，无模型调用：原来源改变使候选显示失效；编辑中展示最新来源正文和版本；核对后来源再次改变则保存拒绝且草稿保留；重新读取会撤销旧勾选，显式重新核对后保存到新来源版本，但仍是candidate，未绕过后续冲突检查/启用。

报告 `/tmp/shiguang-memory-source-report`，产物 `/tmp/shiguang-memory-source-results`。事件/文件/对话来源的后端同源身份与版本校验复用memory-source-review既有专项，不把本次note网页场景称为所有来源页面都已实测。

## 2026-10-08 成果真实记忆取材及历史依据

Qdrant6333与Qwen4320的实际health均200。artifact-live-memory网页单场景通过（17.5秒，用例4.4秒），使用独立临时数据库、独立Qdrant集合、真实qwen3-embedding-0.6b及deepseek-flash。已确认且适用周报的记忆被混合检索采用，暂停记忆未采用；网页可展开生成时的正文、用途和版本。来源正文更新后原记忆转candidate并显示来源失效，保存的成果及记忆快照不被改写，刷新重开仍可核对。

已阅读实际周报正文：先写结论，字段表设计明确已完成，自动备份明确尚未开始且下周讨论须人工确认；没有把计划改写为完成事实。原始产物 `artifacts/artifact-memory-live-20261008.json`，报告 `/tmp/shiguang-artifact-live-report`，结果 `/tmp/shiguang-artifact-live-results`。仅合成资料小样本，不是全部写作质量保证。

首次运行实际生成成功但测试等待错误API路径超时，网络记录确认POST /api/tasks返回201；修正等待路径后上述完整流程通过。本轮实际生成两次，不隐去失败记录。finally删除测试集合后，仍存活的自动索引器曾重建空集合；已在测试服务退出后，按两份合成数据库的索引键确认所有权，重新删除本轮两个集合，逐个GET均404。今后此专项应在服务退出后清理集合，不能只相信finally删除返回200。配置在fixture退出时移除，未修改在线库或正式索引。

## 2026-10-08 原始验收编号收口

本次读取原spec/plan编号、实际memory-live产物八项结果、memory-review/state/conflicts/cross-entry/lifecycle/scope用例及20号对应执行结果，并核对当前调用链。没有新运行测试或模型。以下按已有证据覆盖的具体范围回填；总目标仍有其他模块未关闭项。

| 验收 | 结论与权威证据 | 适用边界 |
| --- | --- | --- |
| MEM-A01 | 已验证：memory-review选一弃二、提交回执和回滚；memory-live的unconfirmed-and-paused-excluded通过。 | 人工状态断言用隔离SQLite；真实向量样本独立证明未确认记忆不召回。 |
| MEM-A02 | 已验证：memory-state手动启用/编辑/暂停恢复，memory-review对话确认共用findMemoryConflict；memory-live在85条填充之后发现居住地更新，classification=update。 | 所有入口的状态协议由定向用例证明；真实语义样本不保证任意矛盾均判断正确。 |
| MEM-A03 | 已验证：memory-operation两候选及memory-cross-entry两个胜出顺序、多个旧冲突；memory-review最终写失败整体回滚。 | 模型检查用桩，验证并发/事务，不冒充模型语义。 |
| MEM-A04 | 已验证：memory-live的pause-before-vector-cleanup通过；memory-source/state验证来源改版/失效与恢复守卫；新来源复核网页拒绝并发版本并保留草稿。 | Qdrant残留不能绕过SQL；复核只保存candidate，仍须冲突检查后人工启用。 |
| MEM-A05 | 已验证：memory-live的semantic-paraphrase、project-exact-term、thread-filter；真实成果采用记忆/暂停排除/快照回看见artifact-memory-live。 | 仅本机合成样本，不宣称全问题准确率；每个消费者按用途及预算选取。 |
| MEM-A06 | 已验证：memory-lifecycle四项覆盖N+4/N+5、其他话题和回滚不计、删除历史不倒退、检查中到期拒绝；PET只读排除、原轮次导航及共享刷新证据见PET对照。 | 确定性轮次边界，不需要真实调用模型五轮；手动独立候选不按无关话题过期。 |
| MEM-A07 | 已验证：memory-scope未知范围拒绝/交集/扩大范围转候选；真实项目与话题隔离；旧用途保留和source-review来源版本契约。 | 项目同名不等于同ID；范围扩展仍重新检查。 |

MEM-01–09及P01–05分别由上表、模块实现表和前述网页证据承接。生成入口只传用户消息；冲突服务按适用active全量分批补查，不能用Top-K作为已检查全库。CHAT、PET及成果读取后复核当前状态/版本；调研共用sourceApplies/sourceReading。摘要存settings、业务记忆存SQLite、Qdrant可重建，MEM-07责任分离无需另建存储。

本轮关闭的是MEM原始编号的证据缺项，不消除已记录的大库耗时与模型质量边界，不代替RET迁移、RES联网或整个goal验收。最新来源格式修复继续以10月8日source-review及真实成果快照证据为准。
