# 过滤校验风险与技术栈证据索引

2026-10-08。对应14号原始风险与18号技术栈，不修改原始需求。此表将已实现的规则、执行证据和未关闭边界对应起来；不是“24项全部无风险”声明。具体运行结果、失败修复和真假服务区分以20号及各模块验收对照为准。本次只读审计，未重跑测试或模型。

| 编号 | 范围 | 实现入口 | 已有证据与边界 |
| --- | --- | --- | --- |
| V01 | 跨模块输出 | validation、各业务Zod schema；event-draft、memory-output、research-contract、accounting-classification | 合法/非法结构、越权字段和空输出专项；真实调研曾暴露漏kind，现有安全字段错误与日志回归。结构通过不代表事实正确。 |
| V02 | 候选/已选/提交 | EventRelations、RunEvidenceSources、ResearchSources、LibraryFiles、Assistant | 关联翻页/失效移除、监督已选版本、101条记录与满额替换网页；资料库同页引用新增用例已通过。不同选择器分别取各模块证据，不用一个结果包办。 |
| V03 | 混合检索范围 | retrieval、retrieval-scope、library-filters | 两路过滤/SQL复查及旧候选后有效结果专项；MEM真实项目/话题过滤。最大1000候选/7轮窗口，truncated明确，不承诺无限补取。 |
| V04 | 同内容多来源 | library-members、library-metadata | 同内容来源独立项目/ID、归档一员不删另一员、副本哈希及元数据修改专项；源文件只用隔离样本。 |
| V05 | 向量版本与未索引记忆 | index-migration、retrieval、memory-conflicts | 迁移延迟PUT/源改删、真实Qwen切换回退、10月8日转写新旧索引及完整active补查；旧向量不取代SQL。 |
| V06 | 联网错误分类 | research-web、research-jobs/graph | 超时/限流/缺配置降级，取消/403/非法问题不降级；真实知识降级加供应商桩异常证据。真实Brave仍未配置。 |
| V07 | 来源与覆盖标签 | research-contract/evidence/retrieval | 假ID/位置/版本拒绝、全文/摘要/回填分别标记、接力历史网页；真实公开搜索及冲突语义仍待G04，不能将桩来源称为真实联网。 |
| V08 | 独立ACT工具授权 | 范围外 | 19号明确独立业务loop待讨论；不启动新开发。RES/SUP共享执行器按已确认场景和TECH另验，不将ACT标完成。 |
| V09 | 监督条件与人工完成 | supervision-conditions/evidence | AND/漏条件/假引文/正常计时不改证据版本/来源并发；双门槛与录音证据网页，见SUP-A01/A05。 |
| V10 | 实例身份与改期 | supervision-runs/schedule/jobs/timer | 每日唯一身份、跨日/暂停间隔、旧job取消、实际Redis重放；区间补记及断响应恢复，见SUP-A02–A04。 |
| V11 | 分类与人工优先 | categories、classification、classification-corrections | 稳定ID九类/项目类别、旧数据兼容、反馈原子保存、迟到分类不覆盖人工；类别/纠错网页及真实录音分类日志。 |
| V12 | 图文实际读取范围 | note-summary-images、event-draft | 文字+多图范围/源变化/空输出网页；实际中英两图归纳及编辑保存，附件ID/数量可查；不支持输入明确报错。 |
| V13 | 异步草稿与图片副本 | event-images/save、NoteEditor、artifact-output | 第二张复制失败清理临时副本、源修订提交保护；图片要事保存丢响应、记录多图503重试/剪切回贴原字节一致，下载使用保存版本。 |
| V14 | 固定会话与五条引用 | source-threads、Assistant | source-reference-limit原话题五条替换、项目记录/派生要事不同threadId；library-discussion同页合并/满额移除，不新增文件固定会话规则。 |
| V15 | 迟到回复与摘要 | conversation-requests、thread-context、Assistant | send-retry/context-switch、简报/删除延迟回包、摘要签名和分段；真实两话题/长文样本。 |
| V16 | 复核依赖签名 | event-review-context、event-jobs | 源/任务条件/转写/证据修订阻止旧提交与确认；归档依据在改期/源更新后保留，真实高等级复核网页。 |
| V17 | 要事关联与生命周期 | event-draft、EventRelations、event-lifecycle | 自身/重复/越界建议带移除原因；用户输入严格校验；失效选项可移除、四组合及独立结束，见EVT-A01–A07。 |
| V18 | 未知冲突不得无冲突 | memory-output、memory-conflicts | 显式null/空对象/错类型/陌生ID分别验证，完整适用active分批；失败不激活。见MEM-A02。 |
| V19 | 全入口原子确认 | memory-state/review/operation | 同批矛盾、两个入口胜出顺序、多旧冲突与最终写入失败回滚；旧事实留档，MEM-A01–A04。 |
| V20 | 配置版本与隔离恢复 | capabilities/settings、backups | 配置变化迟到409/非法字段原子拒绝；损坏/缺文件/穿越/覆盖拒绝，恢复到新目录；23号列新增持久状态适用性。 |
| V21 | 提示表一致快照 | pet-reminders、PetReminderContext/Table | 65条全量只读聚合、40条滚动/旧响应、五轮排除、六来源确认/新版再提示；PET-A02–A10。 |
| V22 | 导入每行去向 | accounting-import-parser/imports | 序号/文本日期、非法日期/金额/状态、全部可识别工作表、原行号和排除原因专项；实际多表网页。真实平台导出变体未提供样本。 |
| V23 | 重复核对而非丢账 | accounting-import-review/transactions | 同额两笔均保留、预览后新重复拒绝、幂等与独立导入区分、原件/决策回执原子；网页导入及恢复证据。 |
| V24 | 分类金额人工核对 | accounting/classification/ocr/statistics | 固定收支类别、金额冲突/边界、未知项待核对、最终确认后统计；真实AI分类及单张英文OCR网页。 |

