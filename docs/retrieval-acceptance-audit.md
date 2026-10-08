# 超强检索：实现与验收对照

更新：2026-10-08。读取RET完整spec/plan、当前检索/筛选/接入实现和20号专项记录。本表为阶段审计；不以历史服务PID或评测通过宣称模块全部完成。

| 需求 / 步骤 / 验收 | 当前实现与证据 | 边界与待完成项 |
| --- | --- | --- |
| RET-01 / P01 / A01 | computer-files根目录/realpath限制；library复制项目内副本，元数据不修改原路径；library-members与phase2隔离样本比较源哈希、删除测试源后仍可读副本。 | 已有专项可复用；没有本轮扫描或写入E盘。测试源删除不等同授权删除用户原件。 |
| RET-02 / P01 / A01、A04 | 哈希物理副本与独立来源成员分离、canonicalId按内容身份；同路径新版本保留历史、来源复制回执与恢复；失败不伪造完成。 | 成员及恢复专项历史通过；旧duplicate兼容迁移错误保留待处理，不因归档首来源失去另一来源。10月8日真实存储面板及隔离worker/Redis恢复已有证据；正式后端版本差异已解决，见21号更新记录。 |
| RET-03 / P01 / A02 | library解析完整正文并分段，字符位置保留；独立解析进程及失败/乱码/无文字层提示。 | 历史成员/phase2与位置网页专项覆盖8,000字后事实；扫描文档/复杂表格扩展未授权，不把copied视为ready。录音已有转写取材按REC最新契约。 |
| RET-04 / P02 / A06 | retrieval中dense/lexical两路同filter，RRF后再查SQL；library-filters先按全量元数据过滤项目ID/旧标签/目录/扩展名/上海日期/状态，结果ID约束召回。 | 历史组合筛选、跨项目范围及大量旧候选专项可复用；当前预算最多1,000候选、至多7次扩大窗口，不足显示truncated，不能保证无限补取。 |
| RET-05 / P02、P04 / A02、A03、A05 | 返回来源revision/kind/字符位置及分数，SQLite裁决版本/状态/记忆范围；LibraryDetail严格比对原文后定位，变化则提示重新检索。 | 真实Qwen留出评测53来源/120分段，Top-5去重18/20，无答案2/2通过本机门槛；不推广为通用准确率。10月8日真实Qwen/Qdrant转写修订、旧索引拒绝、新版位置及调研证据校验通过，详见文末。 |
| RET-06 / P01、P03 / A04 | search_outbox与活动迁移任务/BullMQ；逐文件library-index-state按当前集合/版本/receipt显示，失败可单文件重试；无凭据显示未知。 | 历史后台/迁移专项与失败→重试→完成网页交互有记录；网页网络桩不证明真实Redis/embedding恢复，后者证据需单独核对当前适用性。 |
| RET-07 / P03 / A06 | /library/files游标分页；LibraryFiles批量选择/跨页保留/无效可移除、稳定opId；详情定位/元数据修改/搭子引用/已有任务关联。 | 9月29日批量、位置、状态、元数据、任务关联桌面专项已有；任务关联不自动启动或确认计划，不借此扩展ACT。最近跨模块改动与最终当前服务仍待合并验收。 |
| Q04 / 项目入口 | 来源成员各自projectId，稳定项目聚合；同名项目不自动合并，元数据更新不改原件/正文，重扫继承明确映射。 | 原项目/元数据专项可复用；与REC/CHAT共用当前聚合入口联验。资料库文件固定会话仍待产品确认，不自动套用记录规则。 |
| Embedding补充 / P04 | 已确认Qwen3-Embedding-0.6B本地1024维；embedding协议与集合命名绑定模型/预处理/分段，迁移新集合后切换，保留回退。 | 9月29日模型/覆盖/留出题hash/实际切流与回退证据已记录；当前持久配置和进程健康必须另验，不能拿qwen-active历史文件冒充实时状态。 |
| TECH-01/03 | 活动迁移由SQLite任务协调BullMQ，旧索引轮询遇活动迁移不抢写；按来源版本/模型代际提交，完成才清对应outbox。 | 既有真实队列/隔离索引和迁移专项，近期worker诊断与日志改变不等同重新证明实际服务恢复。 |

