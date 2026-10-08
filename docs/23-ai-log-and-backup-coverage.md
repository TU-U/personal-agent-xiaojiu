# AI 日志入口与备份覆盖核对

2026-10-08。用于SET-03/P02及G06/G07的代码调用链审计；真实服务能力/语义质量另按各模块验收。没有为了本表重新调用所有模型。

## 调用入口

共用文本/视觉出口为 `server/engine.mjs:complete` → `server/model-completion.mjs:requestCompletion`，调研模型直接使用同一requestCompletion。记录请求、响应、HTTP/网络/无效JSON/空输出错误，callId关联前后结果；日志写终端和DATA_DIR/logs/ai-interactions.jsonl。凭据及内联图片二进制脱敏。

| 用户功能 | 调用位置 | 业务定位与已有证据 |
| --- | --- | --- |
| 搭子回答、每轮记忆提炼、成果写作 | engine.mjs、index.mjs | API requestId、endpoint、threadId；chat-context-live、artifact-memory-live实际样本 |
| 长期记忆冲突检查 | memory-conflicts.mjs、engine.mjs | 继承记忆HTTP操作上下文；复用冲突专项，不新跑模型 |
| 记录归纳、长文分段归纳、图文归纳 | engine.mjs、long-summary.mjs | HTTP路径含记录ID；audio-live-flow实际归纳、多图HTTP替身证据 |
| 记录分类 | classification.mjs | background-jobs包裹jobId/jobKind/entityId/revision/attempt；audio-live-flow实际队列日志 |
| 要事AI编辑、到期复核 | index.mjs、events.mjs | 编辑HTTP路径或event-check任务实体；event-review-live为直接处理器样本，不冒充队列日志 |
| 对话摘要、网页搜索简报、小九交流 | thread-context.mjs、search-brief.mjs、pet-chat.mjs | 使用传入的complete，共用请求日志；继承HTTP上下文，包括派生异步调用 |
| 任务规划及既有工具循环 | work-tasks.mjs | HTTP路径/任务状态日志及共用模型日志；不扩展待讨论ACT |
| 监督证据检查、每日复盘 | supervision-evidence.mjs、supervision-recap.mjs | SUP实际HTTP替身日志保持requestId、endpoint与callId |
| 资料库图像解析 | library.mjs | file-worker任务上下文，共用视觉出口；现有回退模型的真实图像能力已由记录/要事样本证明，不等于资料库独立流程全部验收 |
| 账单分类、截图提取 | accounting.mjs、accounting-ocr.mjs | HTTP上下文；分类隐藏原始账单提示，OCR图片二进制脱敏；真实分类及单张合成英文账单OCR网页人工入账已通过，见 accounting-ocr-live-20261008.json，其他图像质量不泛化 |
| 调研计划/报告 | research-model.mjs、research-jobs.mjs | 队列任务上下文和预算attempt；requestCompletion记录真实输出。新增research-validation错误另带taskId、jobId、phase、code及安全字段位置 |
| 文本/视觉能力诊断 | capabilities.mjs | 认证后的HTTP上下文及同一模型出口；连接成功不代表业务质量 |
| embedding/混合检索 | retrieval.mjs | 独立embedding callId、请求/响应/错误；检索结果关联来源ID。真实transcript-retrieval小样本复用 |
| 应用内网络搜索 | web-search.mjs | web-search callId、查询、结果、错误，继承HTTP/队列上下文；真实Brave仍未配置 |
| 语音转写/说话人处理及独立诊断 | audio-jobs.mjs、local-audio-probe.mjs | asr-request/response/error带job/source；诊断audio-capability事件带callId。实际录音与能力样本已留证 |

普通网页抓取和Qdrant存取本身不是模型生成；其失败仍由调用方/任务状态报告，不将每次数据库HTTP都称作AI调用。日志关联信息仅供诊断，不用于授权。

## 本轮发现及修复

1. 模型HTTP成功后，调研内容被业务schema拒绝，原来只有模型响应日志。现在research-jobs记录research-validation失败，包括任务/后台任务编号、计划或报告阶段、错误码和安全字段位置。不会自动补写字段或自动重试。
2. embedding维度/规范校验原先发生在response日志之后。现在先checkedVector，失败记录error，成功才记录response，不再把错误维度日志标为成功。

只运行两个具名用例：research-tasks的invalid generated plan logs（57.8毫秒用例）及retrieval的embedding contract rejection（30.6毫秒用例），均通过；使用替身，无外部模型请求。前者验证任务/作业定位、正文哨兵不进入错误日志、没有生成成果；后者验证错误维度没有同callId成功日志。未跑完整套件。

## 备份适用性

`backups.mjs`使用SQLite完整一致性快照，业务表不按实体白名单筛掉；文件覆盖uploads、library、task-artifacts。默认仅清除凭据/会话并校验文件哈希与实体引用，恢复到新目录。完整快照包含调研图检查点、预算、任务/outbox、操作回执、转写历史、事件检查历史/复核来源版本；新字段随实体JSON保存。

既有accounting-backup专项证明原件、部分核对状态、交易、幂等回执可恢复，缺原件拒绝；research-backup-resume专项证明完整实体相等、恢复图停在同一人工确认点，确认后继续生成，原库不改变。10月8日正式后端更新前的一致性备份为29文件，见backend-refresh产物。

本轮仅修改提示词、错误文案与日志，不改变持久化结构或文件引用契约，因此不重复备份恢复测试。不据此声称所有未来实体引用都经过语义验证；不恢复或覆盖线上目录。

## 尚未关闭

真实联网及中文录音质量按总验收处理；视觉/OCR已有真实样本证据与适用边界，不再笼统写为缺少视觉服务。新增服务端日志和提示词已在正式4317重载并核对worker/storage正常，证据 artifacts/backend-reload-verified-20261008.json。不因此重复完整服务恢复测试。