## 技术栈接入

| 编号 | 已实现与已有运行证据 | 尚不能据此宣称 |
| --- | --- | --- |
| TECH-01 | SQLite事务任务/outbox、BullMQ正式worker；实际录音链路、索引迁移、要事/监督队列、调研网页图执行；失效租约/回滚/重复派发专项；正式worker在隔离Redis断线与恢复后重新ready。启动/AOF/noeviction见22号。 | 电脑关机仍能准点提醒；外部模型恰好一次计费；将库复制解析子进程说成全资料库流程均已搬入BullMQ。 |
| TECH-02 | research-graph实际LangGraph和SQLite检查点、计划等待释放、跨进程恢复和预算账本；research-backup-resume隔离恢复继续等待确认；真实知识降级/比较/可行性输出及真实API/队列配供应商桩网页。 | Brave真实搜索已通过或1元已由供应商实际账单核实；这些仍属G04。 |
| TECH-03 | 公共Zod及业务schema已落在设置、记忆、来源、要事、监督、调研、导入和账单；结构后再查SQL版本/状态/归属；失败草稿和合法保存由各模块专项证明。 | schema能保证语义正确；旧兼容入口全部重写；待讨论ACT自动获工具授权。 |

## 仍需保留的外部证据边界

- RES真实联网、实际公开来源的时效冲突与账户费用上界：需可用Brave配置及用户核对价格；现有网络桩与知识降级不能代替。
- 中文ASR已知错词、4人分成5个编号：有原始输出和人工编辑闭环，质量接受决定尚未收到；不静默改阈值或下载付费模型。
- 真实账单导出变体：已验合成多表与实际模型分类/OCR，但未提供平台原导出样本；不凭假文件宣称全部变体兼容。
- G01仍需将剩余需求/plan行与各模块证据逐项对齐；本表不靠汇总测试数量直接关闭全goal。