## 校验门槛与实际策略

- V01/V02：输入与批量决策严格schema；已选来源可跨页保留/移除，提交重新校验全部ID/版本/状态，失败整批回滚。AI价值判断及图片分析只按其独立契约处理，不能从规则目录筛选推断资料价值。
- V03：召回两路过滤，融合后SQL权威复核。当前实现扩大融合前缀而非仅在最初窗口offset分页；每轮重新排序、去点ID、每实体最多两段。达到预算时明确可能漏检，不能以“没有返回”断言全库无资料。
- V04：同内容可共用物理副本，但每来源保留自身ID/项目/路径/版本/正文；过滤来源成员后读取内容。归档一个成员不级联删共享副本。相同内容跨来源的向量合并不作为当前必须新增的优化。
- V05：索引协议、source revision、outbox新旧任务保护已有专项；调研readOnly额外核对片段与SQL原文逐字相等，不创建集合。新记忆尚未入向量库时冲突检查仍补查完整有效SQL快照，不能把检索不足当无冲突，详见MEM对照。

## 可复用真实质量证据

`artifacts/retrieval-heldout-questions-v2.json`在检索前冻结20题及2道无答案题；对应结果`retrieval-heldout-result-v2.json`记录题目hash、来源版本/覆盖、去重Top-5与耗时。49个非演示现有来源加4份项目文档，共53来源。两道漏检H13/H20保留，未改答案或阈值凑数；属于问题留出，并非完全独立新语料盲测。

`qwen-activation-check.json`、`qwen-rollback-check.json`、`qwen-active.json`及`index-http-qwen*.json`记录实际切换/回退/恢复与API检索；20号中当时服务端口/PID仅为历史证据。未改变相关检索策略时不重复付费生成或整库重算。

## 剩余验收与下一步

1. 将近期REC转写/图文、MEM来源状态、RES只读取材变化与RET消费者核对；索引文本、位置和revision必须一致，若有明确缺口先修复。
2. 可运行环境合并一次当前资料筛选→命中定位→引用讨论/任务→来源更新失效流程，复用无变化的分页/批量/下载用例，不重跑全部质量题。
3. 当前服务/worker/队列/Qwen/Qdrant健康及停止恢复与SET一起验收；监听已恢复且Qwen/Qdrant当前health为200；正式后端版本差异已解决，见21号；不以health代替业务验证。
4. RET-A05历史本机门槛有独立真实证据，其他条目分别按源码与专项适用性判定；模块整体仍未关闭。

## 2026-10-08 转写修订与真实混合索引衔接

仅执行 `SHIGUANG_CHECK_TRANSCRIPT_RETRIEVAL=1 node scripts/check-transcript-retrieval.mjs` 一次。使用当前已配置的本地Qwen3-Embedding-0.6B/Qdrant、隔离SQLite和随机前缀集合，单条合成录音来源，不启动后台indexer、不修改正式索引、不调用ASR或文本生成。

实际旧命中revision=1、字符0–92，正文含32元/周五/说话人1；来源修订后outbox记录revision=2，重建前旧向量即被SQLite版本复核排除，调研validateRetrievedEvidence同时拒绝旧引用。indexPending完成后outbox清除，新命中revision=2、字符0–95，正文含86元/周六/说话人2；片段严格等于sourceReading派生阅读文本的对应切片，原始人工附记及识别可能有误提示保留。Qdrant库存只剩新版点。

产物 `artifacts/transcript-retrieval-live-20261008.json` 保存前后实际内容与位置；临时集合删除后GET返回404。没有长录音/语义质量泛化结论，不重复全库评测。脚本仅显式开关允许运行，并限制为本机服务。搭子conversation-source-excerpt、调研research-retrieval直接复用sourceReading；成果engine先用noteReadableText派生正文，artifact-context将位置标为transcriptContent，与此索引文本契约一致。前次REC人工转写/真实总结及MEM成果取材证据继续复用。

## 2026-10-08 资料库引用到当前搭子话题

核对RET-07/P03与CHAT引用衔接发现：资料库只在记录页有入口，搭子正在讨论时无法直接再选资料；旧libraryDiscussion只在挂载时读取，重复引用会整组覆盖。新增搭子“引用资料库”按钮；沿用全局资料库弹窗，并以library-discussion通知已挂载的搭子。引用按kind/id合并，同资料刷新revision；最多5条，满额使用既有待加入/移除流程，不暗中移除旧资料。保留当前thread和输入，空输入才填默认提问。不新增资料库文件固定会话的未确认产品规则。

App、Assistant、LibraryFiles、TaskLibrarySources完成衔接。网页定向 `library-discussion.spec.ts` desktop 1项通过（19.8秒，用例7.6秒）：记录页入口→搭子、同页再次选择、输入保留、重复项不增、5条满额→移除指定旧项→新项加入、入口消息消费清除。资料API用桩，真实浏览器/构建；不调用模型，不冒充实际语义检索或引用回答质量。

首轮用例停在搭子页面不存在“资料库”按钮，说明最初仅增加事件监听不足；补齐真实按钮后通过，未用脚本注入事件代替用户入口。最终类型检查/构建成功 `index-r4GVwf8d.js`，既有大包提示保留。报告 `/tmp/shiguang-library-discussion-report-v2`，结果 `/tmp/shiguang-library-discussion-results-v2`。无需重启后端，不改手机或E盘。

## 2026-10-08 接入到索引的跨进程恢复

新增 `tests/library-pipeline-recovery.test.mjs`，单条 `node --test tests/library-pipeline-recovery.test.mjs` 最终通过，9.24秒（用例9.19秒）。临时来源/SQLite/实际文件复制与解析，三个独立Node进程依次验证：源暂不可读导致复制失败且等待解析；恢复测试源后显式重试得到同一来源副本，第二段embedding模拟503，第一段成功检查点保留且outbox未清；新进程读取失败状态，经正式单文件重试与迁移handler完成，只补剩余分段，不增加来源/副本/正文版本，完成后outbox才清除。拼接全部索引片段等于全文，原件/副本字节不变。

Embedding/Qdrant为跨进程持久的确定性替身，后台任务使用真实SQLite领取/提交与正式handler，未启动Redis运输，不把本用例称为真实向量服务恢复。实际worker/Redis恢复和真实Qwen版本更新分别复用SET及transcript-retrieval证据；无需再做整库或付费测试。

初次失败把prepareIndex的探测embedding算作正文，实际注入故障早于预期；增加诊断重跑仍失败，排除探测计数后第三次通过。产品源码未改，未构建/重启正式服务。删除的只有本用例创建的临时目录，未读写E盘原件。该证据补齐RET-A04/P01/06的复制失败到索引失败、跨进程续跑衔接，不扩大为所有故障与语义质量保证。

## 2026-10-08 RET-P03桌面扫描到引用串联通过

新增独立library-flow fixture，将COMPUTER_FILES_ROOT限定在本次临时DATA_DIR/synthetic-source，关闭生成/embedding配置与后台worker；不扫描E盘、不写在线库。真实网页操作扫描study目录→实际复制/解析Markdown→关键词命中10000字之后正文→打开命中段落并聚焦→引用到搭子。API和文件操作没有替身；下载副本逐字节等于合成原文，结束后复核临时原件哈希不变，刷新后同一资料ID/revision/copyName保留。

仅执行 `SHIGUANG_E2E_LIBRARY_FLOW=1 ... tests/e2e/library-flow.spec.ts --project=desktop`，一次通过，总18.7秒/用例5.6秒。结果 `/tmp/shiguang-library-flow-results`、报告 `/tmp/shiguang-library-flow-report`、摘要 `artifacts/library-flow-20261008.json`。不调用模型、不重算向量；此证据针对plan指定的同次桌面流程，语义质量及索引恢复复用已有独立证据。未改产品代码，无需构建/服务重启。RET-P03剩余串联缺口关闭，G04真实搜索仍待配置。
