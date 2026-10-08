# 拾光开发执行记录

开始：2026-09-29。目标依据 docs/19-goal-execution.md，10个已确认模块含记账，ACT独立场景范围外。当前 goal active（恢复后本地监听已解除）；尚未满足总验收。

## 启动基线

- 当前目录无 Git 仓库；已保存开发前源码/文档/测试归档与 SHA-256 清单：`.data/development-baselines/20260929-022458`。归档含私有配置，只保留在本地受限目录，不提供下载。
- 当前在线端口：4317 API、5173 Vite、6333 Qdrant、4319 embedding；4435为另一已有服务，暂不操作。
- Redis尚未安装；已确认新增依赖尚未接入。未修改用户数据或手机工程。源码归档不是数据库/附件一致性备份；迁移前另做一致性备份。

## 当前工作（2026-10-08 更新）

- SUP 已补条件/计时/证据/提醒/历史与待办升级；PET 完成业务完成反馈及三日关心专项。各模块仍须按覆盖表进行完整交付审计，未核对项不因某条测试通过自动完成。
- RES 已接持久调研图、计划确认、网页/本地混合取材、预算与一轮缺证据补查，真实联网整体验收仍待完成。记账已接持久导入/OCR原件、人工核对、AI分类、服务端统计、小九提示及备份恢复，浏览器/真实模型验收仍待完成。后续按覆盖表继续补齐与审计各模块，不能把专项通过视为完整交付。
- Redis/BullMQ、Qwen/Qdrant 和多模块专项的实际实现/证据见后续日期记录；最上方启动基线保留为历史，不代表当前运行状态。

## 需求与步骤覆盖表

| 文档 / 条款 | 状态 | 实现与证据 / 下一步 |
| --- | --- | --- |
| 小九桌宠plan.md · PET-01 | 已验证（对应范围） | A01：三入口、拖动抑制误触、直接摸摸及无喂食入口。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-02 | 已验证（对应范围） | A02/A04：只读来源聚合、共享提示及六来源网页联验。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-03 | 已验证（对应范围） | A02/A09：同快照总数与标识、完整列表、空态和错误分离。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-04 | 已验证（对应范围） | A03：hover移入、常驻切换、键盘与40条滚动既有网页证据。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-05 | 已验证（对应范围） | A08：草稿失败保留、业务上下文隔离及实际emoji回复。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-06 | 已验证（对应范围） | A07：汇报只导航与短反馈，无报告生成或确认写入。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-07 | 已验证（对应范围） | A06：实际人工完成、受控三日边界、旧计时器保护。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-08 | 已验证（对应范围） | A05：源状态/稍后/改期/去重、队列恢复及六来源确认。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-09 | 已验证（对应范围） | A09：无模型提示、独立聊天接口、hover/轮询无模型调用。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-A01 | 已验证（对应范围） | 入口/拖动/三入口既有桌面证据；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠plan.md · PET-A02 | 已验证（对应范围） | 完整只读聚合与六来源网页，错误不冒充空；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠plan.md · PET-A05 | 已验证（对应范围） | 源状态/真实队列重试/改期/PET旧响应拒绝；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠plan.md · PET-P01 | 已验证（对应范围） | A02/A04/A05/A09：来源矩阵、只读契约、源状态与模板表达。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-P02 | 已验证（对应范围） | A02/A03/A05/A09：完整提示表、交互/错误状态及更新保护。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-P03 | 已验证（对应范围） | A01/A07/A08：三入口、生活交流隔离、汇报无业务副作用。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-P04 | 已验证（对应范围） | A05/A06/A07：业务事实驱动反馈、历史基线与定时器去重。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠plan.md · PET-P05 | 已验证（对应范围） | A08/A10及Q09/Q10：有效通用记忆与候选红点同步。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-01 | 已验证（对应范围） | A01：三入口、拖动抑制误触、直接摸摸及无喂食入口。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-02 | 已验证（对应范围） | A02/A04：只读来源聚合、共享提示及六来源网页联验。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-03 | 已验证（对应范围） | A02/A09：同快照总数与标识、完整列表、空态和错误分离。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-04 | 已验证（对应范围） | A03：hover移入、常驻切换、键盘与40条滚动既有网页证据。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-05 | 已验证（对应范围） | A08：草稿失败保留、业务上下文隔离及实际emoji回复。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-06 | 已验证（对应范围） | A07：汇报只导航与短反馈，无报告生成或确认写入。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-07 | 已验证（对应范围） | A06：实际人工完成、受控三日边界、旧计时器保护。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-08 | 已验证（对应范围） | A05：源状态/稍后/改期/去重、队列恢复及六来源确认。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-09 | 已验证（对应范围） | A09：无模型提示、独立聊天接口、hover/轮询无模型调用。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-10 | 已验证（对应范围） | A08/A10：真实通用记忆采用、暂停排除及统一MEM过滤。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-11 | 已验证（对应范围） | A10：五轮到期、人工确认与旧快照拒绝，不由查看操作清理。 见 [PET逐项对照](pet-acceptance-audit.md) 及原始编号收口；真实搜索不属本项证据。 |
| 小九桌宠spec.md · PET-A01 | 已验证（对应范围） | 入口/拖动/三入口既有桌面证据；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A02 | 已验证（对应范围） | 完整只读聚合与六来源网页，错误不冒充空；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A03 | 已验证（对应范围） | 40条滚动、常驻/hover/键盘及关闭无写入；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A04 | 已验证（对应范围） | 统一provider及源页同ID，六来源确认网页；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A05 | 已验证（对应范围） | 源状态/真实队列重试/改期/PET旧响应拒绝；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A06 | 已验证（对应范围） | feedback三日控制时钟/人工完成及网页定时器保护；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A07 | 已验证（对应范围） | 汇报仅导航和短反馈，无成果/确认写入；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A08 | 已验证（对应范围） | 聊天失败草稿保留、上下文隔离及真实非空emoji样本；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A09 | 已验证（对应范围） | 无模型聚合、长表滚动、hover/轮询无调用；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · PET-A10 | 已验证（对应范围） | 真实通用记忆/暂停排除、五轮到期与旧快照拒绝；见 pet-acceptance-audit.md 编号收口及证据边界。 |
| 小九桌宠spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 帮忙做事plan.md · ACT-01 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-02 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-03 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-04 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-05 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-06 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-07 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-A01 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-A02 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-A03 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-P01 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-P02 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-P03 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · ACT-P04 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · PET-P01 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事plan.md · 补充实施项：接入小九统一提醒 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-01 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-02 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-03 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-04 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-05 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-06 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-07 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-A01 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-A02 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-A03 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-A04 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-A05 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · ACT-A06 | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · 补充：小九统一提醒（用户最新确认） | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 帮忙做事spec.md · 过滤与校验补充（2026-09-29） | 范围外：ACT待讨论 | 待代码与验收证据核对 |
| 快速学习与调研plan.md · PET-P01 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 快速学习与调研plan.md · RES-01 | 已验证对应范围 | 三模板/自定义、话题与引用快照、长问题保留及草稿清理已验证；见RES对照与research-draft-results。不等于任意长文质量已验证。 |
| 快速学习与调研plan.md · RES-02 | 已验证对应范围 | 计划问题/已知未知/产物、人工确认和旧版本拒绝已有网页证据；资料不足保留阶段结果及手工回填入口，见RES对照。 |
| 快速学习与调研plan.md · RES-03 | 部分验证 · G04 | 可编辑简报、显式等待、回填同任务及版本恢复网页通过；Brave接口已实现，真实搜索及账户价格仍缺验收。 |
| 快速学习与调研plan.md · RES-04 | 部分验证 · G04 | 本地/网页原文/搜索摘要/手工回填分层与位置已实现并经受控网页验证；真实公开网页与个人记录的时效冲突仍待验收。 |
| 快速学习与调研plan.md · RES-05 | 已验证对应范围 | 学习实际模型样本、比较和可行性修正后真实报告已有；最终比较Markdown表格和来源位置见research-comparison-final-20261008.json。限已测样本。 |
| 快速学习与调研plan.md · RES-06 | 已验证对应范围 | 逐问题coverage、有界补查、额度不足阶段结果已有实际图与供应商桩证据；真实联网补查质量并入G04。 |
| 快速学习与调研plan.md · RES-07 | 已验证对应范围 | 接力网页证明手动选候选、手选要事等级、行动只建草稿、丢响应不重复和来源回看；见research-relay-results。 |
| 快速学习与调研plan.md · RES-08 | 部分验证 · G04 | 失败分类/证据保留/双重失败已有供应商桩证据，实际模型知识降级及网页恢复通过；真实Brave故障与部分来源成功质量未验收。 |
| 快速学习与调研plan.md · RES-09 | 部分验证 · G04 | 计划门槛、持久预算、预留/结算、重试/取消及图处理计时已有专项；真实搜索费用契约仍缺。同步处理尾部不是硬实时零超时承诺。 |
| 快速学习与调研plan.md · RES-A01 | 已验证对应范围 | 6952字符真实学习报告实际输入含末尾5953–6952，位置逐字相等，概念/顺序/练习/未执行状态已人工核对；见research-long-learning-v3与review产物及RES对照。 |
| 快速学习与调研plan.md · RES-A02 | 已验证对应范围 | 最终真实比较样本按费用/时间/隐私同维度比较，未知单列，E1原文revision及0–109字符可定位；本项不要求来源必须是网页。 |
| 快速学习与调研plan.md · RES-A03 | 已验证对应范围 | 真实知识降级与接力网页证据分层复用：简报可编辑、等待不伪称联网、回填更新同一任务；见RES对照。 |
| 快速学习与调研plan.md · RES-A05 | 已验证对应范围 | 覆盖表与有界阶段交付已有图专项，最终实际比较报告含answered/partial及下一步；候选和成果网页通过。 |
| 快速学习与调研plan.md · RES-A06 | 已验证对应范围 | 本项要求模拟超时/限流/缺配置：research-web/tasks证据及网页降级已有；真实生成知识降级另有产物，不冒称实际Brave通过。 |
| 快速学习与调研plan.md · RES-A07 | 已验证对应范围 | 双重失败保留进度用供应商桩验证；接力网页实际API/SQLite/图确认同任务新版本、丢响应不重复、无伪核验。 |
| 快速学习与调研plan.md · RES-A08 | 部分验证 · G04 | 可控计时/用量、共享账本/恢复/未知价格拒绝已有；实际模型用量上界已有，搜索账户计费契约仍待核对。 |
| 快速学习与调研plan.md · RES-P01 | 部分验证 · G04 | 原文/摘要/回填/知识分层及结构化证据已实现，真实比较原文已核实；A04真实时效冲突仍缺。 |
| 快速学习与调研plan.md · RES-P02 | 已验证对应范围 | 6952字符真实学习报告实际输入含末尾5953–6952，位置逐字相等，概念/顺序/练习/未执行状态已人工核对；见research-long-learning-v3与review产物及RES对照。 |
| 快速学习与调研plan.md · RES-P03 | 部分验证 · G04 | 失败分类、知识降级、接力/回填/版本网页已有证据；计划指定的真实公开来源调研仍缺Brave配置和价格。 |
| 快速学习与调研plan.md · RES-P04 | 已验证对应范围 | 固定报告/问题覆盖/候选人工选择保存及查看本版报告均有证据；行动不启动未确认ACT循环，见RES/PET对照。 |
| 快速学习与调研plan.md · RES-P05 | 部分验证 · G04 | 实际持久图与计时/费用边界专项已有，生成接口按用量计保守上界；真实搜索账户价格未核实，完整费用验收仍未关闭。 |
| 快速学习与调研plan.md · 补充实施项：接入小九统一提醒 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 快速学习与调研plan.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 快速学习与调研spec.md · RES-01 | 已验证对应范围 | 三模板/自定义、话题与引用快照、长问题保留及草稿清理已验证；见RES对照与research-draft-results。不等于任意长文质量已验证。 |
| 快速学习与调研spec.md · RES-02 | 已验证对应范围 | 计划问题/已知未知/产物、人工确认和旧版本拒绝已有网页证据；资料不足保留阶段结果及手工回填入口，见RES对照。 |
| 快速学习与调研spec.md · RES-03 | 部分验证 · G04 | 可编辑简报、显式等待、回填同任务及版本恢复网页通过；Brave接口已实现，真实搜索及账户价格仍缺验收。 |
| 快速学习与调研spec.md · RES-04 | 部分验证 · G04 | 本地/网页原文/搜索摘要/手工回填分层与位置已实现并经受控网页验证；真实公开网页与个人记录的时效冲突仍待验收。 |
| 快速学习与调研spec.md · RES-05 | 已验证对应范围 | 学习实际模型样本、比较和可行性修正后真实报告已有；最终比较Markdown表格和来源位置见research-comparison-final-20261008.json。限已测样本。 |
| 快速学习与调研spec.md · RES-06 | 已验证对应范围 | 逐问题coverage、有界补查、额度不足阶段结果已有实际图与供应商桩证据；真实联网补查质量并入G04。 |
| 快速学习与调研spec.md · RES-07 | 已验证对应范围 | 接力网页证明手动选候选、手选要事等级、行动只建草稿、丢响应不重复和来源回看；见research-relay-results。 |
| 快速学习与调研spec.md · RES-08 | 部分验证 · G04 | 失败分类/证据保留/双重失败已有供应商桩证据，实际模型知识降级及网页恢复通过；真实Brave故障与部分来源成功质量未验收。 |
| 快速学习与调研spec.md · RES-09 | 部分验证 · G04 | 计划门槛、持久预算、预留/结算、重试/取消及图处理计时已有专项；真实搜索费用契约仍缺。同步处理尾部不是硬实时零超时承诺。 |
| 快速学习与调研spec.md · RES-A01 | 已验证对应范围 | 6952字符真实学习报告实际输入含末尾5953–6952，位置逐字相等，概念/顺序/练习/未执行状态已人工核对；见research-long-learning-v3与review产物及RES对照。 |
| 快速学习与调研spec.md · RES-A02 | 已验证对应范围 | 最终真实比较样本按费用/时间/隐私同维度比较，未知单列，E1原文revision及0–109字符可定位；本项不要求来源必须是网页。 |
| 快速学习与调研spec.md · RES-A03 | 已验证对应范围 | 真实知识降级与接力网页证据分层复用：简报可编辑、等待不伪称联网、回填更新同一任务；见RES对照。 |
| 快速学习与调研spec.md · RES-A04 | 待验收 · G04 | 真实个人记录与新网页时效冲突仍缺一份公开来源调研；受控证据分层不替代此场景。 |
| 快速学习与调研spec.md · RES-A05 | 已验证对应范围 | 覆盖表与有界阶段交付已有图专项，最终实际比较报告含answered/partial及下一步；候选和成果网页通过。 |
| 快速学习与调研spec.md · RES-A06 | 已验证对应范围 | 本项要求模拟超时/限流/缺配置：research-web/tasks证据及网页降级已有；真实生成知识降级另有产物，不冒称实际Brave通过。 |
| 快速学习与调研spec.md · RES-A07 | 已验证对应范围 | 双重失败保留进度用供应商桩验证；接力网页实际API/SQLite/图确认同任务新版本、丢响应不重复、无伪核验。 |
| 快速学习与调研spec.md · RES-A08 | 部分验证 · G04 | 可控计时/用量、共享账本/恢复/未知价格拒绝已有；实际模型用量上界已有，搜索账户计费契约仍待核对。 |
| 快速学习与调研spec.md · 补充：小九统一提醒（用户最新确认） | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 快速学习与调研spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 快速学习与调研spec.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 搭子plan.md · CHAT-01 | 已验证（对应范围） | A01：两个话题实际续聊及历史分页，不按天新建。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-02 | 已验证（对应范围） | A02：205轮分页、摘要签名/失败补偿/分段检查点及真实约束保真。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-03 | 已验证（对应范围） | A03：长文末尾实际回答/来源位置、101条选择与资料库同页引用。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-04 | 已验证（对应范围） | 实际样本事实归属、本地模式/空输出/来源失效可见，不泛化回答质量。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-05 | 部分验证：真实联网待G04 | 接力简报/回填交互已验证；应用内真实Brave搜索仍待RES/G04。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-06 | 已验证（对应范围） | 两种任务草稿保留话题/引用、用户确认门槛及MEM逐轮候选。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-07 | 已验证（对应范围） | 发送回执/刷新恢复、迟到答复/简报/删除隔离及长表/满额交互。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-08 | 已验证（对应范围） | 稳定来源映射、同名隔离、派生要事独立会话与项目入口。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-A01 | 已验证（对应范围） | 真实双话题续聊与事实归属、分页证据。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-A02 | 已验证（对应范围） | 超过bootstrap窗口的历史、六轮摘要边界与失败补偿及真实摘要保真。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-A03 | 已验证（对应范围） | 实际长文后半段回答/引用版本与原文定位。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-A04 | 已验证（对应范围） | 普通任务/调研草稿、失效来源纠正、成功后清理且不自动执行。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-A06 | 已验证（对应范围） | source-discussion并发唯一/改名/失败、项目入口与满五条替换。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-P01 | 已验证（对应范围） | A01/A02：持久目录、游标历史及legacy兼容。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-P02 | 已验证（对应范围） | A02：摘要覆盖签名、全部未摘要原文、预算报错/分段恢复。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-P03 | 已验证（对应范围） | A03/A05：共同来源/记忆范围过滤、长文选段及可操作失效项。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-P04 | 部分验证：真实联网待G04 | A04/A05：草稿与网页接力已验；真实联网仍待RES/G04。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · CHAT-P05 | 已验证（对应范围） | A06：原子固定映射、旧历史与当前引用版本分开。 详见 chat-acceptance-audit.md。 |
| 搭子plan.md · Q04 实施补充：共享项目与聚合入口 | 共享验收已关联 | 按稳定projectId聚合记录/要事/文件，同名不混、会话各自保留；项目要事图片→原会话当前网页已通过。见CHAT/REC/EVT/RET对照与21号项目入口记录。文件固定会话随后已确认并于Pi阶段实施，见27号记录。 |
| 搭子plan.md · Q09 实施补充：成功轮次与候选期限 | 共享验收已关联 | 成功轮次计数、五轮候选到期和迟到响应保护见MEM候选期限及CHAT轮次专项；失败/取消不算成功。见memory/chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-01 | 已验证（对应范围） | A01：两个话题实际续聊及历史分页，不按天新建。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-02 | 已验证（对应范围） | A02：205轮分页、摘要签名/失败补偿/分段检查点及真实约束保真。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-03 | 已验证（对应范围） | A03：长文末尾实际回答/来源位置、101条选择与资料库同页引用。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-04 | 已验证（对应范围） | 实际样本事实归属、本地模式/空输出/来源失效可见，不泛化回答质量。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-05 | 部分验证：真实联网待G04 | 接力简报/回填交互已验证；应用内真实Brave搜索仍待RES/G04。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-06 | 已验证（对应范围） | 两种任务草稿保留话题/引用、用户确认门槛及MEM逐轮候选。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-07 | 已验证（对应范围） | 发送回执/刷新恢复、迟到答复/简报/删除隔离及长表/满额交互。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-08 | 已验证（对应范围） | 稳定来源映射、同名隔离、派生要事独立会话与项目入口。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-A01 | 已验证（对应范围） | 真实双话题续聊与事实归属、分页证据。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-A02 | 已验证（对应范围） | 超过bootstrap窗口的历史、六轮摘要边界与失败补偿及真实摘要保真。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-A03 | 已验证（对应范围） | 实际长文后半段回答/引用版本与原文定位。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-A04 | 已验证（对应范围） | 普通任务/调研草稿、失效来源纠正、成功后清理且不自动执行。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-A05 | 已验证（对应范围） | send-retry丢响应幂等、空模型/失效引用报错、迟到响应保持当前草稿。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · CHAT-A06 | 已验证（对应范围） | source-discussion并发唯一/改名/失败、项目入口与满五条替换。 详见 chat-acceptance-audit.md。 |
| 搭子spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 监督与督促做事plan.md · PET-P01 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 监督与督促做事plan.md · REC-P09 | 共享验收已关联 | 复用REC-A11与SUP-A07的待办升级/唯一来源映射/人工条件确认证据，见record/supervision-acceptance-audit.md；不启动待讨论ACT。 |
| 监督与督促做事plan.md · SUP-01 | 已验证（对应范围） | 每日逻辑身份、一次性唯一实例与已知历史补建；不补造未知启用日期。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-02 | 已验证（对应范围） | 主动计时、重启检查点、补记原因/区间去重及网页丢响应恢复。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-03 | 已验证（对应范围） | 实例条件快照、AND双门槛、未来模板不改历史。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-04 | 已验证（对应范围） | 逐条件有效来源/归属/版本及位置，录音证据网页。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-05 | 已验证（对应范围） | 人工确认事务重验条件/证据/时长、幂等与旧依据历史。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-06 | 已验证（对应范围） | 改期/跳过/安静时段/跟进上限、真实队列失败重试及源状态去重。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-07 | 已验证（对应范围） | 历史补建/欠项聚合、确定性事实与实际模型复盘，转写变化标旧。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-08 | 已验证（对应范围） | 待办明确升级、重复请求单份关联、禁止绕过监督门槛及统一提示。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-A01 | 已验证（对应范围） | 双条件AND/人工确认，evidence后端及双门槛网页；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事plan.md · SUP-A02 | 已验证（对应范围） | 每日唯一身份、历史快照、补建和改期真实队列；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事plan.md · SUP-A06 | 已验证（对应范围） | recap确定性事实/签名、真实模型未确认样本及录音复盘网页；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事plan.md · SUP-A07 | 已验证（对应范围） | todo-supervision单份关联、门槛/回源/提醒去重网页；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事plan.md · SUP-P01 | 已验证（对应范围） | A01/A02：模板/实例/条件快照、一次性与每日身份。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-P02 | 已验证（对应范围） | A01/A04/A05：计时独立于证据版本、逐项检查和人工门槛。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-P03 | 已验证（对应范围） | A02/A03：持久调度、源版本重查、安静/改期及停机恢复。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-P04 | 已验证（对应范围） | A06：历史欠项/日期复盘，事实数字与AI建议分开。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · SUP-P05 | 已验证（对应范围） | A07：待办升级幂等、来源保留及小九单入口。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事plan.md · 补充实施项：接入小九统一提醒 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 监督与督促做事plan.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 监督与督促做事spec.md · SUP-01 | 已验证（对应范围） | 每日逻辑身份、一次性唯一实例与已知历史补建；不补造未知启用日期。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-02 | 已验证（对应范围） | 主动计时、重启检查点、补记原因/区间去重及网页丢响应恢复。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-03 | 已验证（对应范围） | 实例条件快照、AND双门槛、未来模板不改历史。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-04 | 已验证（对应范围） | 逐条件有效来源/归属/版本及位置，录音证据网页。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-05 | 已验证（对应范围） | 人工确认事务重验条件/证据/时长、幂等与旧依据历史。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-06 | 已验证（对应范围） | 改期/跳过/安静时段/跟进上限、真实队列失败重试及源状态去重。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-07 | 已验证（对应范围） | 历史补建/欠项聚合、确定性事实与实际模型复盘，转写变化标旧。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-08 | 已验证（对应范围） | 待办明确升级、重复请求单份关联、禁止绕过监督门槛及统一提示。 见 [SUP逐项对照](supervision-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 监督与督促做事spec.md · SUP-A01 | 已验证（对应范围） | 双条件AND/人工确认，evidence后端及双门槛网页；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事spec.md · SUP-A02 | 已验证（对应范围） | 每日唯一身份、历史快照、补建和改期真实队列；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事spec.md · SUP-A03 | 已验证（对应范围） | 安静时段/跟进上限/重启去重/历史汇总与重试；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事spec.md · SUP-A04 | 已验证（对应范围） | timer/interval重启检查点、补记留痕及网页丢响应；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事spec.md · SUP-A05 | 已验证（对应范围） | 证据独立版本、来源归属与并发守卫、历史/录音网页；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事spec.md · SUP-A06 | 已验证（对应范围） | recap确定性事实/签名、真实模型未确认样本及录音复盘网页；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事spec.md · SUP-A07 | 已验证（对应范围） | todo-supervision单份关联、门槛/回源/提醒去重网页；见 supervision-acceptance-audit.md 编号收口及证据边界。 |
| 监督与督促做事spec.md · 补充：小九统一提醒（用户最新确认） | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 监督与督促做事spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 要事plan.md · CHAT-08 | 共享验收已关联 | 复用CHAT固定来源会话及REC-A07：记录/要事各自固定会话、五条满额可替换、重复进入保留历史；项目要事图片网页已通过。见chat/event/record-acceptance-audit.md。 |
| 要事plan.md · CHAT-P05 | 共享验收已关联 | 复用CHAT固定来源会话及REC-A07：记录/要事各自固定会话、五条满额可替换、重复进入保留历史；项目要事图片网页已通过。见chat/event/record-acceptance-audit.md。 |
| 要事plan.md · EVT-01 | 已验证（对应范围） | 图片副本、来源删除保留、发生日期和搜索及保存断响应网页。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-02 | 已验证（对应范围） | 图文真实辅助编辑/人工保存、无效关联原因、来源变化拒绝。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-03 | 已验证（对应范围） | 四组合及越权字段校验，等级由用户选择。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-04 | 已验证（对应范围） | 到期/两级分流、真实队列及实际高等级复核；约定检查不等于截止。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-05 | 已验证（对应范围） | 检查实例与生命周期分离、改期/确认/结束历史、迟到回包拒绝。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-06 | 已验证（对应范围） | 失败可见与显式重试、操作回执、重复调度保护。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-07 | 已验证（对应范围） | 关联任务条件/证据有效性与版本，真实建议不伪造已执行事实。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-08 | 已验证（对应范围） | 共同source-threads固定映射、项目入口、五条满额替换。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-09 | 已验证（对应范围） | 四组合/无提醒/下一次检查与兼容迁移，不推测旧类型。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-A01 | 已验证（对应范围） | 图片副本/真实多图草稿/人工保存及源删除后字节一致；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事plan.md · EVT-A02 | 已验证（对应范围） | 真实高普通同到期，只有high调用且均待确认；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事plan.md · EVT-A05 | 已验证（对应范围） | 真实复核预算及缺证据样本、模型失败可见与重试；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事plan.md · EVT-A06 | 已验证（对应范围） | 固定来源映射/满额替换/项目要事图片讨论网页；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事plan.md · EVT-A07 | 已验证（对应范围） | 四组合、无时间、下一次检查和记录/派生要事独立话题；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事plan.md · EVT-P01 | 已验证（对应范围） | A02/A03/A04：等级、依赖签名、改期与人工确认。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-P02 | 已验证（对应范围） | A05：关联有效证据/缺失原因及真实复核。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-P03 | 已验证（对应范围） | A01/A04：编辑草稿/图片副本/发生日期/稍后与历史。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-P04 | 已验证（对应范围） | A06：共享固定会话、最新引用与独立历史。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · EVT-P05 | 已验证（对应范围） | A07：四组合与独立检查实例、类型未知保留。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事plan.md · PET-P01 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 要事plan.md · 补充实施项：接入小九统一提醒 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 要事plan.md · Q04 实施补充：共享项目与聚合入口 | 共享验收已关联 | 按稳定projectId聚合记录/要事/文件，同名不混、会话各自保留；项目要事图片→原会话当前网页已通过。见CHAT/REC/EVT/RET对照与21号项目入口记录。文件固定会话随后已确认并于Pi阶段实施，见27号记录。 |
| 要事plan.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 要事spec.md · EVT-01 | 已验证（对应范围） | 图片副本、来源删除保留、发生日期和搜索及保存断响应网页。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-02 | 已验证（对应范围） | 图文真实辅助编辑/人工保存、无效关联原因、来源变化拒绝。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-03 | 已验证（对应范围） | 四组合及越权字段校验，等级由用户选择。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-04 | 已验证（对应范围） | 到期/两级分流、真实队列及实际高等级复核；约定检查不等于截止。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-05 | 已验证（对应范围） | 检查实例与生命周期分离、改期/确认/结束历史、迟到回包拒绝。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-06 | 已验证（对应范围） | 失败可见与显式重试、操作回执、重复调度保护。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-07 | 已验证（对应范围） | 关联任务条件/证据有效性与版本，真实建议不伪造已执行事实。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-08 | 已验证（对应范围） | 共同source-threads固定映射、项目入口、五条满额替换。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-09 | 已验证（对应范围） | 四组合/无提醒/下一次检查与兼容迁移，不推测旧类型。 见 [EVT逐项对照](event-acceptance-audit.md) 及A编号证据；不泛化模型质量。 |
| 要事spec.md · EVT-A01 | 已验证（对应范围） | 图片副本/真实多图草稿/人工保存及源删除后字节一致；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事spec.md · EVT-A02 | 已验证（对应范围） | 真实高普通同到期，只有high调用且均待确认；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事spec.md · EVT-A03 | 已验证（对应范围） | event-jobs真实队列及review-context依赖签名/改期旧提交拒绝；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事spec.md · EVT-A04 | 已验证（对应范围） | 生命周期/操作回执/真实归档依据网页，确认不结束；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事spec.md · EVT-A05 | 已验证（对应范围） | 真实复核预算及缺证据样本、模型失败可见与重试；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事spec.md · EVT-A06 | 已验证（对应范围） | 固定来源映射/满额替换/项目要事图片讨论网页；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事spec.md · EVT-A07 | 已验证（对应范围） | 四组合、无时间、下一次检查和记录/派生要事独立话题；见 event-acceptance-audit.md 编号收口及证据边界。 |
| 要事spec.md · 补充：小九统一提醒（用户最新确认） | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 要事spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 记录&每日待办&成果plan.md · CHAT-08 | 共享验收已关联 | 复用CHAT固定来源会话及REC-A07：记录/要事各自固定会话、五条满额可替换、重复进入保留历史；项目要事图片网页已通过。见chat/event/record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · CHAT-P05 | 共享验收已关联 | 复用CHAT固定来源会话及REC-A07：记录/要事各自固定会话、五条满额可替换、重复进入保留历史；项目要事图片网页已通过。见chat/event/record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · PET-P01 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 记录&每日待办&成果plan.md · REC-01 | 已验证（对应范围） | 原文草稿、有效附件与服务端保存回执，导入断响应幂等网页。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-02 | 已验证（对应范围） | Ozon原文/Markdown、单图及多图部分上传失败后剪切回贴，原字节一致。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-03 | 已验证（对应范围） | 原件下载、图文读取范围/空结果/源改版错误和真实中英多图归纳。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-04 | 已验证（对应范围） | todo-days、并发带入与上海午夜网页，历史保留。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-05 | 已验证（对应范围） | 模型空/截断/来源冲突拒绝、人工mode与原mode、实际周报计划未冒充完成。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-06 | 已验证（对应范围） | SQLite保存revision下载、人工编辑模式/旧版本409；本轮长报告/侧栏滚动通过。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-07 | 已验证（对应范围） | 删除源后独立要事图片保留；成果记忆历史快照与失效提示网页。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-08 | 已验证（对应范围） | CHAT固定映射/并发/失败、项目入口与满额替换，派生要事不同会话。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-09 | 已验证（对应范围） | 九类稳定ID、开发项目类别/批量/改名/筛选与projectId聚合。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-10 | 部分验证：中文语音质量边界 | 中英文真实样本、录制→转写→人工修订→归纳及私网HTTP提示；中文错词/人数偏差保留。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-11 | 已验证（对应范围） | 自动单类别合法值、人工优先/迟到拒绝、事务纠错/问题表及真实队列分类。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-12 | 已验证（对应范围） | todo-supervision升级幂等/原来源、人工完成门槛及小九统一提示。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A01 | 已验证（对应范围） | Ozon多级原文/Markdown保存重开，record-format网页。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A03 | 已验证（对应范围） | 真实多图/录音归纳与能力错误，原件保留及截断明示。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A04 | 已验证（对应范围） | todo-days和todo-midnight：跨日历史与重复带入不重复。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A05 | 已验证（对应范围） | artifact-revisions网页、API空/截断/来源变更及真实成果记忆取材。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A07 | 已验证（对应范围） | CHAT共有固定来源验收、项目入口与满五条替换。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A08 | 已验证（对应范围） | categories/projects网页和接口：九类/创建/改名/筛选/关联不变。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A09 | 部分验证：中文语音质量边界 | 上传与录制真实流程、时间戳/匿名说话人/编辑及分阶段错误；中文质量偏差明确保留。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A10 | 已验证（对应范围） | classification与corrections网页：自动分类、手改优先、反馈幂等及处理历史。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-A11 | 已验证（对应范围） | SUP升级网页、幂等回执与PET六来源联验。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P01 | 已验证（对应范围） | A03/A05：导入幂等、能力/截断/错误可见，原件保留。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P02 | 已验证（对应范围） | A05：当前成果版本导出、编辑时禁导出/旧revision拒绝及模式准确。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P03 | 已验证（对应范围） | A01/A02/A06：原文与图片故障保真、独立副本/历史，长文滚动。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P04 | 已验证（对应范围） | A04：上海日期、历史与显式带入幂等。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P05 | 已验证（对应范围） | A07：来源固定会话与旧历史/新引用，失败不重建。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P06 | 已验证（对应范围） | A08：固定九类/独立项目类别、稳定ID迁移和批量归类。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P07 | 部分验证：中文语音质量边界 | A09：本地中英文样本/完整网页录音/修订/总结；中文质量边界尚待用户答复。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P08 | 已验证（对应范围） | A10：改类与反馈同事务、操作去重、问题表处理历史。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · REC-P09 | 已验证（对应范围） | A11：待办升级与SUP共享关联和人工条件门槛。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果plan.md · SET-P05 | 共享验收已关联 | 这里引用分类纠错能力：见REC-P08/A10及SET纠错历史证据；不将SET中另列的G04搜索费用缺口强加给分类。 |
| 记录&每日待办&成果plan.md · SUP-P05 | 共享验收已关联 | 复用REC-A11与SUP-A07的待办升级/唯一来源映射/人工条件确认证据，见record/supervision-acceptance-audit.md；不启动待讨论ACT。 |
| 记录&每日待办&成果plan.md · 补充实施项：接入小九统一提醒 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 记录&每日待办&成果plan.md · Q04 实施补充：共享项目与聚合入口 | 共享验收已关联 | 按稳定projectId聚合记录/要事/文件，同名不混、会话各自保留；项目要事图片→原会话当前网页已通过。见CHAT/REC/EVT/RET对照与21号项目入口记录。文件固定会话随后已确认并于Pi阶段实施，见27号记录。 |
| 记录&每日待办&成果plan.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 记录&每日待办&成果spec.md · REC-01 | 已验证（对应范围） | 原文草稿、有效附件与服务端保存回执，导入断响应幂等网页。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-02 | 已验证（对应范围） | Ozon原文/Markdown、单图及多图部分上传失败后剪切回贴，原字节一致。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-03 | 已验证（对应范围） | 原件下载、图文读取范围/空结果/源改版错误和真实中英多图归纳。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-04 | 已验证（对应范围） | todo-days、并发带入与上海午夜网页，历史保留。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-05 | 已验证（对应范围） | 模型空/截断/来源冲突拒绝、人工mode与原mode、实际周报计划未冒充完成。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-06 | 已验证（对应范围） | SQLite保存revision下载、人工编辑模式/旧版本409；本轮长报告/侧栏滚动通过。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-07 | 已验证（对应范围） | 删除源后独立要事图片保留；成果记忆历史快照与失效提示网页。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-08 | 已验证（对应范围） | CHAT固定映射/并发/失败、项目入口与满额替换，派生要事不同会话。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-09 | 已验证（对应范围） | 九类稳定ID、开发项目类别/批量/改名/筛选与projectId聚合。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-10 | 部分验证：中文语音质量边界 | 中英文真实样本、录制→转写→人工修订→归纳及私网HTTP提示；中文错词/人数偏差保留。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-11 | 已验证（对应范围） | 自动单类别合法值、人工优先/迟到拒绝、事务纠错/问题表及真实队列分类。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-12 | 已验证（对应范围） | todo-supervision升级幂等/原来源、人工完成门槛及小九统一提示。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A01 | 已验证（对应范围） | Ozon多级原文/Markdown保存重开，record-format网页。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A02 | 已验证（对应范围） | note-image-recovery：多图第二张503→重试→剪切回贴→刷新/逐图下载一致。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A03 | 已验证（对应范围） | 真实多图/录音归纳与能力错误，原件保留及截断明示。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A04 | 已验证（对应范围） | todo-days和todo-midnight：跨日历史与重复带入不重复。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A05 | 已验证（对应范围） | artifact-revisions网页、API空/截断/来源变更及真实成果记忆取材。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A06 | 已验证（对应范围） | 要事副本源删后下载与成果失效记忆/旧依据展示。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A07 | 已验证（对应范围） | CHAT共有固定来源验收、项目入口与满五条替换。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A08 | 已验证（对应范围） | categories/projects网页和接口：九类/创建/改名/筛选/关联不变。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A09 | 部分验证：中文语音质量边界 | 上传与录制真实流程、时间戳/匿名说话人/编辑及分阶段错误；中文质量偏差明确保留。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A10 | 已验证（对应范围） | classification与corrections网页：自动分类、手改优先、反馈幂等及处理历史。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · REC-A11 | 已验证（对应范围） | SUP升级网页、幂等回执与PET六来源联验。 见 record-acceptance-audit.md。 |
| 记录&每日待办&成果spec.md · 补充：小九统一提醒（用户最新确认） | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 记录&每日待办&成果spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 记账spec&plan.md · 1. 功能目标 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 2. 功能范围 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 2.1 本次需要实现 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 2.2 本次明确不实现 | 范围边界已核对 | 不做平台自动拉取/银行卡API/多用户/投资账户；手动上传Excel按原文功能目标和后续Q12确认纳入。 |
| 记账spec&plan.md · 3. 数据模型 | 已验证（对应范围） | 既有SQLite实体/稳定ID与revision、amountCents，收据重放不新增账目。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 金额规则 | 已验证（对应范围） | 整分持久化/BigInt累计、双金额冲突拒绝、边界专项及负金额网页保留输入。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · type | 已验证（对应范围） | income/expense严格枚举；收入/支出网页保存与统计。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 默认分类 | 已验证（对应范围） | 固定支出11类/收入5类，未知AI分类待核对，无自定义分类。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 4. 新增账单 | 已验证（对应范围） | Case1/2/3/7：保存、字段错误、输入保留及刷新持久化。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 校验 | 已验证（对应范围） | 统一金额/日期/类型/类别校验；近字段错误与保存失败保留。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 5. 账单列表 | 已验证（对应范围） | 服务端日期/创建时间倒序、加载/空/错误，列表与合计同一快照。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 6. 编辑账单 | 已验证（对应范围） | Case4及accounting-transactions：原ID保留、版本更新、统计同步。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 7. 删除账单 | 已验证（对应范围） | Case5：人工确认、成功后移除与统计同步，按revision拒绝旧请求。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 8. 统计 | 已验证（对应范围） | statistics及预算/排名网页：整分计算、筛选合计/月概览/生活费分开。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 9. 筛选 | 已验证（对应范围） | 日期/类型/分类AND，Case6组合筛选及statistics边界。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 日期 | 已验证（对应范围） | 全部/今天/本周/本月/自定义日期按上海日历筛选。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 类型 | 已验证（对应范围） | 全部/收入/支出筛选；服务端统计与列表同口径。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 分类 | 已验证（对应范围） | 固定分类筛选与类型约束，不新增餐饮别名类别。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 10. 数据一致性 | 已验证（对应范围） | Case1–7与导入网页：新增/编辑/删除/筛选后列表及统计同步。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 11. 错误处理 | 已验证对应范围 | 原文金额/类型/分类/统计/筛选专项、Case1–7、保存重试已有；新增51笔展示/空态/删除503保留/读取503重试网页一次通过。见accounting-boundaries-20261008.json与记账对照。 |
| 记账spec&plan.md · 12. 非功能要求 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 数据 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · UI | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 代码 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 13. 验收标准 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · Case 1：新增支出 | 已验证（对应范围） | 支出35.50保存/列表及支出更新。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · Case 2：新增收入 | 已验证（对应范围） | 工资5000及收入/差额正确。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · Case 3：非法金额 | 已验证（对应范围） | -100拒绝，输入和数据库原状态保留。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · Case 4：编辑 | 已验证（对应范围） | 编辑金额保持ID/条数，筛选合计同步。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · Case 5：删除 | 已验证（对应范围） | 人工删除后列表及三项合计归零。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · Case 6：筛选 | 已验证（对应范围） | 本月+支出+美食AND筛选，三个不匹配来源排除。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · Case 7：刷新 | 已验证（对应范围） | 保存后刷新仍有相同账单与金额。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · `plan.md` | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 1. 实施原则 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 2. Phase 1：项目分析 | 已核对 | 2026-10-08确认复用Accounting.tsx/index.mjs/accounting.mjs/store.mjs，发现原件/逐行去向/重复核对/服务端统计/PET缺口，详见本日实施记录 |
| 记账spec&plan.md · 3. Phase 2：设计数据层 | 已验证（对应范围） | 既有SQLite/事务、导入原件/批次/行/交易引用，accounting-backup隔离恢复。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 4. Phase 3：实现业务逻辑 | 已验证（对应范围） | 新增/编辑/删除/筛选/统计及持久导入审核，旧导入接口410明确拒绝。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 5. Phase 4：实现新增/编辑表单 | 已验证（对应范围） | 同一Accounting表单、字段校验、请求回执与未知响应恢复。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 6. Phase 5：实现账单列表 | 已验证（对应范围） | 倒序列表及50条继续查看，空态/错误分别呈现。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 7. Phase 6：实现筛选 | 已验证（对应范围） | 统一筛选请求；Case6验证不匹配月份/类别/方向排除且合计同步。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 8. Phase 7：实现统计 | 已验证（对应范围） | 服务端确定性统计、BigInt累计、两类排名/图表及2000生活费范围。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 9. Phase 8：删除功能 | 已验证（对应范围） | 人工确认后请求，失败保留记录，成功刷新列表统计。 见 accounting-acceptance-audit.md 原文条款/Case映射及当前网页证据。 |
| 记账spec&plan.md · 10. Phase 9：测试 | 已验证对应范围 | 原文金额/类型/分类/统计/筛选专项、Case1–7、保存重试已有；新增51笔展示/空态/删除503保留/读取503重试网页一次通过。见accounting-boundaries-20261008.json与记账对照。 |
| 记账spec&plan.md · Unit Test | 已验证对应范围 | 原文金额/类型/分类/统计/筛选专项、Case1–7、保存重试已有；新增51笔展示/空态/删除503保留/读取503重试网页一次通过。见accounting-boundaries-20261008.json与记账对照。 |
| 记账spec&plan.md · Integration Test | 已验证对应范围 | 原文金额/类型/分类/统计/筛选专项、Case1–7、保存重试已有；新增51笔展示/空态/删除503保留/读取503重试网页一次通过。见accounting-boundaries-20261008.json与记账对照。 |
| 记账spec&plan.md · UI Test | 已验证对应范围 | 原文金额/类型/分类/统计/筛选专项、Case1–7、保存重试已有；新增51笔展示/空态/删除503保留/读取503重试网页一次通过。见accounting-boundaries-20261008.json与记账对照。 |
| 记账spec&plan.md · 11. Phase 10：验收 | 已验证（对应范围） | npm run lint记账范围零错误/警告；既有typecheck/build及Case1–7/导入分类OCR定向证据复用。见accounting-acceptance-audit.md，不宣称全项目lint或所有样本准确。 |
| 记账spec&plan.md · 12. 修改范围控制 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 记账spec&plan.md · 13. 完成定义 | 已映射子项证据 | 汇总条款关联本表数据层/CRUD/筛选统计/预算/AI分类/OCR/Case1–7及记账对照；沿用现有组件、SQLite和主题，无记账无关重构。真实导出变体与中文/模糊OCR保留样本局限，不追加无限测试。 |
| 设置和数据plan.md · PET-P01 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 设置和数据plan.md · SET-01 | 已验证（对应范围） | 独立能力配置与保存刷新；capabilities网页及实际语音/视觉证据。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-02 | 已验证（对应范围） | 诊断走实际调用路径，能力状态独立；语音诊断失败/重试网页及真实本地探测。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-03 | 已验证（对应范围） | 23号逐入口日志映射、实际HTTP/队列关联、脱敏专项及两项错误日志修复。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-04 | 已验证（对应范围） | storage-status实际磁盘与网页失败恢复；结构导出明确不含二进制。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-05 | 已验证（对应范围） | 一致性快照、哈希/引用校验、隔离恢复；账单原件与调研检查点恢复专项。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-06 | 已验证（对应范围） | 演示访问、22号运行指南、开发服务四项敏感路径HTTP403；无新增公网入口。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-07 | 已验证（对应范围） | 配置原子schema、配置指纹/迟到结果409、非法语音配置隔离；主题保持浏览器本地。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-A01 | 已验证（对应范围） | 配置保存刷新与实际调用配置、空结果和错误关联，见capabilities及23号。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-A03 | 已验证（对应范围） | 日志脱敏专项、实际HTTP与worker关联；23号完整入口对照。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-A04 | 已验证（对应范围） | 隔离备份恢复、哈希/引用与损坏拒绝；23号新增持久数据适用性。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-A05 | 已验证（对应范围） | 演示口令边界及实际Vite四项私有路径403，无新增公开部署。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-P01 | 已验证（对应范围） | SET-01/02/07及A01/A02：脱敏配置、独立探测、原子保存。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-P02 | 已验证（对应范围） | SET-03/A03与23号：统一出口、关联日志与错误脱敏。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-P03 | 已验证（对应范围） | SET-04/05/A04：完整备份和隔离验证，线上替换需单独明确动作。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-P04 | 已验证（对应范围） | SET-06/07/A05与22号：启动/热更新/诊断说明及私有路径保护。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据plan.md · SET-P05 | 部分验证：真实搜索费用受阻 | ASR/分离诊断、分类问题表及新增实体备份已有证据；调研价格配置/用量展示已有桩验收，真实Brave及账户费用仍按G04保留。见 settings-acceptance-audit.md、23号及RES对照。 |
| 设置和数据plan.md · 补充实施项：接入小九统一提醒 | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 设置和数据plan.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 设置和数据spec.md · SET-01 | 已验证（对应范围） | 独立能力配置与保存刷新；capabilities网页及实际语音/视觉证据。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-02 | 已验证（对应范围） | 诊断走实际调用路径，能力状态独立；语音诊断失败/重试网页及真实本地探测。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-03 | 已验证（对应范围） | 23号逐入口日志映射、实际HTTP/队列关联、脱敏专项及两项错误日志修复。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-04 | 已验证（对应范围） | storage-status实际磁盘与网页失败恢复；结构导出明确不含二进制。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-05 | 已验证（对应范围） | 一致性快照、哈希/引用校验、隔离恢复；账单原件与调研检查点恢复专项。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-06 | 已验证（对应范围） | 演示访问、22号运行指南、开发服务四项敏感路径HTTP403；无新增公网入口。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-07 | 已验证（对应范围） | 配置原子schema、配置指纹/迟到结果409、非法语音配置隔离；主题保持浏览器本地。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-A01 | 已验证（对应范围） | 配置保存刷新与实际调用配置、空结果和错误关联，见capabilities及23号。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-A02 | 已验证（对应范围） | 文本/视觉独立网页、语音诊断失败持久化/单独重试及实际能力探测。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-A03 | 已验证（对应范围） | 日志脱敏专项、实际HTTP与worker关联；23号完整入口对照。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-A04 | 已验证（对应范围） | 隔离备份恢复、哈希/引用与损坏拒绝；23号新增持久数据适用性。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · SET-A05 | 已验证（对应范围） | 演示口令边界及实际Vite四项私有路径403，无新增公开部署。 详见 [SET逐项对照](settings-acceptance-audit.md)，不代表未配置的外部服务可用。 |
| 设置和数据spec.md · 补充：小九统一提醒（用户最新确认） | 共享验收已关联 | 复用PET-P01/A02–A10及六来源网页联验：查看不确认、回源处理、新报告再次提示；见pet-acceptance-audit.md。源模块其他缺口分别保留。 |
| 设置和数据spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 设置和数据spec.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 超强检索plan.md · REC-P07 | 部分验证 · 共享ASR | 复用REC-P07/A09：中英文转写、时间/说话人、人工修订、真实归纳已测；中文错词/人数偏差仍保留。见record-acceptance-audit.md及audio-evidence-review-20261008.json。 |
| 超强检索plan.md · RET-01 | 已验证（对应范围） | 隔离来源哈希/副本独立及realpath边界，未使用E盘做删除测试。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-02 | 已验证（对应范围） | library-members/recovery：成员与物理副本分开、重启复制幂等及版本保留。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-03 | 已验证（对应范围） | 完整解析/分段、长文8000字后事实；异常/无文字明确状态。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-04 | 已验证（对应范围） | dense/sparse同filter、全量元数据筛选与SQL复查；预算1000候选/7轮且标truncated。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-05 | 已验证（对应范围） | 真实留出53来源/20题18命中及2无答案；版本/位置复核与转写改版实测。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-06 | 已验证（对应范围） | 逐文件状态/重试网页加library-pipeline-recovery跨进程接入→索引失败→重试完成；真实Redis/Qwen证据分层复用。 见 retrieval-acceptance-audit.md 最新恢复证据。 |
| 超强检索plan.md · RET-07 | 已验证（对应范围） | 分页/批量/命中定位/元数据/任务关联及新增搭子同页引用网页。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-A01 | 已验证（对应范围） | library成员/恢复专项：源哈希不变、测试源删后副本可读、重扫幂等。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-A02 | 已验证（对应范围） | 8000字后正文实际检索与网页字符位置定位，非仅标题命中。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-A05 | 已验证（对应范围） | retrieval-heldout-result-v2：先冻结问题hash，53来源/120段，18/20及无答案2/2。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-P01 | 已验证（对应范围） | A01–A04：成员/版本/原件保护与完整接入状态；新增跨进程恢复衔接已通过。 见 retrieval-acceptance-audit.md 最新恢复证据。 |
| 超强检索plan.md · RET-P02 | 已验证（对应范围） | A02/A03/A06：过滤/分页/片段位置/版本契约与统一消费者。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · RET-P03 | 已验证对应范围 | 真实网页/API/SQLite/文件扫描→复制解析→正文后段关键词命中→定位→搭子引用，同一次desktop通过；原件/副本字节一致。见library-flow-20261008.json与RET对照；语义质量复用独立证据。 |
| 超强检索plan.md · RET-P04 | 已验证（对应范围） | A05及Qwen迁移：真实留出评测、切换/回退保留证据，不重算全库。 详见 retrieval-acceptance-audit.md。 |
| 超强检索plan.md · Embedding 迁移补充：Qwen | 共享验收已关联 | Qwen实际留出样本、分集合迁移/启用/回退及10月8日转写改版真实Qwen/Qdrant已验证，见retrieval-acceptance-audit.md与qwen-activation/rollback/transcript-retrieval产物；不重复全库计算。 |
| 超强检索plan.md · Q04 实施补充：共享项目与聚合入口 | 共享验收已关联 | 按稳定projectId聚合记录/要事/文件，同名不混、会话各自保留；项目要事图片→原会话当前网页已通过。见CHAT/REC/EVT/RET对照与21号项目入口记录。文件固定会话随后已确认并于Pi阶段实施，见27号记录。 |
| 超强检索plan.md · 已确认技术栈接入（2026-09-29） | 分项证据已关联 | TECH-01/02/03实现及真实队列、持久图、恢复、schema证据见24-validation-evidence-index.md；正式worker已重载就绪。TECH-02搜索费用仍并入G04，ACT独立loop仍范围外。 |
| 超强检索spec.md · REC-P07 | 部分验证 · 共享ASR | 复用REC-P07/A09：中英文转写、时间/说话人、人工修订、真实归纳已测；中文错词/人数偏差仍保留。见record-acceptance-audit.md及audio-evidence-review-20261008.json。 |
| 超强检索spec.md · RET-01 | 已验证（对应范围） | 隔离来源哈希/副本独立及realpath边界，未使用E盘做删除测试。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-02 | 已验证（对应范围） | library-members/recovery：成员与物理副本分开、重启复制幂等及版本保留。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-03 | 已验证（对应范围） | 完整解析/分段、长文8000字后事实；异常/无文字明确状态。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-04 | 已验证（对应范围） | dense/sparse同filter、全量元数据筛选与SQL复查；预算1000候选/7轮且标truncated。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-05 | 已验证（对应范围） | 真实留出53来源/20题18命中及2无答案；版本/位置复核与转写改版实测。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-06 | 已验证（对应范围） | 逐文件状态/重试网页加library-pipeline-recovery跨进程接入→索引失败→重试完成；真实Redis/Qwen证据分层复用。 见 retrieval-acceptance-audit.md 最新恢复证据。 |
| 超强检索spec.md · RET-07 | 已验证（对应范围） | 分页/批量/命中定位/元数据/任务关联及新增搭子同页引用网页。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-A01 | 已验证（对应范围） | library成员/恢复专项：源哈希不变、测试源删后副本可读、重扫幂等。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-A02 | 已验证（对应范围） | 8000字后正文实际检索与网页字符位置定位，非仅标题命中。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-A03 | 已验证（对应范围） | 索引延迟PUT/删除/改版与SQL复查；真实Qwen转写旧向量排除。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-A04 | 已验证（对应范围） | 跨进程复制失败恢复、分段embedding503/检查点续跑、单文件重试、同副本和outbox完成清除；供应商为替身，真实服务证据另列。 见 retrieval-acceptance-audit.md 最新恢复证据。 |
| 超强检索spec.md · RET-A05 | 已验证（对应范围） | retrieval-heldout-result-v2：先冻结问题hash，53来源/120段，18/20及无答案2/2。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · RET-A06 | 已验证（对应范围） | 组合过滤与跨项目同名、完整分页及旧候选补取专项。 详见 retrieval-acceptance-audit.md。 |
| 超强检索spec.md · Embedding 选型补充：使用 Qwen | 共享验收已关联 | Qwen实际留出样本、分集合迁移/启用/回退及10月8日转写改版真实Qwen/Qdrant已验证，见retrieval-acceptance-audit.md与qwen-activation/rollback/transcript-retrieval产物；不重复全库计算。 |
| 超强检索spec.md · 过滤与校验补充（2026-09-29） | 分项证据已关联 | 逐项实现/执行证据与边界见24-validation-evidence-index.md，并回查本模块验收对照；RES V06/V07真实联网仍属G04，不能据此宣称全部风险消失。 |
| 长期记忆plan.md · MEM-01 | 已验证（对应范围） | 仅用户消息提炼与严格schema；memory-live稳定事实/临时问题两类真实样本通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-02 | 已验证（对应范围） | memory-review选后生效/回执；memory-operation手动创建、编辑及断响应恢复；不直接激活候选。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-03 | 已验证（对应范围） | 混合优先+适用active全量分批；未索引补查、多旧冲突及85条后真实更新冲突通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-04 | 已验证（对应范围） | 跨入口两个胜出顺序、多旧冲突、事务回滚及来源并发均有定向证据。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-05 | 已验证（对应范围） | 真实Qwen状态/范围排除及成果采用；CHAT/PET/RES/成果共用权威状态与来源版本复核。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-06 | 已验证（对应范围） | 管理/冲突/范围网页证据，source-review与artifact-live-memory最新网页均通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-07 | 已验证（对应范围） | 会话摘要存settings，记忆正文/确认存SQLite，Qdrant可重建；要事与任务独立kind。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-08 | 已验证（对应范围） | N+4/N+5生命周期、PET有效批次排除/回源/共享刷新已按当前契约复核。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-A01 | 已验证（对应范围） | memory-review选一弃二/原子写入；memory-live排除candidate和paused。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-A02 | 已验证（对应范围） | 手动启用/编辑/恢复与对话共用检查；85条后真实冲突样本通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-A03 | 已验证（对应范围） | memory-cross-entry及operation并发胜出/迟到拒绝；失败事务不丢旧事实。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-A06 | 已验证（对应范围） | 生命周期N+4/N+5、失败与其他话题不计、过期确认拒绝；PET有效提示一致。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-P01 | 已验证（对应范围） | 人工候选、共用检查及手动/对话提交守卫；A01/A02/A03证据已对应。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-P02 | 已验证（对应范围） | 全量补查与混合排序；A02/A05及真实85条后冲突证据。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-P03 | 已验证（对应范围） | 来源/配置/新旧revision复查、同事务替换；A03/A04及来源并发证据。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-P04 | 已验证（对应范围） | 冲突和范围管理网页、来源复核及真实成果采用解释均有证据。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · MEM-P05 | 已验证（对应范围） | A06/A07、PET共享批次及项目分组证据；旧用途不扩大。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆plan.md · PET-P01 | 已对应证据 | pendingMemoryBatches、原轮次导航、五轮退出和统一六来源提示已有证据；见MEM/PET对照。 |
| 长期记忆plan.md · 补充实施项：接入小九统一提醒 | 已对应证据 | pendingMemoryBatches、原轮次导航、五轮退出和统一六来源提示已有证据；见MEM/PET对照。 |
| 长期记忆plan.md · Embedding 迁移补充：Qwen | 已对应证据 | Qwen已实际切流/回退，真实MEM八项及成果记忆采用证据；见RET/MEM对照，不重复迁移。 |
| 长期记忆plan.md · Q04 实施补充：共享项目与聚合入口 | 已验证（定向） | 项目记忆分组按 scopeKind/project + 稳定 scopeId 查询；分页、同名隔离、改名保留、分组失败隔离已验证，管理仍走记忆确认入口 |
| 长期记忆spec.md · MEM-01 | 已验证（对应范围） | 仅用户消息提炼与严格schema；memory-live稳定事实/临时问题两类真实样本通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-02 | 已验证（对应范围） | memory-review选后生效/回执；memory-operation手动创建、编辑及断响应恢复；不直接激活候选。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-03 | 已验证（对应范围） | 混合优先+适用active全量分批；未索引补查、多旧冲突及85条后真实更新冲突通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-04 | 已验证（对应范围） | 跨入口两个胜出顺序、多旧冲突、事务回滚及来源并发均有定向证据。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-05 | 已验证（对应范围） | 真实Qwen状态/范围排除及成果采用；CHAT/PET/RES/成果共用权威状态与来源版本复核。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-06 | 已验证（对应范围） | 管理/冲突/范围网页证据，source-review与artifact-live-memory最新网页均通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-07 | 已验证（对应范围） | 会话摘要存settings，记忆正文/确认存SQLite，Qdrant可重建；要事与任务独立kind。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-08 | 已验证（对应范围） | N+4/N+5生命周期、PET有效批次排除/回源/共享刷新已按当前契约复核。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-09 | 已验证（对应范围） | scope及用途兼容、稳定ID项目聚合、最终来源版本和人工复核网页已验证。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-A01 | 已验证（对应范围） | memory-review选一弃二/原子写入；memory-live排除candidate和paused。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-A02 | 已验证（对应范围） | 手动启用/编辑/恢复与对话共用检查；85条后真实冲突样本通过。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-A03 | 已验证（对应范围） | memory-cross-entry及operation并发胜出/迟到拒绝；失败事务不丢旧事实。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-A04 | 已验证（对应范围） | 真实pause-before-vector-cleanup；source/state守卫与来源复核网页。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-A05 | 已验证（对应范围） | 真实Qwen语义改写/专有词/范围过滤；成果真实采用记忆及历史快照网页。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-A06 | 已验证（对应范围） | 生命周期N+4/N+5、失败与其他话题不计、过期确认拒绝；PET有效提示一致。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · MEM-A07 | 已验证（对应范围） | memory-scope未知范围/扩大范围/旧用途；真实项目话题过滤及来源版本复核。 详见 memory-acceptance-audit.md 原始编号收口。 |
| 长期记忆spec.md · 补充：小九统一提醒（用户最新确认） | 已对应证据 | pendingMemoryBatches、原轮次导航、五轮退出和统一六来源提示已有证据；见MEM/PET对照。 |
| 长期记忆spec.md · Embedding 选型补充：使用 Qwen | 已对应证据 | Qwen已实际切流/回退，真实MEM八项及成果记忆采用证据；见RET/MEM对照，不重复迁移。 |
| 长期记忆spec.md · 过滤与校验补充（2026-09-29） | 已对应证据 | V01/V02/V05/V18/V19映射及边界已在24号文档列出；MEM-A01–A07编号证据见模块对照。 |
| 14号风险 V01 | 已对应定向证据，边界见索引 | 跨模块输出；见 [24号证据索引](24-validation-evidence-index.md) V01 行及关联模块对照。 |
| 14号风险 V02 | 已对应定向证据，边界见索引 | 候选/已选/提交；见 [24号证据索引](24-validation-evidence-index.md) V02 行及关联模块对照。 |
| 14号风险 V03 | 已对应定向证据，边界见索引 | 混合检索范围；见 [24号证据索引](24-validation-evidence-index.md) V03 行及关联模块对照。 |
| 14号风险 V04 | 已对应定向证据，边界见索引 | 同内容多来源；见 [24号证据索引](24-validation-evidence-index.md) V04 行及关联模块对照。 |
| 14号风险 V05 | 已对应定向证据，边界见索引 | 向量版本与未索引记忆；见 [24号证据索引](24-validation-evidence-index.md) V05 行及关联模块对照。 |
| 14号风险 V06 | 已对应定向证据，边界见索引 | 联网错误分类；见 [24号证据索引](24-validation-evidence-index.md) V06 行及关联模块对照。 |
| 14号风险 V07 | 已对应定向证据，边界见索引 | 来源与覆盖标签；见 [24号证据索引](24-validation-evidence-index.md) V07 行及关联模块对照。 |
| 14号风险 V08 | 范围外：ACT待讨论 | 独立ACT工具授权；见 [24号证据索引](24-validation-evidence-index.md) V08 行及关联模块对照。 |
| 14号风险 V09 | 已对应定向证据，边界见索引 | 监督条件与人工完成；见 [24号证据索引](24-validation-evidence-index.md) V09 行及关联模块对照。 |
| 14号风险 V10 | 已对应定向证据，边界见索引 | 实例身份与改期；见 [24号证据索引](24-validation-evidence-index.md) V10 行及关联模块对照。 |
| 14号风险 V11 | 已对应定向证据，边界见索引 | 分类与人工优先；见 [24号证据索引](24-validation-evidence-index.md) V11 行及关联模块对照。 |
| 14号风险 V12 | 已对应定向证据，边界见索引 | 图文实际读取范围；见 [24号证据索引](24-validation-evidence-index.md) V12 行及关联模块对照。 |
| 14号风险 V13 | 已对应定向证据，边界见索引 | 异步草稿与图片副本；见 [24号证据索引](24-validation-evidence-index.md) V13 行及关联模块对照。 |
| 14号风险 V14 | 已对应定向证据，边界见索引 | 固定会话与五条引用；见 [24号证据索引](24-validation-evidence-index.md) V14 行及关联模块对照。 |
| 14号风险 V15 | 已对应定向证据，边界见索引 | 迟到回复与摘要；见 [24号证据索引](24-validation-evidence-index.md) V15 行及关联模块对照。 |
| 14号风险 V16 | 已对应定向证据，边界见索引 | 复核依赖签名；见 [24号证据索引](24-validation-evidence-index.md) V16 行及关联模块对照。 |
| 14号风险 V17 | 已对应定向证据，边界见索引 | 要事关联与生命周期；见 [24号证据索引](24-validation-evidence-index.md) V17 行及关联模块对照。 |
| 14号风险 V18 | 已对应定向证据，边界见索引 | 未知冲突不得无冲突；见 [24号证据索引](24-validation-evidence-index.md) V18 行及关联模块对照。 |
| 14号风险 V19 | 已对应定向证据，边界见索引 | 全入口原子确认；见 [24号证据索引](24-validation-evidence-index.md) V19 行及关联模块对照。 |
| 14号风险 V20 | 已对应定向证据，边界见索引 | 配置版本与隔离恢复；见 [24号证据索引](24-validation-evidence-index.md) V20 行及关联模块对照。 |
| 14号风险 V21 | 已对应定向证据，边界见索引 | 提示表一致快照；见 [24号证据索引](24-validation-evidence-index.md) V21 行及关联模块对照。 |
| 14号风险 V22 | 已对应定向证据，边界见索引 | 导入每行去向；见 [24号证据索引](24-validation-evidence-index.md) V22 行及关联模块对照。 |
| 14号风险 V23 | 已对应定向证据，边界见索引 | 重复核对而非丢账；见 [24号证据索引](24-validation-evidence-index.md) V23 行及关联模块对照。 |
| 14号风险 V24 | 已对应定向证据，边界见索引 | 分类金额人工核对；见 [24号证据索引](24-validation-evidence-index.md) V24 行及关联模块对照。 |
| TECH-01 | 实际接入与定向恢复已验证 | 文件/ASR、索引、要事/监督、调研进入SQLite+BullMQ；实际worker断线恢复及业务去重证据见24号TECH-01、22号运行说明，不把历史PID作当前健康证明。 |
| TECH-02 | 实际图/检查点/恢复已验证；联网另验 | LangGraph跨进程确认/恢复、隔离备份续跑、当前队列网页及真实知识降级样本；真实Brave/费用仍待G04，见24号TECH-02。 |
| TECH-03 | 已逐模块接入并有定向证据 | 公共Zod加各业务关联/状态/版本守卫、合法保存与错误草稿恢复；见24号V01/V02及各模块对照，不以schema保证语义正确。 |

## 连续执行记录

- 2026-09-29：启动核对和基线归档完成；未运行全量测试。下一步实现SET输入校验及配置/探测基础。

### 2026-09-29 · 第一批基础实现

- 依赖：zod 4.6.5、bullmq 6.3.9、@langchain/langgraph 1.4.18、ioredis（以 package-lock.json 锁定为准）。npm 安装完成，未替换旧业务框架。
- Redis 7.0.15 Ubuntu包及依赖解压到 `.local-runtime/redis`，未修改系统服务；`scripts/start-queue.sh` 前台本地绑定127.0.0.1:6381、AOF everysec、noeviction。真实队列测试使用临时目录/临时端口，测试进程已退出；生产队列尚未启动。
- `server/validation.mjs`：公共 Zod 错误适配，设置字段严格类型/未知字段校验；不返回原始敏感值。设置现有事务保留，并在事务内更新能力配置版本。
- `server/index.mjs`：旧模型连接测试在配置变更后返回409，不能把旧成功结果当新配置成功。
- `server/ai-log.mjs` / `engine.mjs`：脱敏任意格式的已知密钥、嵌套凭据字段和内联图片；保留业务请求/响应可追踪内容。
- `server/background-jobs.mjs`：可与业务事务组合的SQLite任务/outbox，幂等输入校验、执行租约/令牌、取消/失败/重试、结果与业务写入同事务；BullMQ实际worker和对账投递基础。尚未接生产API，未在在线数据库新增表。
- 校正早期判断：设置原路由已有事务与原子性测试，未将其当作新修复；本次补的是严格输入与探测版本边界。

证据：

| 命令/场景 | 结果 | 范围与限制 |
| --- | --- | --- |
| `node --test --test-name-pattern='settings mutations|settings schema|model probe|logs redact|AI calls log' tests/api.test.mjs tests/ai-log.test.mjs` | 5/5通过 | 隔离API+模型桩；设置原子性、错误类型不清密钥、探测乱序、日志脱敏。不是实际云模型能力验收。 |
| `node --test tests/background-jobs.test.mjs` | 4/4通过 | 事务回滚/幂等、过期worker与取消、提交回滚、真实Redis/BullMQ重复投递及离线SQLite保存。尚未验证真实业务恢复/进程强杀/Redis重启补投全过程。 |

下一步：先为新增后台任务的实际接入准备一致性数据备份和迁移记录；扩展SET能力配置/探测契约，再将REC文件解析接队列，继续逐模块推进。整体目标仍 active；没有把任何整个模块标为已验收。

### 2026-09-29 · 备份基础与网页闭环

- `server/backups.mjs`：Node SQLite在线快照、读连接data_version前后检查、原件复制与哈希、manifest v1、DB完整性/实体版本/附件与资料副本引用校验。只在不存在的新目录恢复，损坏/路径穿越/缺文件中止并清理自己的临时目录。
- 默认导出剔除配置密钥/访问凭据/设备与网页登录会话，secure_delete+VACUUM避免残留；显式includeSecrets仅用于本地迁移备份。暂不声称覆盖未来所有新增实体间的语义引用规则。
- 实测修复：快照保留WAL模式导致验证后出现清单外文件，已切成独立DELETE journal快照；搜索密钥字段漏删已补测试并修正。
- 已创建并校验真实迁移前备份 `.data/backups/before-goal-foundation-20260929`，28个文件，含凭据的本地受限备份，不可网页下载；没有替换在线库，也没修改E盘。
- `backup-routes.mjs` / `BackupPanel.tsx`：认证后的创建、ZIP下载、隔离恢复验证；错误可见、忙时防重复提交，JSON与完整备份区别明确。恢复验证使用临时目录，完成后清理，不修改业务数据。
- `scripts/backup-data.mjs` 与 README：提供create/verify/restore命令和边界。Vite额外禁止访问`.local-runtime`。
- 本轮使用 UI/UX Pro Max 的异步反馈/防重复提交指导；保持现有设置面板样式。

| 验证 | 结果 | 证据范围 |
| --- | --- | --- |
| `node --test tests/backups.test.mjs` | 3/3通过 | 混合实体+附件恢复、默认凭据排除、损坏/路径穿越/覆盖已有目录拒绝、显式私有备份 |
| `npm run check`、`npm run build` | 通过 | 当前TS与网页构建；无重复全量测试 |
| `bash scripts/test-browser.sh tests/e2e/backups.spec.ts --project=desktop` | 1/1通过 | 实际页面创建/ZIP下载/隔离恢复验证，前后notes/events一致，无运行时错误和横向溢出 |
| 真实4317服务重启/health | 通过 | 保留原进程环境后启动PID 951199；5173原Vite保留，4435未操作。启动初期502随后健康；直接本地请求确认ok。 |

下一步：SET独立能力配置/探测与配置版本绑定（文本/视觉/embedding/Qdrant/search/ASR/队列）；已有迁移前备份可供任务账本接入前使用。随后REC真实文件解析进入BullMQ。TECH-01–03与其他模块仍未完成，不可标goal完成。

### 2026-09-29 · 独立能力配置与探测

- `server/capabilities.mjs` / `CapabilitiesPanel.tsx`：文本、视觉、Embedding、Qdrant、搜索、ASR、说话人、队列分别列配置/结果。探测绑定配置版本与有效值，变更后旧结果隐藏，迟到结果不能保存为新配置成功。
- 已支持独立图片模型与沿用文本配置，`complete`图片路径实际选择visionProvider；要事图片/账单OCR/图片总结对应能力检查同步。检索可保存Embedding地址/名称/密钥与Qdrant地址，空密钥保留原值。索引轮询在未配置时空转，后续保存配置可被检测到，不要求重启。
- Qdrant仅只读连接验证、Redis仅PING，界面明确不代表索引质量或worker业务执行。ASR/说话人尚未接入并明确显示，不冒充可用。
- 探测使用非个人测试提示/有效32×32 PNG；补PNG块CRC检查，避免用损坏测试图误判服务。Embedding通过实际embed函数返回维数，测试结果不输出向量或密钥。
- `validation.mjs`增独立配置严格schema；沿用现有事务与配置版本。尚未完成其他模块全部输入校验。

| 验证 | 结果 | 范围 |
| --- | --- | --- |
| `node --test --test-name-pattern='capabilities separate|model probe|settings schema' tests/api.test.mjs` | 3/3通过 | 隔离HTTP模型、真实API路由；配置校验、独立视觉路由、分项成功/失败、密钥不回传、结果失效 |
| 修复探测PNG后定向重跑 `--test-name-pattern='capabilities separate'` | 1/1通过 | 新增PNG CRC/尺寸断言；没有重复无关测试 |
| `npm run check` 与 `npm run build` | 通过 | 类型/网页编译 |
| `bash scripts/test-browser.sh tests/e2e/capabilities.spec.ts --project=desktop` | 1/1通过 | 图片独立配置保存/刷新、失败显示、ASR未接入、切回文本配置、无横向溢出 |

4317已保留原环境重启到PID953236并健康，5173沿用；没有修改现有用户模型配置、E盘或手机端。本轮不是Qwen迁移、真实视觉/语音质量或TECH全部验收。

下一步优先接REC文件解析/录音后台任务：迁移前备份已具备，后台账本和Redis基础已验证；需把队列真正用于保存原件后的解析、进度、取消、失败重试与恢复，再推进ASR和分类/项目基础。SET剩余预算、问题表、运行关联日志和新增数据备份随模块补齐。


### 2026-09-29 · 文件解析接入真实队列

- `server/file-jobs.mjs` / `file-worker.mjs`：PDF/DOCX先保存原件，在同一SQLite事务中创建解析任务；独立进程通过Redis/BullMQ提取文字，提交前再次核对记录/附件版本。取消、编辑或删除后的旧结果不能覆盖正文；失败可手动重试。
- API按工作目录隔离队列名称，自动启动/监护worker；worker不执行演示数据初始化或将其他运行中成果标成中断。SQLite增加busy_timeout以配合独立进程。
- 导入接口可携带opId，结合原件哈希及来源验证幂等；重复上传临时文件会清理，同一操作不同输入返回409，旧记录删除后返回410。
- `ProcessingStatus.tsx`在详情显示处理状态、失败原因、取消和重试，完成时更新正文。网页验收发现编辑表单仍使用导入时空正文，已改为点击编辑时读取最新记录，再恢复已有本地草稿；修复后需使用新构建验收。
- `scripts/ensure-queue.mjs`及启动入口尝试启动本地Redis；默认localhost:6381，AOF everysec/noeviction，日志在.data/logs/redis.log。直接运行API时需自行确保Redis可用；离线时原件和待投递任务留在SQLite。
- 新建并验证迁移前备份 `.data/backups/before-file-jobs-20260929`（28文件，显式本地保留凭据），没有替换在线数据。

| 验证 | 结果 | 范围 |
| --- | --- | --- |
| 定向API：真实PDF/DOCX/GB18030/图片/音频导入、文字图片归纳、坏PDF幂等导入 | 3/3通过 | PDF/DOCX使用真实Redis+worker；模型归纳使用桩，音频仍明确未转写；坏原件失败后可下载、重试、取消 |
| `node --test tests/file-jobs.test.mjs` | 1/1通过 | 实际PDF提取；解析期间编辑、取消、删除，不覆盖用户内容 |
| `npm run check`、`npm run build` | 通过 | 编辑表单修复包含在新构建中 |

本轮仅完成文件解析链路的一部分。后台解析后AI归纳仍由按钮触发；ASR、自动分类、索引/提醒迁入队列、进程强杀与Redis重启后的完整恢复仍待后续验收，REC和TECH-01未标完成。

- 网页定向验收 `bash scripts/test-browser.sh tests/e2e/file-processing.spec.ts --project=desktop`：1/1通过，上传PDF后无需重新打开即可显示解析正文，点编辑读到解析后的内容。首轮暴露空编辑器，修复后一次误用旧dist复测，重新构建后通过；没有重复全量测试。
- 在线4317保留原环境重启至PID956980，迁移任务表并启动独立worker；5173原开发服务继续使用，未修改E盘或手机端。


### 2026-09-29 · 队列恢复边界与ASR资源核验

- 上一轮属于有效进展：真实文件任务、网页解析/编辑流程已通过。继续补TECH-01故障恢复证据。
- 修复`background-jobs.mjs`：过期租约不能通过心跳重新变有效，迟到异常不能将过期待恢复任务改为失败；心跳数据库异常交给错误处理，避免定时器未捕获异常。BullMQ锁/失联检查时间可注入，生产默认保持30秒。
- `node --test tests/background-jobs.test.mjs tests/queue-recovery.test.mjs`：5/5通过。隔离真实Redis持久化目录和SQLite，运行中worker被SIGKILL后新worker恢复，业务结果仅提交一次；停止Redis后创建的任务重启后完成。测试短租约/锁验证恢复机制，不声称生产恢复耗时相同；现有文件版本隔离证据仍适用。
- ASR硬件核验：WSL可见32逻辑CPU、约15GiB内存（当时可用约9.7GiB）、RTX5060 Laptop 8GiB。系统Python未安装ASR包，没有ffmpeg命令。开始项目隔离venv，候选为faster-whisper small CPU int8和sherpa-onnx分离；先测样本，不以GPU存在直接宣称CUDA兼容或识别质量合格。
- 官方依据：[faster-whisper](https://github.com/SYSTRAN/faster-whisper)（PyAV解码，无需独立ffmpeg命令）、[small模型](https://huggingface.co/Systran/faster-whisper-small)、[sherpa-onnx分离](https://k2-fsa.github.io/sherpa/onnx/speaker-diarization/index.html)。尚未接入业务或改动能力面板可用状态。

- ASR环境准备：`.local-runtime/asr-venv`已建立。`scripts/asr/requirements.txt`固定候选依赖，初选sherpa-onnx版本无可用wheel，改为索引实际提供的1.13.8；安装会话正在执行，不能当成安装成功。`prepare.py`只下载官方公开模型/样本到项目，`probe.py`做CPU时延、时间戳和说话人样本验证，尚未运行真实推理。

- 安装最终成功：faster-whisper1.2.1、sherpa-onnx1.13.8、soundfile0.13.1；锁定实际传递依赖，模型下载已启动，真实推理尚待下载完成后执行。
- 在线API956980仍健康，仅重载文件worker到PID958592，过期租约修复已进入实际worker；未重启或更改其他服务。


### 2026-09-29 · ASR真实样本与转写契约

- 上轮为有效进展（队列恢复修复及5项通过、ASR依赖安装）。本轮先接续原下载会话，确认small模型/分离模型及两份公开样本下载完成，未重启下载。
- CPU int8 small试验：中文56.86秒录音耗时13.66秒（含分离），峰值约743MiB；英文16秒耗时7.49秒，峰值约667MiB。两例同时运行，仅为资源和样本初测，不是长录音吞吐保证。
- 质量未通过：中文有明显错词，自动分离把官方四人样本拆为7人；英文两人样本分出2人。阈值0.6/0.7/0.8对照：中文7/5/5人，英文均2人；没有强制传入正确人数冒充自动识别。保留原始JSON，继续试验更强large-v3-turbo（faster-whisper库映射的模型仓库）；下载仍在进行。
- `server/transcripts.mjs`：严格Zod结果契约，时间合法性/递增/时长范围、匿名speaker ID、部分分离失败保留文字且不伪造说话人。`node --test tests/transcripts.test.mjs`2/2通过。
- `scripts/asr/alignment.py`按词时间与分离时间重叠分配匿名ID；没有依据则null，词时间缺失/不一致保留原段文字。`test_alignment.py`2/2通过，覆盖中文/英文/标点不丢与时长越界。
- `transcribe.py`独立进程原型：有界音频解码、阶段JSON、只加载本地模型、分离部分失败可见、Linux父进程退出保护。暂定单件处理上限30分钟是资源保护上限，尚未长录音质量验收。未接网页、未改变能力面板ASR不可用状态。

- 英文真实原型运行通过：`transcribe.py --model small --language en`输出decoding/transcribing/diarizing/completed，结果经JS Zod校验通过（16秒、5段、2个匿名说话人，未覆盖的起始词保持unknown，不猜身份）。
- `server/local-asr.mjs`接Node独立进程、UTF-8流解码、结构校验、超时/来源变化取消、输出上限与离线模型加载。用真实英文原件经Node适配器验证通过；尚未接队列/HTTP/UI，不能视为REC-A09通过。
- large-v3-turbo下载仍在既有会话14993（PID959686）运行，最后观察下载目录约174MiB。继续应先轮询同会话确认结果，不能因输出暂缺重启下载。中文质量问题仍未关闭。
- Node适配器真实取消检查通过：来源检查返回false后约539ms子进程退出、Promise拒绝，没有提交转写。未运行无关全量测试或网页构建（本轮无网页代码变更）。

### 2026-09-29 · 录音任务与转写编辑接入

- 前轮为有效进展：真实ASR样本、结果契约、独立进程和取消验证。本轮接续下载，turbo模型下载结束；首次推理因缺vocabulary.json失败，已补下载白名单和可用性检查，后续加载成功。
- turbo中文56.86秒公开样本CPU运行：转写22.32秒、含分离28.01秒，峰值约1650MiB。相较small找回遗漏语句，仍有中文错词；自动分离仍5人而非样本4人，质量问题保留，不宣称完美/全模块通过。
- `server/audio-jobs.mjs`与worker：录音原件选择、事务任务、进度、取消、来源版本保护；成功转写保存transcript及transcriptOriginal，正文附记不覆盖。分离失败保留文字并标partial。请求/结果/错误进入既有AI终端与文件日志。
- 转写编辑API要求note revision和transcriptRevision；只修订文本保留时间段，旧请求409；修改后AI总结标过期，再归纳读取附记+转写并保存对应转写版本。录音导入暂仍需详情点击开始转写，自动触发与浏览器录音待后续。
- `TranscriptPanel.tsx`显示阶段、时间段、匿名说话人/待核对、失败重试及编辑；草稿本地保留。采用UI/UX技能的分阶段反馈/错误恢复指导，沿用现有样式。
- `node --test tests/audio-jobs.test.mjs tests/transcripts.test.mjs`3/3通过：原件/附记保留、分离部分失败、旧源拒绝和严格时间校验。网页首轮真实ASR已跑通到结果，测试误将跨说话人段落文本视为连续DOM而失败；已改为核对分段文本拼接，并将亚秒时间显示为小数以免短词显示相同起止秒。
- 网页真实链路复测：`ASR_MODEL=small bash scripts/test-browser.sh tests/e2e/transcription.spec.ts --project=desktop`1/1通过（实际Python模型+Redis+worker+API+页面），转写显示/原件回听/人工修订/原始转写保留/旧revision拒绝/无横向溢出。此例用small英文验证业务链路，不冒充turbo中文质量验收。
- `npm run check`及新构建通过；队列基础定向回归4/4通过。ASR设置卡片文案已注明录音详情接入、该卡片独立探测尚未实现，后续统一能力状态。网页录制、说话人修订、自动发起及真实总结联验仍待完成。

- 已创建验证备份 `.data/backups/before-audio-transcripts-20260929`（28文件、本地含凭据），保留原环境重启API至PID963524并health通过；录音详情入口与队列已在当前网页服务生效。未动手机端与E盘原件。

### 2026-09-29 · 网页直接录音与丢响应重试

- 上轮是有效进展：录音任务/文字修订、真实模型网页链路与部署完成。本轮核对发现已有Recorder组件，直接补齐其可靠性，没有另建重复录音入口。
- `Recorder.tsx`增加麦克风请求中状态与重复点击防护、权限拒绝/无设备/格式不支持/非安全上下文说明；关闭后迟到授权立即释放音轨。
- 浏览器选择支持的音频格式，停止后可试听和下载本地备份；30分钟或接近24MiB自动停止，保留已录内容。上传失败保留File和试听，刷新/关闭页面提示未保存；重新录制替换旧录音需确认。
- 原始File文件名及opId在录音停止时固定，上传重试不再变输入，服务器已保存但响应丢失后不重复创建记录。
- `npm run build`（含类型检查）通过；`bash scripts/test-browser.sh tests/e2e/recorder.spec.ts --project=desktop`2/2通过。真实Chromium MediaRecorder使用模拟麦克风设备，API和文件保存是真实链路；覆盖丢响应后重试仅1条记录、音频仍可试听/下载、权限拒绝后仍可重试。不是实际用户麦克风音质或局域网HTTPS验收，不重复ASR全流程。
- 原有API无需重启，网页新构建已生效。REC-10/P07/A09更新为进行中；说话人手动核对/修订、自动发起策略、真实总结联验与长录音边界继续推进。

### 2026-09-29 · 说话人修订与真实模型归纳

- 上轮网页录制/重试为有效进展，本轮继续REC链路。转写编辑现可逐段选择匿名说话人或待核对；人工选择保留在修订版，transcriptOriginal不变，时间段不可越权修改。草稿含说话人选择，保存同时检查note/transcript版本，旧总结标过期。
- `ASR_MODEL=small bash scripts/test-browser.sh tests/e2e/transcription.spec.ts --project=desktop`1/1通过（真实本地ASR/Redis）：将原先待核对片段改为说话人2，文字一并修订，原始分段说话人仍为null；旧revision提交409。新构建含类型检查通过，后台音频版本单测1/1通过。
- 归纳输入加入转写时间与匿名说话人标记，明确不能推断真实身份。修复既有静默截断：超过12,000字的输入明确422并保留全文，超过800字的模型输出明确502，不再截断后保存为完整摘要。长录音分段归纳仍待补，不据此关闭长文验收。
- 使用隔离临时数据库、现有真实文本模型及公开中文turbo转写进行一次归纳验证：HTTP200、有效正文返回，原始识别错词仍会传入摘要，故需用户核对。结果存`artifacts/asr-summary-check.json`，日志脱敏，临时库已清理；未使用个人录音或修改用户资料。这是实际模型函数链路验证，尚非“网页直接录制→完整总结”的整条验收。
- 定向API归纳测试1/1通过，新增超限输入不发模型请求、超限输出不改旧摘要或revision；普通文字和图片归纳保持通过。在线API保留原环境重启到PID965868并健康，网页已可修订说话人。

### 2026-09-29 · 长内容分段归纳

- 上轮为有效进展（说话人修订和真实短录音归纳）。本轮将上一轮超过12,000字明确拒绝的临时边界升级为分段处理：12,000字以内走原有单次归纳，以上按约10,000字分段，再汇总全部分段摘要；最大100,000字，超过明确报错，不静默截断。
- `server/long-summary.mjs`保留所有字符/换行，避免拆开UTF-16代理对；每段≤800字结果约束。任一段失败、输出空/过长或模型finish_reason=length，不保存部分摘要。全部调用共用100秒预算，模型请求受剩余时间限制；最终保存仍校验记录版本。
- 来源在处理过程中变化时，前后检查会停止后续模型请求，不能继续汇总过期资料。中间摘要不覆盖记录正文或已有最终摘要。
- 定向验证6/6通过：分段拼接等于原文、末尾关键内容进入模型及最终汇总、失败中断、超限拒绝、共享时间预算、来源变化停止、真实API文字/图片兼容。没有重复无关网页或手机测试，本轮无网页代码变更。
- 真实模型3次调用（2段+汇总）验证通过：人工构造长文末尾的“本周五由用户确认研究计划；禁止自动确认，尚未完成”保留到最终摘要。证据`artifacts/long-summary-check.json`；隔离临时库已清理、未读取个人录音。这不代替真实长录音识别质量验收。
- 在线API保留原环境重启至PID966815，health通过；新长文归纳逻辑生效。REC录音剩余独立能力探测、自动处理和完整录制到总结联验仍未关闭；下一步推进分类/项目实体与人工纠错，避免以录音局部通过冒充模块全部完成。

### 2026-09-29 · 分类与项目基础接口

- 上轮长归纳为有效进展。本轮创建并验证迁移前备份`.data/backups/before-categories-20260929`（28文件、本地含凭据），再接入分类初始化，未改旧note正文、附件或历史项目字符串。
- `server/categories.mjs`：九个固定类别稳定ID/顺序/名称，幂等初始化；开发项目类别显式projectId，名称NFKC/大小写标准化去重。固定类别禁止改名，开发类别改名保留ID。
- 人工单条/批量改类同事务登记classificationCorrection，保存旧/新类别、来源/分类器版本、模型/提示版本、可选原因及处理状态；操作ID重试不重复，同ID异输入409；批量任一旧版本失败整体不写。不会自动训练或修改代码。
- 共享project稳定ID、显式来源绑定、按类型分页查询与改名；同名项目仍为不同ID，旧字符串不猜测归并。创建可带opId防网络重试重复；同名称的新操作仍可明确创建不同项目。当前覆盖note/event/libraryFile/artifact，其他模块接入和项目聚合页面仍待补。
- `node --test tests/categories.test.mjs`通过：实际HTTP接口+SQLite，九类重入、重名校验、改名保留关联、改类保正文/图片/threadId、重试反馈唯一、批量旧版本回滚、同名项目隔离、纠错处理不抹历史。新增创建幂等边界后定向复测通过，未运行无关测试。
- 当前仅基础接口，尚未实现AI自动归类、分类/批量操作界面和项目聚合页面，不据此关闭REC分类验收。
- 在线API保留环境重启到PID968192，health通过；只读核验正式SQLite已初始化9个固定类别。旧记录未批量推断归类。下一步补网页分类/项目入口，再接AI分类及迟到结果保护。

### 2026-09-29 · 网页分类整理面板

- 上轮分类事务/API为有效进展。本轮新增`CategoryTools.tsx`，记录页可按九类/开发项目类别/待分类筛选，弹窗选择最多100条做人工归类并登记纠错；选择记录时冻结提交revision，遇到并发更新由服务器整体拒绝。
- 新建开发项目类别需显式选择已有项目或新建独立项目，同名项目展示ID片段以区分。类别名称可修改且不变ID；创建/修改失败保留输入。提交期间阻止重复操作和关闭，选择已不在列表的记录仍有可见移除入口。
- Checkbox采用横排、固定尺寸和可滚动记录列表，避免此前全宽复选框挤掉正文的问题；使用既有UI/UX技能指导和现有主题。记录正文、标签、附件字段不由分类控件写入。
- `src/types.ts`新增可选categoryId/projectId兼容旧记录；本轮仍未把旧项目名称猜测迁移，也未自动给历史记录分类。构建/类型检查通过，网页定向验收正在进行。
- 首轮网页测试因关联项目下拉框缺明确accessible name定位超时；补aria-label后重新构建，`bash scripts/test-browser.sh tests/e2e/categories.spec.ts --project=desktop`1/1通过：新建项目类别→两条记录批量归类→类别改名→筛选仅两条，正文/标签/附件不变，纠错表两条且无横向溢出。提交期间关闭保护和类别空结果文案一并补齐。
- 网页新构建已生效，后端未改无需重启。下一步AI自动归类、记录详情/新建时的分类选择、反馈问题表界面、项目聚合与显式关联仍待实现，REC分类验收保持进行中。

### 2026-09-29 · AI自动单分类与人工优先

- 上轮分类整理网页为有效进展。本轮新增`classification.mjs`，新文字记录/文本导入、文档解析完成及录音转写完成进入真实BullMQ分类任务；不扫描历史库猜测归类。人工分类记录不自动重分。
- 模型从当时已有类别中只选一个，严格JSON/Zod检查字段/类型/长度及真实类别；保存时重验来源版本、人工状态与类别revision。超过12,000字走全文分段归纳后分类，记录inputMode，不静默截取正文。没有可读内容或模型不可用则任务失败，原件/正文不丢，详情显示原因可重试。
- 模型/提示版本、理由与来源版本存入classification，人工纠错可记录这些元数据。worker从API继承有效默认模型配置，避免独立DATA_DIR使默认私有模型配置丢失；未打印或复制密钥到文档。
- `ClassificationStatus.tsx`在详情显示类别/人工或AI来源、队列状态、失败重试和人工调整；用户手动选择后隐藏旧AI任务错误，不把迟到拒绝提示当当前人工分类失败。
- 后端3项定向通过：分类结果合法性、人工优先/旧正文拒绝、PDF/音频结果链路保留。已有API的2项幂等创建/归纳兼容通过；旧API测试显式关闭无关自动分类，专门分类验收开启实际worker，避免模型桩请求互相干扰。
- 网页`tests/e2e/classification.spec.ts --project=desktop`1/1通过（真实Redis/worker/API/UI，模型HTTP桩）：正常自动分类成功；延迟AI期间人工改为个人工作，再释放AI响应，仍保留人工分类且纠错只有一条。构建/类型检查通过。

- 真实模型单样本验证通过：人工构造读书笔记归入category-reading，模型/理由/版本写入，证据`artifacts/classification-check.json`；隔离临时库清理完成。这不是多类别准确率评估，不能以单样本宣称分类质量全部达标。
- 在线API保留环境重启到PID971740并健康，新worker含分类处理器；旧记录没有批量分类。下一步问题表查看/处理界面、项目聚合与新建记录时显式分类选择仍待补，相关REC/SET验收未关闭。

### 2026-09-29 · 分类纠错问题表界面

- 上轮自动分类与人工优先为有效进展。本轮新增`ClassificationCorrections.tsx`，入口在设置与数据；可按待处理/已处理/全部筛选，20条分页，查看原/新类别、原因、来源版本、分类器/模型/提示版本。
- 支持处理说明、标为已处理、重新打开；状态修改继续使用revision，错误保留输入，分页迟到请求不覆盖新筛选结果。处理只记录排查过程，不自动训练或改程序。
- 新纠错记录保存来源标题及类别名称快照，改名后仍可解释当时的纠错；旧记录兼容读取当前名称或失效占位。状态变化追加history，不覆写之前处理说明；没有删除历史的入口。
- `node --test tests/categories.test.mjs`通过，新增验证类别改名不改纠错快照、处理后重开仍有两次历史。构建/类型检查通过，网页流程验收中。
- 网页定向`classification-corrections.spec.ts --project=desktop`1/1通过：人工改类生成反馈→查看旧新类别→处理→已处理筛选→重开→两次历史均可见，原纠错记录仍只有一条，无横向溢出。没有运行无关或手机测试。
- 在线API保留环境重启至PID972790且health通过，分类反馈界面及历史已生效。项目聚合、新建时类别选择和分类范围其他联验仍待补，整体目标active。

### 2026-09-29 · 统一项目资料入口

- 新增ProjectsPanel，侧栏「项目资料」可创建/改名/选择稳定ID项目，记录、要事、文件、成果四组分别分页、加载和报错重试。记录打开原详情，其他类型可预览正文，文件只下载项目副本。原侧栏字符串入口标为旧项目标签，不静默合并历史数据。
- 显式类别关联projectId参与记录汇集；记录已单独指定projectId时以该关联优先。项目候选资料按类型/标题分页，只返回必要元数据；选中项在切换搜索或分页后仍保留，提交精确来源revision，冲突保留选择。不同来源聊天未合并，改名不改变来源ID/threadId。
- 后端定向categories测试通过：类别派生关联、同名隔离、显式项目优先、要事关联时旧版本拒绝、类型拒绝、分页、候选排除已关联来源、threadId不变。首次测试把Zod输入校验状态误写422，按现有统一协议修正为400后通过。
- 构建/类型检查通过；projects.spec.ts桌面浏览器1/1通过：类别笔记汇集、显式关联要事、跨搜索保留选择、文件组503不影响其他组且可重试、改名保留资料、打开原记录。没有运行手机或无关整套测试。
- 统一项目基础入口已实现，后续检索/记忆项目范围契约仍需分别接入验证；本轮不宣称所有项目联动或REC模块完成。

### 2026-09-29 · 新建和编辑时显式分类

- NoteEditor新增类别选择：默认自动分类，手选后与正文一并提交，文字草稿保留类别，失败不丢输入；编辑可保持已有分类。原项目输入标记为旧项目标签，与稳定projectId区别。
- 创建/PATCH/批量人工归类复用manualCategoryData，分类合法性与纠错信息同一事务保存。无效类别回滚正文/新记录，过期revision也回滚纠错；相同人工类别不重复登记。创建重试返回记录当前版本，避免异步修改后拿到旧缓存继续编辑。
- API定向2项通过：原创建/幂等/冲突/删除兼容；新分类原子性、手选优先、同op重试不重复登记、不同payload冲突、无效类别不产生记录。提取公共人工分类函数后，再验证categories和分类API均通过。
- 构建/类型检查通过；note-category.spec.ts桌面1/1通过：模拟保存503后类别/正文保留，重试成功，编辑改类，只有一条记录和两次人工分类反馈。没有跑手机端或无关回归。
- 项目入口在线重启至PID975139且health通过；本节分类保存后台将在验证后重启生效。REC仍进行中，导入时类别选择及录音/成果等全链路验收尚未关闭。

- 分类保存后端验证通过后已保留原环境重启，当前在线API PID976239；进入下一阶段前核对健康状态。

### 2026-09-29 · 导入类别与重试保真

- 上轮项目聚合/编辑分类有代码和验收证据，为有效进展。本轮本地上传新增ImportFile准备界面，可选择类别或默认AI归类；保留File和稳定opId，丢失响应后重试不会再生成随机op制造重复记录。确定未写入的4xx校验失败允许重新选类；响应不确定时保持本次输入，保存后可改类。电脑文件入口也可选类别，复制仅进入项目副本，未修改E盘原件。
- importStoredFile与新建/编辑/批量入口共用manualCategoryData；类别/纠错/记录同事务，解析任务以最终revision排队。幂等指纹含明确类别；未选择时兼容旧指纹。重试临时文件仍会清理。
- API定向2项通过：导入幂等/损坏原件可下载；无效类别不创建记录、人工分类与正文保真、丢响应重试同ID、不同类别同op拒绝、纠错仅一条。首次测试误用/files/下载路径，修正为现有/file/后通过。
- 构建/类型检查通过，网页2/2通过：真实PDF解析后保留人工类别；上传请求实际写入后模拟响应丢失，重试后只有一条原件记录和一条分类反馈。更新原有上传测试以适配准备界面，未运行无关整套或手机测试。

### 2026-09-29 · 每日待办来源去重与统一日期

- 新增todo-days.mjs：普通待办与监督既有口径统一Asia/Shanghai；保留已有day，不重写历史。请求日期严格校验，done必须boolean，不把字符串false视作完成。
- POST /todos/:id/carry按根来源+今天事务去重，保存直接来源、根来源、原日期和原revision；从中间转移项或最初来源再加入同一天得到同一项。不同来源同名可分别转移，历史状态不变。已完成/未来或当天来源、旧revision被拒绝；已删除的转移目标返回410，不以重试复活。
- TodoPanel按北京时间刷新今日列表，跨日前查看今天会自动切换，历史查看仍保留；来源提示可见，前端防重复改为来源ID，服务端才是最终保证。手工新增取提交当刻日期，避免刚跨午夜使用旧状态日期。
- 单元定向1项通过（跨日边界、真实闰日、来源/根来源去重、同名隔离、旧版本、完成状态、删除后不复活）。首次发现当天转移项会因提前命中幂等缓存绕过日期校验，已将日期资格检查移到缓存读取前并验证通过。
- 网页定向2/2通过：昨日历史保留且只转移一次；America/Los_Angeles浏览器在北京时间午夜后切到新日期，昨天完成状态仍可查。类型/构建通过。API另验普通待办兼容及4个并发转移只创建1项。
- 普通每日待办转移已验证；升级监督以及小九去重仍属后续SUP/PET需求，不能用这轮证据声称REC-12完成。总目标继续active。

- 本轮后端已保留原环境重启，在线PID978721。下一步核对成果编辑/下载版本及模式真实性，再补固定讨论和录音全链路等未关闭项。

### 2026-09-29 · 成果保存版本与模式真实性

- 上轮导入与普通待办为有效进展。本轮确认并修复任务下载长期读取首次生成旧文件的问题：成果下载和任务产物下载共用artifact-output，直接从SQLite当前保存revision生成Markdown，返回版本头、不缓存；指定旧revision报409。旧落盘文件保留但不再作为当前下载依据；新任务原始快照文件名带.r<revision>，明确对应原版本。
- 成果人工保存标为mode=human，originMode保留原model/local，网页列表和详情显示人工编辑。导出只能导出保存版本，编辑时禁用；导出前核对revision，其他设备已更新则明确提示重新打开。仅修改标题离开也提示未保存，避免漏掉标题改动。
- 生成时不仅检测来源删除，也拒绝期间revision变化；非空但finish_reason=length的残缺模型结果报错且不创建成果。生成资料最多30条及摘录范围有显式qualityNotice与coverage元数据，不能当完整阅读全文；来源校验未通过仍明确本地整理并保留错误说明。
- 构建/类型通过。任务下载定向1项通过（实际旧文件存在、数据库新正文、旧revision拒绝、删除后不可下载）；API成果持久/人工模式/下载及生成期间来源变更/截断输出2项通过。
- artifact-revisions桌面1/1通过：编辑时导出禁用、保存后人工标识、读取实际下载文件与保存正文相同、其他设备更新后旧窗口导出409且不覆盖当前显示内容。无手机端或无关整套测试。
- REC成果版本链路已补；模式真实性的空模型与来源校验分支仍需结合已有测试证据核对，长文滚动和来源打开的完整验收未全部关闭。下一步继续REC固定讨论/录音闭环及跨模块依赖，不宣称全模块完成。

- 成果后端按原环境重启，在线API PID980272，待health核对。

### 2026-09-29 · 来源固定讨论入口

- 上轮成果版本为有效进展。本轮新增source-threads：来源kind+稳定id使用确定映射键，在SQLite事务中建立独立thread实体，首次并发只建立一条；记录和转成的要事各自独立。返回当前来源标题/revision，不按同名推测合并历史对话。
- 删除话题会保留映射与thread删除状态，再从来源点击返回410，不静默新开或改绑。删除来源不级联删除讨论实体。请求在生成完成后重新校验thread删除状态和选中来源revision，防止删除/改动期间迟到写入。
- NoteEditor详情与Events要事卡片新增「与搭子讨论」。统一按钮取得服务端映射后跳转并自动引用；映射失败就地报错。Assistant单独读取选定话题全部历史，避免bootstrap最近200条截断使旧话题看似消失；历史加载失败禁发且可重试，不回退新会话。
- 后端API定向1项通过：四个并发入口同threadId、记录/要事同名隔离、空thread可首轮发送、来源改名/修订复用、旧引用标题快照不变、已删话题不能复活、删除来源不删除要事映射、未确认文件固定映射类型拒绝。
- 构建/类型检查通过；source-discussion桌面1/1通过：模拟历史503→发送禁用→重试→提问，改名/改正文后再次入口恢复原对话，两轮同threadId，当前引用与旧历史同时存在。
- 此轮仅补REC-08/CHAT-08共享入口与恢复链路。来源话题跨日/超过bootstrap历史量、要事按钮全链路、普通发送幂等、快速切换迟到响应和摘要状态完整管理仍需继续补证/开发。CHAT整体未完成，总目标active。

- 固定讨论后端按原环境重启，当前在线API PID981489。

### 2026-09-29 · 上下文覆盖与摘要状态

- 上轮固定来源入口有代码与定向证据，为有效进展。本轮重写thread-context：摘要记录covered IDs、原文内容/引用签名、version、更新时间；按实际历史顺序验签。覆盖内容变更、删轮次或旧摘要缺签名时停用text，原文保留可重建。摘要是会话压缩，不写长期记忆。
- 每次回答装配所有未摘要轮次，移除engine二次截取最近6轮及回答前500字的隐性丢失。上下文原文+摘要设18,000字符预算；超限明确报错，不静默丢中间历史。contextUsage保存历史签名、摘要版本、覆盖/原文ID及预算用量；生成完成后再核对历史指纹，变更则拒绝迟到保存。
- 摘要单批最多8轮、输入24,000字符、45秒、输出4,000字符硬限（提示目标1200字），截断/空结果拒绝；提交前校验整个话题快照和摘要版本。未归纳数量、状态、原因在GET context可见，新增POST更新摘要入口和网页按钮。
- 前端摘要读取增加请求失效保护，切换话题后旧请求不能覆写当前摘要。桌面context-switch1/1通过：延迟甲请求，先显示乙，再释放甲仍保留乙。构建/类型通过。
- thread-context单元1项通过：15轮无六轮缺口、8轮压缩后覆盖+原文仍涵盖15轮、内容修订停用旧摘要、生成期间修订拒绝迟到结果、版本推进、字符预算拒绝、删除话题不载入。context-prompt1项以真实HTTP模型桩验证9轮及500字之后的末尾条件均进入请求；source discussion API兼容1项通过。模型桩证明管线，不代表真实摘要语义质量。
- 尚未关闭CHAT-02：超长单轮>24,000字符目前明确要求分段压缩、长历史可能需多次更新；后续需要分段摘要、真实模型约束保真抽查和更完整token预算。线程目录/游标、普通发送幂等、作用域记忆也仍待实现，总目标active。

- 上下文后端保留原环境重启，在线API PID982937。

### 2026-09-29 · 独立话题目录与历史分页

- 上轮摘要覆盖与失效保护为有效进展。本轮GET /threads从全部conversation及有效thread实体建立目录，不依赖bootstrap最近200条；支持尚未发消息的来源话题、threadId缺失的旧独立会话。网页useThreadDirectory按30项加载，目录报错可刷新并保留已见条目。
- GET /threads/:id/turns改为最新30轮+游标，网页可向前加载更早消息；bootstrap仅更新已加载消息的新版内容，不再绕过分页把所有消息一次塞回界面。加载更多的迟到响应按话题请求代次拒绝，避免串到新话题。
- 游标含目录/话题作用域、内容签名、最后ID；无效/跨作用域标识400，分页期间数据变化409明确要求刷新，不静默漏项或重复。采用保守快照失效策略，继续浏览时可能需要重新加载。
- 修复旧消息ID兼作话题ID时写删除状态与conversation实体冲突：legacy状态写独立thread-state键，目录/历史/摘要统一识别删除状态，保留原文实体身份。
- thread-pages后端1项通过：205轮逐页完整读取且无重复、35项目录能找到2020旧话题、跨域/非法/过期游标拒绝、legacy删除不覆盖原文；摘要状态回归1项通过。构建/类型通过。
- 桌面2/2通过：超过30话题的更多目录、34轮话题先30再加载4；固定来源映射在分页后仍复用并保留历史引用。均为隔离测试库，无手机端或全库真实模型批量调用。
- 目录与分页基础完成，CHAT仍需发送幂等/切换中请求目标保护、超长上下文分段、作用域记忆及真实模型核对。下一轮继续补这些明确需求，不将已有局部验证当成全模块完成。

- 分页后端按原环境重启，当前在线API PID984469。

### 2026-09-29 · 发送幂等与话题切换保护

- 上轮话题分页为有效进展。本轮新增conversation-requests：新网页发送携带opId和来源revision，相同请求在当前API进程共用一次生成Promise；完成操作指纹与conversation同SQLite事务提交。已提交重试返回现存轮次，不重复提炼/写入；不同问题/话题/引用同op报409。旧无op客户端保持兼容，不能宣称它们已获得重试去重。
- 初始引用版本校验与原有提交前复核结合，用户看到的引用版本过期就报错，不能静默换成新版执行。删除后的操作保留墓碑、重试410不复活；首次测试发现store.remove会清理operation指纹，已调整为先检查删除状态再比指纹，修复错误409。
- Assistant发送固定请求快照，前端同步锁挡同帧重复点击；切换话题采用viewEpoch，迟到成功只写入原话题并提示，不把界面切回或清除新输入。输入框在原话题发送期间有新文字时也不清空。
- pendingConversation将未确认请求及引用快照放当前标签页sessionStorage；响应不确定时刷新仍恢复同op，请求成功或明确4xx拒绝才清除。读取校验本地结构；存储失败时给准确提示，页面内仍能重试。
- conversation-requests单元1项通过：并发一次生成、持久结果在新模块实例仍可复用、参数冲突、删除不重建、事务抛错无半条记录且可重试。API1项通过：三次并发同轮次、来源更新后旧已完成请求可重放、新请求旧引用拒绝、删话题后410。
- 构建/类型通过；send-retry桌面2/2通过：实际提交后丢响应，刷新恢复输入并同op重试仅一轮；延迟甲回答期间转到乙写新草稿，释放响应后仍在乙且草稿保留，回答只归甲。补刷新功能后重跑这2项，未跑无关整套或手机。
- 未完成范围仍包括长文本分段压缩/真实摘要约束核对、RET/MEM范围记忆、研究/监督/要事/小九和记账后续需求。只完成本次发送链路，不把整个CHAT或总目标标为完成。

- 发送后端按原环境重启，当前在线API PID986636。

### 2026-09-29 · 超长话题分段压缩与恢复

- 上轮发送幂等为有效进展。本轮context-compression按用户/助手分别切分完整原文，每段最多8,000字符，附轮次ID/角色/分段号/引用版本；合并也保留结构化角色，不能依赖模型自行猜来源。签名含提示版本，旧检查点不混入新协议。
- 每次更新最多4次调用/80秒，已完成段存设置检查点；中断后复用成功段。全部分段及合并完成前不更新covered或可用摘要，提示完成比例及继续更新。原文和部分摘要分别保存。单批原始输入上限120,000字符，超限明确错误。
- 上下文超预算时允许压缩近期长轮次，避免不足7轮却永远无法摘要；正常仍优先较早轮次。最后合并继续校验历史/摘要版本；删除话题在同事务清除滚动摘要和分段检查点，映射墓碑保留。
- 定向单元3项通过：长轮次分段+下一次合并后回到预算内、失败保留成功段且不重复调用、角色与末尾原文保真、失效来源不写检查点、调用预算停止、legacy删除兼容。最后调整结构化合并后再跑相关分段测试通过。无UI变动，沿用已验证摘要更新入口，未重复构建或跑手机/无关整套。
- 真实模型验证使用隔离临时库和合成文本，不加入个人真实会话；scripts/check-context-summary.mjs可复验，证据artifacts/context-summary-check.json。首次发现推断未说明进展，第二次发现来源角色描述不准，针对证据收紧提示并提供结构化角色；最终16,529字助手内容跨3段，加用户段再合并，保留100元、拒绝付费订阅、周五晚八点、未开始和禁止代执行。最终正文人工读取核对过，关键词检查仅辅助，不作整体准确率证据。
- CHAT上下文仍使用字符预算，并非模型专用token精确计数；长历史可能需多次更新，超过本次输入上限不会静默截断。单合成样本不等于全部真实约束质量已通过。下一步推进RET/MEM依赖及其他未完成模块，总目标active。

- 分段摘要后端按原环境重启，当前在线API PID988962。


### 2026-09-29 · 检索索引版本竞态与不确定写入恢复

- 技术选型仍按18号已确认方案执行，无新增框架或消息代理。本轮修复indexPending在Embedding、Qdrant写入和清理等待期间来源更新/删除时继续提交旧进度的问题；每次I/O后核对来源与outbox版本，最终进度和清队列在SQLite事务内复核。
- 写Qdrant前持久保存point ID清单，包含旧完成索引、旧部分进度和不确定写入。远端已接受但响应丢失后，新版本变短或来源删除也能清理旧尾部，不仅拒绝过期检索结果。
- 有待处理项时状态保持indexing，不再显示ready。已有SQLite检索末端版本检查保留；不承诺跨SQLite/Qdrant原子事务或远端从未短暂出现旧点。
- 定向Node检索4/4通过，其中新增故障用例覆盖Embedding期间修改、远端已写入后丢响应并改成短文、恢复后旧尾清理、Embedding期间删除及最终清理。使用隔离库和网络桩，证明协议边界，不代表真实模型检索质量。
- 本轮未修改UI，无需网页重建或手机测试。Qwen模型迁移、索引版本隔离、完整过滤和代表性检索质量验收仍未完成，总目标保持active。

- 索引后端按原环境重启，API PID990580，4317健康检查通过。


### 2026-09-29 · 检索项目范围与候选扩大检查

- 上轮索引竞态修复为有效进展。本轮新增retrieval-scope共用规则：稳定projectId（含笔记项目类别显式关联）与旧project字符串分别过滤，所有普通来源种类采用相同语义。记忆按global/project/thread匹配，旧通用兼容全局，旧周报/文章保留用途限制，未知scope不扩大为通用。
- dense与sparse及最终Qdrant查询使用同一过滤条件，SQLite回查复核种类、版本、状态、项目和记忆范围。新增scope-v1索引标记，旧集合后台补充范围payload；新范围字段补齐前部分结果不可用。没有把模型迁移与范围payload补充混为一谈。
- 过期/无效候选较多时扩大融合候选前缀，最多7次、单次窗口1000；每次重新按当前融合排序并核对SQLite，避免沿用早期窗口排序或已变更的有效项。资料库API带retrieval检查统计，达到上限的提示在网页可见。此实现是有界扩大前缀，尚非跨请求稳定索引快照游标，不将V03完整关闭。
- 检索定向5项通过，新增同名不同ID项目、项目类别关联、要事/文件跨项目排除、周报/话题/项目记忆范围、55个陈旧点之后仍召回有效项、1000窗口上限提示。已有竞态恢复回归保留。
- 实际本机Qdrant隔离临时集合验证两路同过滤的RRF查询：5个合成来源只返回甲项目文件及全局记忆，乙项目要事、乙项目记忆、周报用途记忆均排除；集合随后删除，不修改真实资料。此验证为过滤协议验证，不是语义质量评测。
- 网页类型检查和生产构建通过。本轮仅新增提示文本，无新增布局，不扩大到无关UI或手机测试。目录/日期/类型组合筛选、完整MEM来源有效性/激活流程、Qwen迁移及代表性检索质量仍未完成；总目标active。

- 补充范围对象校验：已删除话题的记忆不可用，未知项目ID不能授予范围；检索5项回归通过。后端按原环境重启PID992610。


### 2026-09-29 · Qwen候选服务与Embedding版本协议

- 上轮项目范围过滤为有效进展。本轮下载官方Qwen3-Embedding-0.6B-GGUF Q8_0，仓库revision与639,150,592字节文件SHA-256固定在scripts/embedding/model.json；校验后才替换目标，续传失败保留partial。未更改在线BGE配置、旧集合或E盘原件。
- 沿用已安装llama.cpp b10964/b29c606e2，以last pooling、L2 normalization、1024维运行独立loopback4320服务，PID993412。CPU4线程、8192 token服务限额，设备列表无GPU；超过限额明确400拒绝。启动脚本识别已运行同一模型/参数，端口已占用但未就绪不重启。
- embedding-contract仅在显式qwen3-local-v1 profile下加查询指令，文档不加；核对维度、有限非零向量并归一化。集合身份包含实际权重hash、量化、维度、预处理、分段、运行库及范围payload版本；BGE无profile的旧集合名保持原样。ensureCollection补实际dense维度/Cosine/sparse配置核验，错误集合不能继续写。
- 7项定向测试通过：查询/文档输入区分、固定协议与独立命名空间、维度/零向量/无穷值拒绝、旧BGE兼容、范围/竞态回归、已有集合维度错时保留待处理项且无点写入。
- 真实Qwen小样本见artifacts/qwen-embedding-check.json：3份合成中文文档、2道中英文查询均top1正确；短输入约45–111ms，1620字段落约3240ms，进程RSS约2.5GiB（此次测量，不是容量承诺）；原始输出1024维且范数约1，超长输入400。新增长段测量后重跑一次以记录完整同次结果，未运行批量真实资料或付费模型评测。
- 启动、日志、恢复和限制见scripts/embedding/README.md。尚未切流，也未接入主启动脚本；下一步独立新集合/回填队列与迁移覆盖验证，不能清掉在线BGE的outbox来冒充双索引迁移。RET-A05仍未达成，总目标active。

- 后端按原环境重启PID994230，加载集合维度检查；Qwen候选保持独立运行。


### 2026-09-29 · Qwen独立回填与全量覆盖核验

- 上轮Qwen部署为有效进展。开始前创建含本机配置的私有备份`.data/backups/before-qwen-migration-20260929`（28文件）；未将凭据打印或提供网页下载，未修改E盘原件。
- 提取共用indexSource与prepareIndex，迁移使用独立index_migrations/index_migration_items表及changes游标，不消费BGE search_outbox。已有Redis/BullMQ worker新增index-migration-source；任务只含来源/迁移ID和版本，配置存SQLite，按租约和来源版本检查，完成分段持久恢复。
- 全量快照与初始changes游标同事务写入，后续持续追赶修改/删除。失败可通过CLI retry恢复；队列完成不等于最终可用，来源提交时还要复核。集合被删除再创建时清除本地分段缓存、按新epoch重新登记已完成来源，保留旧任务审计。模型协议改变使旧迁移invalidated，不阻塞无关任务派发。
- 新增覆盖核验：逐页读实际Qdrant payload，比对SQLite全部有效来源的正文、revision、字符位置、状态、projectId及记忆范围；缺失/重复/多余/内容不符分别报告，检查期间源版本变化拒绝保存成功结论。qualityVerified独立保持false。
- 定向迁移测试1项覆盖中断第二分段后复用首段、BGE待处理项不被消费、写入期间修订追赶、删除清理、远端集合重建后的补回填、旧任务审计保留、正常覆盖通过、远端正文损坏识别、检查期间源变更拒绝。共用检索提取后6项回归通过。未跑无关全套或手机测试。
- 实际本机Redis/BullMQ/Qwen/Qdrant回填已完成：迁移a103fa84-5b0c-4ecf-9edd-f10aaa432d44，73个来源状态全部处理，56个当前有效非空来源共116分段；实际远端116，缺失0、不匹配0。证据artifacts/qwen-index-coverage.json，collection为shiguang_chunks_v2_ea15adbcbfc50bf53652。
- 当前在线查询仍用BGE，未切换；Qwen影子索引继续追赶变化。当前核验是逐段覆盖，不是RET-A05质量，也未证明多worker过期租约时所有远端迟到写入竞争均解决。切换前还需版本化point身份/迟到写入保护审查、代表性20题及无答案题、新旧对照、切流与回退门槛。V05及整个RET仍未关闭，总目标active。

- 回填完成后按原环境重启API PID997060，加载迁移协议失效隔离处理。


### 2026-09-29 · 迟到向量写入保护与真实资料检索基线

- 上轮独立回填和全量覆盖为有效进展。本轮Qwen新增写入使用entityId/revision/chunk生成point ID，过期worker的迟到PUT不能覆盖较新版本的点。PUT返回后发现来源已改/删，只清理该旧版本点；同版本替代worker共享的点不删除。已有影子集合当前版本旧ID继续兼容，正文/向量空间/查询协议未变，不为存储ID变化重算全部向量。
- 迁移+检索8项定向测试通过。新增真实交错顺序反例：旧PUT悬停→来源修改→新版本写完→释放旧PUT；新点仍存在、旧点清理、旧任务不提交成功。未宣称网络永久失败下旧点必然立即清零，SQLite版本复核继续作为读取边界。
- 增加searchIndex显式目标配置供影子对照，seed:false不登记/消费在线索引任务。固定artifacts/retrieval-questions-v1.json：20道自然语言题及预期来源、2道无答案题、全部来源ID/revision/正文hash；在任何评测查询前冻结，SHA256为d72a26e64999fb729fe232241113ef675b6aa5ed5f5a0f533fbff66780406041。脚本拒绝覆盖题目文件，评测前后检查源快照未变。
- 真实当前语料56个来源，但7个是演示样本，只有49个非演示来源。因此此轮仅基线，不关闭50–200份代表性资料的RET-A05门槛；没有把演示样本冒充真实资料。后续需纳入更多已授权实际材料并先固定独立题目。
- 实际BGE/Qwen各跑20道正例+2道无答案题，去重文件top5均18/20；Q03主线程/重计算建议、Q13机器人操作流程未命中预期top5。两模型无答案题均0/2，现有RRF强制返回候选导致不相关候选也出现，缺少足够可靠的无依据判断。保留原始失败，不修改预期凑数，不据此切流。
- 证据artifacts/retrieval-baseline-v1.json；每题保存来源ID、版本、RRF分数和耗时，不复制原文中的登录口令。运行日志在.data/logs/retrieval-baseline.log。脚本为scripts/embedding/freeze-questions.py及evaluate.mjs。
- 下一步需分析dense/词项分路命中及排序、解决无答案判断，扩大代表性真实资料验收，再完成切换/回退。索引覆盖已验证≠语义质量验收，总目标仍active。

- 后端按原环境重启API PID999328，加载Qwen新版点身份与迟到清理；在线BGE配置保持原值。


### 2026-09-29 · 分路诊断与Qwen资料不足判断

- 上轮迟到写入保护与固定标签评测为有效进展。本轮实际分路诊断22题，记录artifacts/retrieval-diagnostics-v1.json。Q03预期在dense第10、lexical前30没有；Q13预期在dense第9、lexical前30没有，不能简单归因于融合代码丢失。两道无答案题最高dense约0.415/0.298；正例最高dense最低约0.461。
- Qwen增加独立余弦校准门槛0.45，读取Qdrant dense向量核对维度和有效性、归一计算，不把RRF融合分数当概率或依据。弱候选剔除后继续扩大候选窗口，到上限明确提示；耗尽且无结果返回evidenceStatus insufficient及资料不足提示。缺失/坏向量报503，不静默说无结果。BGE行为暂保持原基线。
- 该阈值来自已见基线，只是校准，不是独立验证；相关候选也不等于问题必有答案。尚未关闭RET-A05，不能把本次回测结果作为泛化准确率或直接切流依据。
- 定向验证：原迁移/检索及独立余弦共9项通过；新增高RRF无关点不能压过低RRF相关点、仅弱点时无结果且解释明确，迁移集3项通过。检查零向量、缺向量、错误维度及幅值不影响余弦；未运行无关全套或手机测试。
- 同一冻结标签复查：BGE仍18/20、无答案0/2；Qwen18/20、无答案2/2，保留artifacts/retrieval-calibration-v1.json。原baseline文件不覆盖，评测输出增加独占创建保护。模型请求日志现在含实际发送的query指令、角色和indexProfile。
- 此轮无UI结构变更，已有资料库notice展示可承接新状态。在线模型仍BGE。下一步扩充非演示实际资料、固定新独立题目、验证门槛与误拒情况，然后做切流/回退。总目标active。

- 按原环境重启API PID1000717，加载Qwen相关性检查及完整Embedding输入日志。


### 2026-09-29 · 独立检索验收、Qwen切流及回退

- 上轮资料不足校准为有效进展。本轮建立隔离SQLite/Qdrant评测空间，排除7个演示样本，采用49个现有非演示来源，加项目已有09/10/11/17四份实际文档，共53来源。副本在.data/evaluations/ret-heldout-v2；未向日常记录插测试数据，未改E盘原件。既有向量经来源版本/正文校验复制，仅4份项目文档新算向量。
- 20道新问题与2道无答案题在任何检索前冻结：artifacts/retrieval-heldout-questions-v2.json，SHA256 9f2ac7c2211f49d8ecf855f0be7ef28b9f5fbd363402c8ba9059396b747a0173。来源与基线部分共享，属于问题留出，不伪称全新语料盲测。策略保持0.45，没有看到新结果后调阈值或答案。
- 实际Qwen验收：53来源120分段，覆盖120/120；top5去重来源18/20，无答案2/2，达到RET-A05本机门槛。H13（素材中转）、H20（能力解锁探索）未命中仍保留。证据artifacts/retrieval-heldout-result-v2.json，不能推广成其他语料通用准确率。只关闭这一本机验收项，不关闭RET全部功能。
- 新增index-switch：切换前核对题目/报告hash、来源当前版本与正文hash、策略、题数、实际命中数、无答案结果，并重新探测模型/维度和生产集合逐段覆盖；事务内复核配置/源签名。保存原配置和切换记录，拒绝覆盖期间变化。回退恢复原配置并登记全部来源补索引，保留旧集合。
- activeIndexMigration让在线Qwen继续用Redis/BullMQ更新，完成当前来源版本后才清对应search_outbox；API旧定时执行器不并行抢处理。集合丢失重建可使覆盖失效并重排任务；协议失效明确报错，不静默切到未验收新索引。设置保存相同服务/模型时保留indexProfile，修改服务/模型不沿用不匹配协议。
- 当前已实际切为Qwen。先切换c49f1ecb-fb0b-4983-8397-076b17b8863a、实际回退BGE并通过网页API检索，再恢复Qwen，最终switchId为7d2a6a11-d038-46ad-a3a5-3c42d879c1cf。证据qwen-activation-check.json、qwen-rollback-check.json、qwen-active.json、index-http-rollback.json、index-http-qwen.json及index-http-qwen-abstention.json。网页资料库无关问题返回0结果及insufficient提示，未调用付费模型。
- 主启动脚本根据持久配置启动Qwen候选服务，API已运行时也先检查依赖；实际start-if-active确认已有同一服务，不重复启动。Embedding请求日志在stderr、CLI结构化结果在stdout，避免日志混入JSON证据。
- 定向检索/迁移/余弦10项通过；新增活动索引由队列完成并清outbox、协议失效拒绝、设置保留协议后迁移4项通过。类型/生产构建通过。小修资料库无当前分段标题时不显示undefined；未跑无关全套或手机。API当前PID1003100，Qwen4320 PID993412，旧BGE4319保留回退。
- 剩余RET包括组合过滤/清单分页、来源成员去重与canonical边界、逐文件状态和定位等；MEM/EVT/SUP/RES/PET/记账等全目标仍未完成。下一轮继续按文档推进，总目标active。


### 2026-09-29 · 资料库清单分页与全量状态筛选

- 上轮Qwen切流/回退为有效进展。本轮新增GET /api/library/files，默认30、最多100，按updatedAt+id稳定排序；状态先对全量资料过滤，再分页，不受旧接口最近500项限制。清单不返回完整正文。
- 复用快照签名游标，跨筛选游标400、翻页期间数据改变409提示刷新，避免默默漏项/重复。旧libraryStatus.files保留兼容；网页摘要轮询使用summary=true，仅拿计数/运行状态，不反复下载500项清单。
- 新useLibraryFiles管理分页加载、局部错误、重试和手动刷新；切换筛选清空旧清单，请求代次及当前筛选检查阻止旧响应/旧回调覆写新列表。资料操作成功后刷新当前清单，保留错误时已有结果。
- 后端定向1项通过：537份逐页完整读取、无重复、7份旧失败资料能从全库筛出、正文不进入清单、跨筛选/陈旧游标拒绝、非法参数拒绝、摘要计数完整。网页桌面1项通过：30→31项追加、503保留已加载项并重试、切到失败筛选后迟到旧页不混入。类型/生产构建通过，没有手机或无关全套测试。
- 使用既有UI/UX skill中加载/错误反馈规则，沿用现有组件与布局。仅完成RET-07清单分页及RET-A06的超过500项子场景；组合项目/目录/类型/日期过滤、批量决策、来源去重与定位仍待完成，不关闭整个RET。

- 后端按原环境重启API PID1006358，加载清单分页接口；Qwen配置保持不变。


### 2026-09-29 · 资料库组合筛选与检索范围一致性

- 增加项目ID、来源相对目录（含子目录）、扩展名、入库日期（北京时间）与状态组合筛选，清单和正文检索共用规则。目录按完整路径段匹配，拒绝越级/绝对路径；同名项目用稳定ID区分，失效项目报错；日期合法性、顺序、参数类型由Zod及业务检查验证。
- 清单在分页前过滤全部元数据；游标绑定规范化筛选的SHA256摘要，避免长目录导致游标超过长度限制。关键词模式先过滤来源再排序；混合模式先从SQLite选出范围内ready来源ID，将同一个entityId集合条件加入dense、词项和最终融合过滤，再按当前SQLite版本/范围复核。无合格资料时不调用Embedding，明确提示范围内无可检索正文。没有为了增加筛选重建向量空间。
- 网页增加可折叠组合筛选，应用后清单与检索共用范围，未应用修改有提示；项目加载失败可重试，搜索有加载反馈，切换筛选/返回清单会使旧请求失效。沿用UI/UX skill反馈规则及既有组件。
- 定向后端9项通过，覆盖537条分页、旧失败项、目录相邻前缀、子目录、同名项目、扩展名、北京时间前后边界、无效日期/项目/类型、跨筛选游标，以及向量双分路过滤、查询期间归档与空范围不调用模型。游标摘要修改后仅重跑受影响清单2项，通过。
- 桌面网页分页1项通过；组合筛选测试首次因项目select可访问名称混入选项未定位到控件，补明确aria-label后定向复测通过，验证清单/正文请求范围相同、切换状态后迟到结果不会出现。类型/生产构建通过；未运行手机或无关全套。
- 本轮完成RET-A06的组合筛选实现与定向验证；不据此关闭全部RET。来源成员去重/canonical边界、批量决策、逐文件索引状态与段落定位仍未完成，其他模块继续按总目标推进。

- 后端按原环境重启为PID1009785，健康检查通过，网页构建为index-B5LJkkso.js；Qwen服务与持久配置保持有效。


### 2026-09-29 · 同内容资料的独立来源成员与兼容迁移

- 上轮组合筛选属于有效进展。本轮发现旧duplicate来源没有自己的正文/copyName，导致另一项目不能检索或下载。新接入共享按hash命名的物理副本，每个libraryFile仍有独立来源ID、项目、revision和解析正文快照，canonicalId绑定sha256内容身份，不能指向首个成员的生命周期。暂未合并各成员的向量分段或检索展示分组。
- 复用前校验副本哈希；副本缺失可从当前授权来源重拷，损坏明确报错。复制提交与同路径旧版本归档同事务，提交核验来源版本和copying状态，旧结果不能覆写用户已改变的状态。已复制但解析失败的资料不因内容去重永久跳过重新解析。
- 重扫同路径新版本保存previousFileId并继承已明确的projectId、旧项目标签及tags，不根据同名项目推断。旧版本副本保留；归档/删除一个成员不删其他来源的共享文件。关键词结果补revision、kind及canonicalId，避免无法构造准确引用。
- 增加可重入旧duplicate迁移：允许从已归档但有效的来源复用，保留本成员ID/项目/路径，清除对首个成员状态的依赖；缺失/循环指向有错误且保持未修复，网页保留重新复制入口。迁移前后核验revision，遇到并发变更不强行覆盖。
- 一致性备份前两次因后台数据库更新被正确拒绝；通过短暂BEGIN IMMEDIATE阻止写入后成功保存.data/backups/before-library-members-20260929，共28文件，含本机凭据的私有备份未对外开放。
- 隔离成员测试验证双项目各自命中、共享单副本、长文尾部位置和引用revision、归档/删除成员后另一来源仍可读、原件哈希不变、源文件删除后副本仍在、反复扫描不新增相同来源、修订继承项目、旧重复迁移幂等及缺失/循环来源错误。清单原2项通过；补未解析副本重新解析反例后成员3项通过。
- HTTP只运行phase2的copies deduplicated场景，通过扫描/去重/下载/长文尾部/路径越界/重扫验收。首次旧测试启动等待5秒超时，确认实际启动约6秒，改启动期限20秒并捕获提前退出原因，清理已退出子进程不再等待无效exit事件；没有跑待讨论ACT等无关场景。类型/网页构建通过，构建index-CiPAguLP.js。
- 按原环境重启API PID1011887，健康检查通过；在线迁移repaired=1、unresolved=0，旧duplicate剩余0。变更通过既有outbox进入Qwen索引队列，不手动重建全库。没有改E盘原件、手机或用户需求答复。
- RET仍未全验收：canonical结果分组/向量复用、批量决策、逐文件索引状态、命中定位和任务关联等继续推进；本轮证据不代表所有V04/V03或全模块已关闭，总目标active。


### 2026-09-29 · 资料批量决策、跨页选择与提交恢复

- 上轮来源成员修复为有效进展。本轮新增POST /api/library/decisions，Zod严格检查操作、1–100个唯一来源ID和正整数revision、opId。先在同一SQLite事务校验全部来源存在/版本/状态，再提交整批状态、outbox、调度状态和操作结果；任何不合法项整批不执行，返回逐ID原因。copy/retry与skip采用明确状态白名单，ready/copying/archived不可误操作。
- availableActions由相同服务端规则随清单返回，网页单项按钮和复选框据此显示；单项操作补传revision并复用批量校验，旧客户端未传revision的调用仍保留兼容。正常批量保留触发既有复制执行器，paused/scanning状态保持不变；本轮没有另起第二套队列。
- opId绑定动作及排序后的来源版本集合，丢失响应重试返回原事务结果，不重新修改已经处理/后续变化的资料；同标识改用另一批数据拒绝。数据库模拟第二条写入失败时，第一条修改及操作记录均回滚。
- 网页支持单项勾选、选择已加载可处理项、跨分页/筛选保留选择、查看全部已选及移除，明确最多100项，未加载资料不会擅自加入。整批混合状态不兼容时按钮禁用并说明；失效来源在已选清单显示原因且可移除，失败保留其他选择。
- 请求发送前将待确认操作与选择存sessionStorage，网络失败/刷新后重试复用同一opId；结果不明时禁止改批次，避免改参后重复执行。使用getRandomValues生成编号以兼容局域网HTTP环境；浏览器无法保存重试信息时不提交。沿用UI/UX skill的错误恢复/加载反馈，复选框显式限制18px并有44px标签点击区。
- 后端定向5项通过（新增批量3项与清单2项）：过期/删除/状态不符聚合错误、整批无部分写入、暂停保留、重投幂等、改参拒绝、上限/重复/错误类型、数据库中途失败回滚。类型/生产构建通过，构建index-B0QUKBer.js。
- 桌面网页1项通过：跨筛选选A/B→服务端409明确A删除→移除A→仅B提交丢失响应→刷新后相同opId与items重试→成功清空选择；同时检查复选框宽度小于30px。网页异常请求使用网络桩，真实事务由隔离SQLite测试证明；没有运行无关全套或手机。
- RET-07仍进行中，尚缺逐文件索引状态、命中定位、元数据编辑与任务关联；总目标继续active，未据本轮批量功能关闭整个检索模块。

- 后端按原环境重启API PID1014911，健康检查通过；Qwen和Redis配置未变，未修改E盘原件或手机。


### 2026-09-29 · 搜索命中原文定位与版本核验

- 上轮批量处理为有效进展。本轮提取LibraryDetail，搜索结果携带来源ID/revision/start/end/text打开独立详情。加载当前正文后同时核验版本、整数范围、边界及片段逐字相等，才高亮并滚动/聚焦命中段落；不按相似文字猜测定位，也不把字符位置说成原文件页码。
- 命中详情默认提取原文阅读，保留全文和高亮前后内容，可切回Markdown、再次返回命中、下载副本或引用当前资料继续讨论；普通清单查看仍默认Markdown。搜索卡补当前结果版本和来源路径。
- 版本变化显示当前正文及重新检索提示，版本相同但片段不一致也拒绝定位；读取失败有局部错误和重试，详情关闭或更换后迟到请求不会覆盖新详情。没有改写保存的Markdown或正文。
- 类型/生产构建通过，构建index-DMmU1epw.js。桌面定位1项通过：8,000字后的目标滚动至视口并获得焦点，Markdown标题仍正确渲染，切回原文能返回命中，关闭详情只关闭顶层弹窗，旧revision及错片段均提示并无高亮。使用隔离网页网络桩验证交互，长文实际提取/检索尾部仍引用上一轮HTTP资料验收证据，未重复跑无关后端全套或手机。
- 仅网页变更，本地API PID1014911继续服务新dist，无需重启或迁移。RET-05/07命中定位子项已定向验证；逐文件索引状态、元数据编辑、任务关联等仍待完成，总目标active。


### 2026-09-29 · 逐文件索引状态及单文件失败重试

- 上轮命中定位为有效进展。新增library-index-state公共读取规则及GET/POST /api/library/:id/index：按当前模型集合、来源revision、迁移项和队列任务区分待解析/未配置/排队/索引中/失败/已索引/未知/协议失效/排除。解析ready不再被当作向量ready，旧revision/旧集合记录不证明当前完成。
- 当前Qwen迁移读取同版本indexed项及实际记录的point IDs；旧索引路径新增带revision/分段数的成功receipt和逐文件错误，写入成功并复核当前版本后才记录。集合重建清除receipt/error；无历史完成凭据显示未知，不能凭旧indexed数组猜成功。已完成记录不等于Qdrant此刻在线，页面明确说明实时可用性以实际检索为准。
- 重试检查当前来源revision和可索引状态，只恢复本文件的失败/取消任务；缺少可靠完成信息时为该来源登记新迁移任务代次，保留旧任务审计，不重建全库、不修改正文revision。正在排队/运行/已经完成的重复请求返回当前状态，配置或协议失效要求先修配置。
- 清单展示每份文件的状态及处理分段数，详情每3秒读取状态；同一轮读取未结束不堆积请求，重试及关闭使迟到旧响应失效。失败有局部错误和单文件重试，来源版本变动要求重新打开或刷新。没有把服务端计算进度写回用户正文。
- 定向后端通过：清单2项，检索7项，新状态2项。新增覆盖解析完成≠索引完成、无凭据/旧版本、错误重试、归档拒绝、空正文、当前迁移任务恢复、索引重建和协议失效；修改旧路径错误/receipt后仅重复相关检索及状态用例。类型/生产构建通过，构建index-OnfWOa_K.js。
- 桌面网页1项通过：正文仍可读但Embedding失败→提交本文件revision重试→排队→详情轮询显示当前版本完成及3分段，不需整页刷新。交互使用网络桩，未声称由此重新验证实际向量质量或真实服务故障恢复；此前真实Redis/Qwen验收仍独立记录。
- 实际本机元数据读取：15份当前版本已索引，5份待解析。没有运行手机/无关全套，没有重算全库。RET-06逐文件反馈子项已实现并定向验证；元数据编辑/任务关联等仍待推进，整个RET和全模块目标仍active。

- 按原环境重启API PID1018449，健康检查通过，加载逐文件状态接口及新版成功/错误记录。


### 2026-09-29 · 资料元数据编辑与来源保护

- 上轮逐文件索引状态为有效进展。本轮新增PATCH /api/library/:id/metadata及详情编辑表单，允许标题、标签（每行一个）和稳定projectId；可取消项目关联，同名项目仍按ID区分，旧自由文本项目标签单独保留。失效/未加载的当前关联保留占位选项，可切换或取消，不隐藏阻塞项。
- Zod拒绝未知字段及错误类型/长度，重复标签明确报错；服务端复核来源revision与项目存在。资料不存在/删除、并发编辑、项目失效均不写入。修改和search_outbox/操作结果同事务提交；无实际改动不增加revision或制造重复索引。
- opId绑定来源与完整编辑请求，网络不明结果可在当前编辑器重试原操作；已提交后的重试不覆盖后续他人的修改，返回保存确认版本及当前资料。网页错误保留当前草稿，结果不明时锁定输入避免改参复用操作。此编辑草稿尚不提供刷新浏览器后的持久恢复，未宣称具备该能力。
- 修改不触碰来源路径、物理副本、hash/canonicalId、正文或解析状态；增加originalName兼容字段，下载优先原文件名/来源路径basename，避免用户把显示标题改成无扩展名后影响下载识别。无需批量迁移旧资料，不修改E盘原件。
- 元数据后端2项通过：双同名项目按ID移动/解除、旧标签保留、来源内容与身份不变、新revision进入outbox、重投幂等、并发更新不覆盖、失效项目/重复超量标签/空标题拒绝、禁止注入路径/正文/状态、无变化不重复写入。
- 桌面网页1项通过：失效项目保留可移除→422保存失败草稿仍在→取消关联→服务端已写但响应丢失→同一请求重试→关闭重新打开后标题/标签和Markdown正文正确。首次定位标签textarea失败，补明确aria-label后复测通过。类型/生产构建通过，构建index-5Nv1Vs2m.js；没有手机或无关全套测试。
- RET-P03的元数据编辑子项已实现并定向验证；任务关联、剩余接入/状态边界及模块整体验收仍需继续，不能因本轮表单通过关闭全模块目标。

- 按原环境重启API PID1020613，健康检查通过，加载资料信息保存和原文件名下载规则。


### 2026-09-29 · 资料关联已有任务与版本化读取

- 上轮元数据编辑为有效进展。本轮新增资料→已有任务的分页候选/关联接口及任务→关联资料的查看/移除接口。复用workTask中的libraryReferences保存来源ID、标题、路径与revision；关联变更写审计日志。仅draft/paused/failed/waiting/review允许修改，运行任务先暂停，取消任务不新增；不自动启动、确认计划或确认完成。
- 关联事务复核任务revision、资料revision、可读正文及类型，最多20份；opId绑定完整请求，重试不重复关联。同文件新版本需显式重新关联，替换当前引用并保留旧关联审计；资料删除/归档/更新后，任务详情显示失效原因且在可修改状态允许移除。
- 现有执行器上下文提供linkedSources元信息，read_library对关联资料使用绑定revision，状态失效或版本变化拒绝读取；检索候选也不将同ID新版本冒充旧关联。read_library新增合法字符位置校验及返回revision/kind，实际读取片段现在计入成果sources，保留字符范围与路径。此为RET与现有共享执行器的来源接入，不扩展ACT待讨论业务/工具授权，也不是RES新研究循环已完成。
- 网页资料详情提供“关联已有任务”，分页加载候选、清除选择、错误保留及同次请求重试。任务详情展示关联版本/失效原因，能打开当前正文或移除；打开新正文会提示与旧关联版本不同。关联页对用户明确说明不会自动启动或完成任务。
- 后端3项通过：关联及重投幂等、计划/状态不擅改、旧版本和删除占位可移除、显式重关联、36个候选分页、运行中/陈旧任务拒绝、读取位置/归档限制；模型桩驱动现有真实runWorkTask函数完成读取→报告→待验收，核验请求含关联ID/版本及实际读取证据进入成果。模型桩证据不冒充真实调研模型质量或新框架验收。
- 桌面网页1项通过：从资料关联任务→任务页看到失效来源→移除关联；验证未调用start且状态保持draft。类型/生产构建通过，构建index-D1uqncKJ.js，没有手机或无关全套。
- RET已补齐主要操作入口，下一步需按RET spec/plan逐项审查接入暂停恢复、解析完整性/乱码及状态边界等剩余证据，再进入后续记忆模块；没有将入口测试当成整个RET或全模块完成，总目标active。

- 按原环境重启API PID1023774，健康检查通过，加载任务资料关联接口与版本化读取规则。


### 2026-09-29 · 接入暂停、扫描阶段恢复与进程恢复

- 上轮任务资料关联为有效进展。核查发现重复pause会把resumeStatus覆写成paused，扫描目录提交又会用旧job覆盖最新暂停信息；最后目录完成后暂停可能残留scanning+空queue，继续后停在无工作状态。新增公共状态转换，pause/resume对已处于相同活动状态幂等，目录检查点从最新job合并queue，正确保留暂停和下一阶段。
- 每次进入下一个目录前重新读取持久状态，暂停后不继续派发目录；复制暂停仍允许当前原子步骤收尾，不开始下一个文件。空扫描队列自动进入复制阶段。目录读取/路径失败保存resumeStatus和原queue，恢复后先扫描未完成目录，不跳到复制而丢发现工作。
- 当前扫描/复制/暂停尚未结束时不允许新扫描覆盖当前任务。失败按钮改为“重试接入”，发送resume；暂停时扫描按钮禁用。无活动任务的pause/resume返回可解释错误，避免凭空制造任务。
- 抽取启动恢复recoverLibraryCopies，将持久copying来源重排queued并保存原因，保留来源ID和物理副本名。该机制仍沿用原接入执行器；没有据此宣称资料库PDF解析已经迁入独立worker，重型解析隔离仍须核对。
- 定向恢复5项通过：重复暂停、最后目录/空queue、缺失目录恢复、实际目录扫描期间暂停保留未访问子目录、实际文件复制中暂停仅完成一个在途项、独立Node进程读取持久copying状态并恢复且不新增来源/副本。独立进程场景是注入中断状态后的恢复测试，没有伪称在复制系统调用中精确SIGKILL。相关来源成员3项回归通过。
- 类型/生产构建通过，构建index-CpJ6wmYV.js。只改现有按钮状态，没有跑无关全套或手机；E盘未用于故障试验，所有目录/文件在临时测试根内。
- RET-A04接入恢复子项补有上述证据；字符编码/乱码、解析完整性、剩余路径与状态边界仍需继续审查，全检索模块及总目标未关闭。

- 按原环境重启API PID1025266，健康检查通过，加载接入状态与启动恢复修复。


### 2026-09-29 · 文本编码、空PDF识别与解析状态

- 上轮接入恢复为有效进展。本轮拆出library-extract，文本采用严格UTF-8或BOM指定UTF-16LE/BE解码，UTF-8失败才尝试GB18030并明确“编码为推断，请核对”。拒绝损坏UTF-16、暂不支持的UTF-32和二进制控制字符；不以UTF-8替换解码静默制造乱码。已经包含替换字符的原文保留并提示，未宣称能自动判断所有语义乱码。
- 查本地pdf-parse实现发现默认pageJoiner附加页码会让空白PDF成为非空文本，现使用pageJoiner:''，空白/无文字层明确显示empty。DOCX/PDF保留解析器完整返回值，不截取开头；DOCX解析提示保留可核对通知，未知格式为unsupported。
- 保存parse.state/encoding/notice/error及可用页数，复制与解析状态分开；解析失败仍保留hash校验过的原副本、空正文和明确原因，不进入ready检索。共享副本来源继承对应解析元信息；既有图片AI提取结果记录vision方法和核对提示。清单/详情展示解析提示，旧记录未批量重写或伪造编码信息。
- 定向7项通过：编码/BOM/换行保真与GB18030提示，损坏编码/控制字节拒绝；180,000字级MD全文及尾部保留，真实最小空PDF和有文字PDF提取（无人工页码混入），实际DOCX压缩包中8,000字后的尾部；来源成员原3项回归；实际接入二进制伪装txt保留字节一致副本与原件、状态copied+parse.failed且搜索排除。
- 类型/生产构建通过，构建index-CPl3odE7.js。界面只增加解析状态文本，未重复无关网页全套或手机；所有解析文件来自临时隔离测试目录，没有改E盘原件或在线正文。
- RET-03解析完整性及失败可见性增加上述证据。仍需核对重型解析是否阻塞API、扫描路径/stat失败记录，以及图片AI分析期间来源变动的提交保护等；不以本轮解析样例宣布全检索模块或总目标完成。

- 按原环境重启API PID1026862，健康检查通过，加载严格文本解析及空PDF识别。

### 2026-09-29 · 图片分析的版本提交保护

- 上一轮只核对技术栈选型，归为无开发进展；本轮继续完成已写入但尚未验证的图片分析保护。请求携带来源revision，读取副本后及提交事务内再次核对来源状态、版本和副本；人工修改、归档、跳过、删除或模型配置变化时，迟到输出返回409，不能覆盖当前正文或复活来源。
- 分析前校验项目副本路径、格式、大小及已有hash；只允许copied/ready/failed且有副本的来源。相同来源同一版本的并发请求在本API进程共享Promise；这是在途合并，不是跨进程持久幂等，不承诺外部调用恰好一次计费。
- 视觉调用要求完整输出，空正文明确报错且不改变来源；失败后可重试，成功清除旧解析错误并保存vision核对提示。图片入口依据实际copyName识别格式，改展示标题不会使入口消失；归档/跳过资料不再展示分析按钮。
- 定向测试4项全部通过（隔离数据库、模型桩）：同版本并发只调用一次并只新增一版；人工修改/归档/跳过/删除期间的旧结果全部拒绝；配置变化、空输出、提供方错误后可重试；旧版本/非法状态/hash不一致在提供方调用前拒绝。明确未用桩结果宣称真实图片识别质量验收。
- npm run build通过，产物index-BgvbaILm.js；按原环境重启API PID1028766，启动初期健康请求未成功，随后同进程复查/api/health返回ok。未改手机或E盘原件，未重复无关套件。
- RET仍需继续核对重型资料解析的执行隔离、扫描stat失败可见性等；全模块目标保持未完成。

### 2026-09-29 · 扫描失败可见性与资料解析进程隔离

- 上轮图片并发保护为有效进展。本轮修复扫描stat失败被catch后静默continue的问题：返回包含相对文件路径及错误码的接入失败，保留当前目录queue和已发现清单。修复权限/位置后“重试接入”重新检查该目录；已发现同版本项不重复新增。网页既有ErrorBanner和重试入口直接显示此错误。
- 资料库副本提取从API进程移到独立Node子进程，沿用完整文本/PDF/DOCX解析器。接入执行器串行处理文件；解析子进程V8堆上限384MiB，默认两分钟超时后终止。堆限制不等于整个进程RSS硬限制。正常API退出清理在途子进程；没有宣称主进程SIGKILL时操作系统自动清理子进程。
- 正文只有子进程正常退出并返回有效结构才提交；异常退出、超时、解码失败均保留项目副本并写parse.failed。沿用复制提交版本保护和服务重启恢复；暂停允许当前文件收尾，不开始下一份。
- 12项相关测试通过（扫描恢复6项、解析内容3项、独立进程3项）。扫描EACCES使用注入stat错误，随后实际临时目录重试验证两份文档无重复；既有暂停/目录恢复/新进程恢复仍通过。将解析内容测试改走生产子进程封装后，真实最小PDF、DOCX和长文测试3项再次通过。
- 独立进程测试实际运行CPU忙循环，主进程定时器继续执行，250ms测试时限后杀死子进程，下一次解析成功；覆盖崩溃、无效结果及完整长文，不将忙循环视作真实复杂PDF性能基准。退出清理加入后重跑受影响的进程测试3项通过。
- README同步使用说明。此次仅后端和测试改动，沿用上一轮已通过网页构建，未重复构建或无关浏览器测试。API按原配置重启PID1030201；未修改手机和E盘原件。
- 该资料库解析隔离仍由原libraryJob接入执行器调度，不能以此宣称整个资料库已迁入BullMQ。RET完整覆盖审查、后续MEM等模块仍待完成。


### 2026-09-29 · 检索覆盖核对与记忆冲突输出门槛

- 上轮扫描恢复与进程隔离为有效进展。复核RET规范和已有测试入口后，将接入版本、解析、混合过滤和故障恢复对应覆盖行由“未核对”更新为“进行中”，明确剩余综合证据；没有将局部测试冒充整个检索模块完成。
- 进入MEM公共校验准备时确认engine.findMemoryConflict把{}、陌生ID等当作null，存在错误放行。新增memory-output Zod严格schema：只有显式conflictId:null且无矛盾附带字段才算格式合法的无冲突；有冲突必须引用本次实际提供的候选ID，带duplicate/update/contradiction分类及非空依据。字段缺失/类型错误/未知字段/陌生ID都返回502保留候选，不能作为无冲突继续。
- 冲突模型请求增加requireComplete，输出额度600 tokens以容纳依据。返回目标版本和依据字段供后续统一确认服务接入。本轮未把结构校验等同于语义判断正确，未宣称scope/主体/时间已用程序完整校验。
- 两项定向测试通过：显式null与{}、数字、空串、数组、越权字段等；合法冲突、陌生ID、缺依据、非法分类及超长依据。server/engine.mjs语法检查通过。尚未执行真实模型冲突能力验收。
- 明确遗留：findMemoryConflict仍只看前80条且截断单条正文；propose仍限40条并可能静默截断；手动PATCH激活绕过统一冲突检查；批次互相冲突、替代历史审计与并发提交尚未完整实现。这些均保持MEM待完成，下一步优先做共享冲突召回/提交服务，不继续沿用旧入口当完成。
- 本轮代码尚未重启在线API；线上仍为上轮PID1030201。将随下一步记忆服务整合后统一加载，避免每个校验小改动反复重启。网页未变，不重跑构建或手机测试。

### 2026-09-29 · 记忆冲突全量覆盖与候选输出校验

- 上轮严格冲突输出校验为有效进展。本轮去掉findMemoryConflict的前80条和单条300字截断。新增memory-conflicts：embedding+词项混合召回用于优先检查相关项，再补查调用方提供的完整active快照，覆盖尚未索引/低排名记忆；分批20条/约16000字符，不截正文、不因达到批数而伪报无冲突。单条异常超大时明确失败。
- 每批调用完整输出门槛和严格schema；只有所有批次均合法无冲突才返回null。任一检索/模型/格式错误直接失败。模型只能引用当前批次的ID，不能引用其他批次甚至陌生对象。完全同文可直接标为duplicate，无需语义模型猜测。
- 此策略优先保证测试阶段的检查覆盖，库大时会增加检查耗时和模型调用；没有把top-k误称完整覆盖。当前方法返回首先发现的一项冲突，不等于列举所有冲突；统一提交服务必须在用户决定后复查剩余有效事实，并校验快照未变化。
- 候选提炼不再读取前40条旧记忆猜conflictId；新候选统一留待正式确认检查。用户本轮原文不再截取前2000字；模型完整输出以schema校验最多3条、每条1至300字，超量/超长/越权字段报明确提炼失败，不静默截断。旧已保存的conflictId候选仍需后续统一确认服务重新检查，不能据此宣布旧确认路径已修好。
- 六项定向测试通过：105条记忆中末尾旧事实仍检查、混合命中优先、超过300字正文完整比较；全部批次无冲突计数；检索/中间批次格式失败；跨批陌生引用拒绝；严格null/冲突依据；候选超长/超量/active字段/旧冲突ID拒绝。均为注入模型/检索函数的隔离测试，真实Qwen记忆召回与模型冲突判断仍待验收。engine语法检查通过。
- 仍待：手动PATCH统一激活服务、批次内冲突、多个旧冲突/用户决策、快照并发原子提交、scope/source有效性统一筛选、候选五轮期限及网页管理。当前完整active快照由调用方传入，本轮未宣称已完成范围相交过滤。
- 本轮后端改动继续暂存，在线API仍运行上一轮扫描/解析版本；下一步优先整合确认入口后统一加载。无网页改动，无手机/E盘原件操作，未重复无关测试。

### 2026-09-29 · 手动记忆激活、更正与替代事务

- 上轮全库冲突检查为有效进展。新增memory-state服务，手动PATCH启用及暂停后恢复调用统一findMemoryConflict；body使用严格Zod，拒绝越权字段、正文修改与直接active混提、未经本候选服务端检查的replace对象。
- 检查前保存active ID/revision全集快照、候选revision、来源revision及模型配置版本；模型检查后在同一SQLite事务再次核验。两候选并发检查时，先提交者改变快照，后提交者返回409保留候选，不能沿用过期检查。
- 冲突结果保存conflictReview ID/revision/正文/分类/依据并返回可编辑提示。用户明确选择替代后排除已同意替代项、重新检查剩余active；若还有冲突，继续展示而不提前改旧项。客户端不能凭任意ID删除或替代其他记忆。
- 编辑active生成带supersedes关系的新candidate，旧记忆正文/active状态保持，确认新版本时才将旧版本暂停留档。替代不再删除旧事实；保存confirmedAt/来源版本及替代ID历史。已完成更正的旧supersedes检查指针清除，避免随后暂停/恢复被历史版本错误阻挡。
- 网页“我的记忆”新增新旧内容和依据核对弹窗，明确两种选择；错误保留候选。沿用ui-ux-pro-max的现有主题、Modal及就近错误显示原则。保存更正文案明确候选仍需确认。
- memory-state隔离测试5项通过：手动/恢复冲突与伪造替代拒绝；active更正保留旧版及更正版后续暂停/恢复；并发快照失效；来源检查中变化与混合改写启用拒绝；注入新active写入失败后旧记忆暂停操作一起回滚。模型检查用桩，不宣称真实语义能力验收。
- npm run build通过（index-Cdj2xR3L.js）；桌面memory-conflicts浏览器测试1项通过，覆盖冲突证据可见、未点击前无替代请求、使用新记忆的准确版本/替代参数、刷新重开后新active旧paused。该网页测试为接口桩，后端事务另由上述测试覆盖。初次新增恢复断言放错测试作用域导致ReferenceError，已修正并全组通过，无删减验收条件。
- 本轮与前两轮记忆检查改动一起加载API；无schema迁移、无改写既有线上记忆，未操作手机/E盘原件。
- 仍待：对话memory-review旧路径尚未迁入此服务、同批候选冲突、五轮期限、scope合法性/相交范围和来源统一读取过滤、真实模型验收、请求丢响应幂等。不能因手动入口通过宣布MEM完成。下一步优先整合对话确认，尤其旧conflictId不能绕过重新检查。

### 2026-09-29 · 对话记忆批次确认与并发保护

- 上轮手动启用为有效进展。本轮替换index中的旧memory-review内联逻辑为memory-review服务，复用findMemoryConflict全量检查。旧提炼阶段conflictId不再作为已检查凭证：必须重新检查、保存服务端conflictCheckVersion及对应ID/revision/依据，再由用户重新选择。
- 整批所选候选按顺序比较active及本批已通过项；本批互相冲突时指出条目序号并整体阻止，让用户取消冲突选择。多条旧记忆冲突逐次加入conflictRefs，每次用户确认已知替代后复查其他有效项；不能因为已有一个冲突提示就跳过其他冲突。
- 同批同时要求保留和替代同一旧记忆会明确拒绝。提交前在事务内核对active快照、轮次版本/状态及模型配置；旧记忆暂停留档、新记忆写入、未选项丢弃、轮次处理状态和幂等结果同事务提交。失败无部分激活，旧事实不删除。
- 幂等绑定轮次、revision与排序后的选择内容；相同请求丢响应重试返回已提交结果，不重复模型检查或新增记忆。轮次已删除时先返回404，不重放被删除轮次的缓存响应。人工选择改变属于新请求，不能复用旧选择结果。
- MemoryReview展示所有冲突正文及依据；轮次revision变化后重置保留新/旧单选，防止新增冲突沿用此前同意。保持勾选内容，错误就近显示。
- 后端隔离测试5项通过：选一弃二及幂等；旧提示重检/历史保留；本批矛盾整体拒绝；并发active变更；最终轮次写入失败整批回滚。删除轮次后不重放缓存补入原测试，仅定向重跑该项通过。均为模型检查桩，真实语义验收未声称完成。
- 构建通过，index-BF3Iwx_3.js。桌面memory-batch测试通过：新增第二条冲突依据可见、此前单选清空且按钮禁用、重选后携带最新revision提交成功。首次测试选择器同时匹配话题与删除按钮，收紧到“继续聊”按钮后通过；没有修改产品行为来迁就测试。
- API按原环境重启PID1035224。未改手机、未操作E盘原件；没有重复全套测试。
- MEM仍待五轮候选期限/红点、规范scope及来源有效性与读取过滤、更多多旧冲突/跨入口并发联验、手动入口响应丢失幂等和真实模型/向量验收。对话确认与手动服务共享检查器，提交暂分两个服务，后续范围/期限守卫必须一致。

### 2026-09-29 · 候选五轮期限与持久成功轮次

- 上轮对话批次确认为有效进展。本轮新增memory-lifecycle，同话题成功会话提交事务内累计memory-turn-count，记录originTurn=N、expiresAfterTurn=N+5。失败/事务回滚不增加；其他话题互不影响；删除旧轮次不倒退已持久计数，不按墙上时间擅自过期。
- 保存成功新轮次、bootstrap读取、话题历史读取及确认入口检查期限。到期将memoryReview标expired，清空未确认候选正文，保留数量/到期轮次等说明；没有写active。提交最终事务再查期限，检查模型期间达到期限也不能激活。
- 历史待确认候选首次读取按现存成功历史顺序补origin/expiry字段，标memoryExpiryBasis=existing-successful-history；按createdAt/id确定顺序，可重入。已删除历史无法从现存记录还原，未伪造其轮次。补元数据会更新revision，因此旧页面需刷新后确认，不能绕过版本校验。
- bootstrap输出完整pendingMemoryBatches清单（不受conversations原200条展示上限影响），仅含有效待处理批次。小九红点/跳回指定轮次尚未接入，此处没有宣称MEM-08提醒闭环完成。手动候选不凭无关话题轮数过期。
- 定向生命周期4项通过：N+4/N+5及其他话题/读操作/回滚边界；删除不倒退；历史初始化幂等；模型检查中恰好到期阻止提交。对话确认既有5项通过；其fixture改用真实成功提交入口生成带期限候选，另保留明确的历史初始化测试。初次旧fixture被迁移加revision后出现4项失败，确认是旧页面应刷新的正确版本保护，不降低接口检查。
- npm run build通过（产物仍index-BF3Iwx_3.js；仅类型联合新增expired，渲染沿用已有notice）。无无关浏览器或手机测试。
- 上线前完成一致性本地备份.data/backups/before-memory-expiry-20260929（28文件，包含凭据仅本地保存），在线原始记录未做删除演练。按原环境重启API PID1036495。
- 下一步仍需小九有效候选提示/入口、范围和来源统一守卫、真实模型召回验收及其余模块；总goal保持进行中。

### 2026-09-29 · 小九记忆提示与原轮次定位

- 上轮候选生命周期为有效进展。本轮把bootstrap中的有效pendingMemoryBatches及手动candidate数传给小九；小九左上显示带可访问名称的待确认数量，hover/键盘聚焦原互动面板可见记忆提示、话题标题和批次数量。零候选明确显示“无待确认记忆”，不暗示其他尚未接入的提醒也为空。
- 对话候选点击后保存一次导航目标并进入搭子原thread；新增只读GET /conversations/:id读取确切轮次，先检查话题/轮次有效性和期限。目标无需位于bootstrap最近200条或历史第一页；搭子合并目标轮次与原话题历史，定位/focus到候选所在卡片，不创建新会话、不自动提交选择。
- 目标轮次确认/丢弃后显式刷新它和bootstrap，小九数量由源数据更新；只查看/摸摸/关闭面板不会更改候选。手动候选入口跳转现有记忆管理页。异步目标响应核对页面epoch，旧导航响应不抢占新的选择。
- 修正默认“滚到最后回复”与指定记忆轮次定位的竞争：目标有效时优先定位指定卡片，之后新回答/切换话题清除目标。沿用ui-ux-pro-max的现有面板、键盘焦点与44px按钮要求；提示长标题可换行，面板沿用滚动容器。
- 构建通过，index-CBhQUj6n.js。桌面memory-pet测试通过：bootstrap/历史第一页故意不含目标轮次，小九提示仍能打开对应话题卡片并获得焦点；查看零写请求；手动丢弃一次后提示红点消失、目标卡片刷新。接口桩验证导航/交互，服务端期限证据沿用上一轮测试，没有冒充真实AI验收。
- API按原环境重启PID1037816；未修改手机或E盘文件。初次构建后发现滚动竞争并修正，针对最终代码重构建一次，未运行无关套件。
- MEM-08已增加提示/期限闭环证据；PET完整统一提示契约、提示语常驻开关及其他来源尚未实现，本轮没有宣称小九全模块完成。下一步继续MEM范围/来源守卫及真实能力验收。

### 2026-09-29 · 记忆来源统一有效性守卫

- 上轮小九提示为有效进展。本轮新增memory-source：SQLite重新读取legacy sourceId、结构化sourceRef和sourceConversationId；来源删除、已记录来源revision不一致、资料库非ready、话题删除墓碑均立即排除。未知来源类型/格式拒绝；旧记忆没有sourceRevision时只核验存在，不伪造历史版本。
- 守卫接入memoryApplies/Qdrant命中后的权威复核、索引前置有效性、冲突候选筛选、手动激活/恢复。暂停/旧向量残留不改变来源有效性要求，不能只凭memory自身revision仍相同而继续使用。
- 报告写作偏好改用memoryApplies检查来源和旧周报/文章用途；模型返回后复查所用记忆revision/有效性。搭子回答在模型返回后及记忆提炼完成、最终提交事务内再次复核所有引用，填补两次模型调用之间来源变化的窗口。历史对话正文不被追溯改写。
- bootstrap为记忆提供sourceIssue，管理页明确“来源失效，暂不采用”并显示原因，生效计数排除这类记录。没有批量改写active历史状态或删除原记忆，等待用户更正/暂停处理。
- 相关15项测试通过（来源3、手动状态5、检索7）；新增向量残留场景单独通过：先索引有效来源记忆，只修改来源note而不改memory revision，再查询明确排除旧记忆。Qdrant/embedding为原测试服务桩，证明过滤行为，不冒充真实模型质量验收。index语法检查通过。
- 仍待MEM结构化scope创建/编辑、跨scope冲突相交筛选、实际采用记忆的完整说明及真实向量/模型验收。报告旧接口仅有project文字参数，当前不会据此猜稳定projectId载入项目专属记忆，此能力需后续补齐。
- npm run build通过，index-BG3w_HJE.js；仅管理页状态文本/计数调整，未重复无关网页测试。API按原环境重启PID1039051，健康检查通过。无手机及E盘原件操作。

### 2026-09-29 · 记忆范围创建、编辑与冲突适用性

- 上轮来源守卫为有效进展。本轮新增memory-scope，规范global/project/thread及稳定scopeId；global不能携带ID，project必须存在，thread必须为未删除话题或现存历史话题。旧通用/周报/文章作为独立用途保留，不把周报改成项目范围同义词。
- 新增createMemory公共schema，手动POST只创建候选并记录有来源记录的版本。PATCH允许规范范围修改，active范围变动生成新candidate，原active范围保持；确认前后重新校验范围对象有效性。旧范围对象已删除时可保存更正为合法范围的候选，不能直接active。
- findMemoryConflict按来源有效和范围可能有交集筛选active快照：不同项目ID/不同话题ID分开，周报与文章专用范围互不冲突，全局与具体范围可能交集。项目和话题混合若没有不可变绑定，不擅自断言不相交，仍交给带范围上下文的事实比较。混合召回同时传稳定projectId/threadId/purpose，正文比较仍补全未索引快照。
- 管理页增加独立范围与用途选择；项目同名显示ID片段，话题分页可加载更多；当前ID不在页内保留占位，失效/网络错误可见并能改选，失败保留正文和范围。卡片同时显示范围与用途。沿用现有表单组件和ui-ux-pro-max指导，没有新建视觉体系。
- 后端16项通过（范围3、状态5、检索8），另新增范围转检索参数断言1项定向通过。覆盖不存在/错误范围、同名不同项目、范围扩大先候选、用途不扩大、删除对象后不能激活及读取排除。
- 构建index-p2nsd3UQ.js通过；桌面memory-scope测试1项通过：项目提交期间失效报错，输入和选择保留；改全局不改周报用途；保存后重开保持全局+周报。服务端与页面测试用隔离数据/接口桩，无真实AI语义结论。
- API按原环境重启PID1040638；无手机/E盘原件操作，无批量迁移旧memory字段。
- 后续必要工作：搭子answer调用当前仍主要传project字符串，必须接入threadId及显式稳定项目上下文，才能实际使用这些范围记忆；对话候选的范围选择及采用依据显示也须补齐。不能将范围编辑/底层检索通过视作所有对话使用链路已完成。

### 2026-09-29 · 搭子检索范围与稳定项目续聊

- 上轮范围管理为有效进展。本轮增加conversationScope，将实际threadId和显式projectId传入answer/hybridSearch；不再只传project名称。兼容旧调用参数，新参数追加在末尾；未配置混合检索时旧note关键词回退也按稳定项目ID限制。
- 项目ID优先明确请求，其次同话题已保存的项目ID或来源绑定对象的明确项目成员关系；项目名称绝不猜ID。显式空ID可清除稳定项目范围；旧客户端带project文字标签时保留旧标签语义。未知/删除项目在生成前及最终提交复查时拒绝。
- 保存conversation.projectId并在话题目录、来源讨论入口和小九跳转时恢复；source-threads返回来源明确projectId但不合并会话。网页问答资料范围分项目与旧文字标签两组，同名项目显示ID片段。发送幂等payload包含项目ID，旧未完成请求的原payload仍复用，不替换已发请求内容。
- 检索记忆引用携带scopeKind/scopeId/purpose，Sources显示已确认记忆的全局/项目/话题范围和用途。回答生成后及最终保存时用memoryApplies复查范围与来源，防止期间失效；历史引用保持当时范围说明，不追溯改写。
- 两项后端定向测试通过：稳定项目来源/续聊继承、明确清空、同名不猜测与删除拒绝；调用真实answer函数走测试混合检索服务，能采用指定项目及当前话题记忆，排除同名其他项目/其他话题，并返回范围字段。后者为检索桩，非真实模型质量验收。
- 构建index-BhTPbVt-.js通过。桌面conversation-scope测试1项通过：同名项目选择第二个ID，发送只用稳定ID而非同名文字；引用显示范围；刷新重开同话题保留项目ID，继续发送携带原threadId。没有重复其他浏览器套件。
- API按原环境重启，PID见本轮工具输出；无手机/E盘原件操作。MEM仍需对话候选范围选择、真实Qwen/生成模型验收、手动操作幂等及跨范围更多并发场景；全部模块目标未关闭。
- 现场API PID1042417，/api/health返回ok。

### 2026-09-29 · 对话候选编辑与分范围确认

- 上轮搭子范围传递为有效进展。本轮新增候选编辑接口，摘要/全局项目话题范围/旧用途字段严格校验；只编辑指定pending候选，未知索引/旧revision/过期批次拒绝，失败不改草稿。修改后清除全部旧conflictId/refs/检查版本，保留originTurn和expiresAfterTurn，不通过编辑续期。
- 对话确认从每条proposal读取规范范围，筛选相交active和本批peer；不同项目/话题不误判同一上下文矛盾。保存active沿用人工所选scopeKind/scopeId/scope；等待模型期间范围对象删除，在最终事务再次校验并阻止提交。没有把旧默认global无声扩大为其他范围。
- MemoryReview新增编辑摘要和范围入口，复用MemoryScopeFields，编辑期间整批确认/丢弃按钮禁用；保存编辑只保持候选，仍需单独选择确认。候选面板显示本轮来源、范围及用途，失败保留正文与选择。沿用现有表单风格和ui-ux-pro-max规则。
- 后端8项通过：原批次5项回归、编辑清旧冲突且期限不变、项目范围和周报用途准确激活、同名不同项目候选不交叉比较、非法范围保存不改变原文、范围检查中删除阻止提交、过期禁止编辑（后几个断言分组在新增3项中）。均为隔离数据/检查桩。
- 构建index-BkhCzxXr.js通过。桌面memory-proposal-edit测试1项通过：编辑期间不能确认、第一次保存失败保留草稿、重试后仍为候选并显示指定项目、最终独立确认携带最新revision。无重复全套测试。
- API按原环境重启；无手机/E盘原件操作，无线上记忆自动确认。下一步优先做MEM实际Qwen/模型小样本验收及剩余幂等/来源范围边界，不能仅凭上述桩测试关闭模块。
- 现场API PID1043872，健康检查返回ok。


### 2026-09-29 · 实际Qwen与生成模型记忆小样本

- 上轮候选编辑为有效进展。本轮新增可复现脚本scripts/memory-live-evaluation.mjs，只读当前配置后创建独立.data/evaluations目录及唯一Qdrant集合，不读写用户记忆正文，不覆盖现有评价证据。凭据仅在私有测试目录，公开artifact不包含密钥或用户资料。
- 使用实际本地qwen3-embedding-0.6b及Qdrant、已配置deepseek-flash生成接口，8项全部通过：语义改写召回（cosine约0.6036，不作概率解释）；未确认/暂停排除；项目专有词与同名项目隔离；话题过滤；暂停后保留旧向量仍排除；85条填充项之后的旧居住地冲突；明确用户事实提炼；临时问题不产生记忆。
- 冲突案例“由深圳搬到广州”实际模型返回update和主体/当前居住地依据，核心冲突检查耗时1707ms。此处真实调用3次生成接口（冲突1、提炼2）；填充项用合成图鉴编号，未索引，目标冲突优先由真实混合检索召回。未用此样例证明所有未索引冲突的模型质量；全量未索引覆盖另有105条单元测试。
- 结果：artifacts/memory-live-2026-09-29T00-14-07-055Z.json。完整AI交互日志在私有.data/logs/memory-live-evaluation.log及隔离数据目录，沿用脱敏日志。测试向量集合删除成功，应用索引未切换。
- 根据已核对的实现与本轮证据更新MEM覆盖表，A01/A05/A06按明确场景标定向或本机样本验证；其余要求仍保留真实缺项，不将整个MEM标完成。小样本不代表所有用户语料准确率。
- 无应用代码变更，无需重启/构建或重复网页测试。下一步优先补手动保存/启用的丢响应幂等及跨入口并发替代，再按依赖进入要事与监督剩余工作；全goal仍未完成。

### 2026-09-29 · 手动记忆幂等与同旧事实并发替代

- 上轮实际模型小样本为有效进展。本轮新增memory-operation公共事务包装，创建及PATCH可携opId，fingerprint绑定操作路径及规范请求体；成功结果或需人工处理的conflict结果与业务写入同一事务持久化。相同编号不同内容409，已删除结果410，不重建已删除记忆。
- 创建、active更正生成候选、启用/暂停/恢复和冲突替代均复用包装。缓存重放不重复生成候选/重新检查模型；进程重启后仍从operations读取。旧客户端不带opId保持兼容，但没有据此承诺旧客户端网络重试幂等，也未声称外部模型调用恰好一次计费。
- 网页memoryRequest先将完整操作（含随机编号）写入sessionStorage再发送；网络/5xx保留，刷新后“重试未确认操作”发送原body。已有未确认请求时阻止发送不同操作并指向重试入口；明确4xx或成功后清除。浏览器存储失败则不发送，避免失去操作编号。没有把确认冲突响应当激活成功。
- 相关后端原状态/范围8项通过；新增操作3项通过（新Node进程重放创建、不同内容拒绝和删除后不复活；active更正/启用不重复；冲突响应重放不改revision）。另定向并发1项通过：两个候选替代同一旧事实，第二个先提交后第一个旧快照409，只有一个新active，旧事实保留且指向胜出的替代。
- 构建index-CrBO0IfF.js通过。桌面memory-operation实际模拟新增和启用的响应丢失，刷新后重试body/opId完全相同且只保留一个记忆，通过；因请求新增opId，更新并重跑受影响的memory-conflicts/memory-scope两项，均通过。合计3项相关网页场景，无其他全套测试。
- API按原环境重启，现场PID见后续健康记录。无手机/E盘原件操作，未修改线上记忆进行演练。
- MEM仍需完整覆盖审查，包括跨入口混合并发、多旧冲突、项目聚合和来源版本字段等，不能仅把本轮幂等通过视作模块全部结束。下轮整理剩余阻断项并继续后续模块。
- 现场 API PID1046639，重启后 /api/health 返回 ok。

### 2026-09-29 · 项目入口汇集长期记忆

- 上轮完成服务健康检查及证据记录。本轮按 MEM Q04 补上项目长期记忆分组；按结构化项目范围 scopeId 查询，不根据项目名、来源标题或残留 projectId 推测归属。只新增读取接口种类，不修改检索 payload 或索引数据。
- 分组支持既有分页和独立加载/失败/重试；显示摘要、状态、用途，详情保留完整正文及来源失效原因。候选、暂停等在项目管理入口可见但不因此进入模型上下文；全局与其他项目范围不混入。
- 通用项目关联接口仍禁止 memory 类型；记忆范围修改必须走既有编辑候选及人工确认，避免项目链接操作绕过冲突检查。无迁移、无自动确认、不改来源会话。
- 后端 categories 定向测试通过：同名隔离、分页、改名不丢、残留字段不扩大归属、来源缺失提示、拒绝通用关联且 revision 不变。构建 index-CwH5nmqo.js 通过。桌面 projects 测试1项通过：候选记忆显示与全文详情、用途、文件单组失败不妨碍其他组、来源记录仍能打开。未重复其他模块或手机测试。
- API按原环境重启 PID1048833，健康检查返回 ok；执行前确认无运行中的后台任务。未操作 E 盘原件。
- 下一步继续 MEM 跨入口并发与来源展示核对，再进入要事/监督剩余流程。长期记忆及全目标仍未全部验收。

### 2026-09-29 · 跨入口并发与多旧记忆冲突检查

- 上轮项目聚合为有效进展。本轮直接验证手动 PATCH 与 reviewMemoryBatch 竞争替代同一旧事实：两个完成顺序均通过，等待模型的迟到操作409，不产生第二条矛盾 active，未成功的对话批次保持 pending。
- 新反例发现实际缺陷：对话候选累计两个旧冲突时，keep existing 仅核对最后 conflictId，遗漏其他 conflictRefs 的状态/版本。测试修复前确实失败（Missing expected rejection）；现逐条核对全部保留对象，任一已变化则拒绝整次确认并提示重新核对/编辑，候选不丢弃。
- 增加多旧冲突全部替代的成功场景，验证两条旧事实均暂停并保留历史、只保存一条已确认新记忆。既有事务写入失败回滚测试仍通过。
- node --test tests/memory-cross-entry.test.mjs tests/memory-review.test.mjs：9项通过，采用隔离数据库与模型检查桩，不代表新增实际模型质量结论。无网页代码改动，不重复构建或浏览器测试。
- API按原环境重启 PID1049503；检查前无运行中后台任务，重启后健康返回 ok。无手机、E盘原件或线上记忆测试操作。
- 更新 MEM-A03 的定向证据；来源展示与规范字段覆盖仍待继续核对，未关闭 MEM 或全目标。

### 2026-09-29 · 来源版本保留与记忆来源展示

- 上轮跨入口并发验证及修复为有效进展。本轮发现 memory-state 在非 sourceId 的 typed sourceRef 情形下，启用、编辑候选会把顶层 sourceRevision 写为 undefined；如果版本只保存在顶层，会失去后续变更校验。修为保留已有版本，不捏造旧数据的来源版本。
- 新增定向反例覆盖 sourceRef(event)+顶层 sourceRevision：启用、编辑、暂停恢复都保留版本，随后修改来源后原记忆和编辑候选均失效，不能通过恢复绕过。memory-source 与 memory-state 共9项通过。
- 网页抽出 MemoryOrigin：sourceConversationId/对话引用显示“查看来源对话”，复用精确轮次读取和已有话题定位；typed 要事/文件显示类型与ID片段，已有来源版本可见。仅真正无来源字段时显示手动添加；当前 notes 数据中找不到的记录标暂不可用，不凭局部列表宣布已删除。
- 构建 index-WlBXdaDv.js 通过；memory-origin 桌面1项通过，证明对话来源不误标手动、要事来源版本显示、点击后定位原线程的原轮次并聚焦。使用隔离网页接口桩，未新增真实模型调用。typed 要事/文件目前显示来源标识，详情跳转仍待统一源对象导航处理，未声称完整来源浏览已闭环。
- API按原环境重启 PID1050593；重启前无运行中的后台任务，健康检查返回 ok。无手机或E盘原件改动。
- 后续继续按覆盖表推进；MEM规范字段及统一提示仍有剩余项，与EVT/SUP/PET联动完成，不能将这些定向通过视为全模块完成。

### 2026-09-29 · 要事生命周期与检查实例领域服务

- 上轮来源版本与展示修复为有效进展。本轮完整读取 EVT spec/plan 并核对当前实现：index 的 confirm 仍只写 event.status=confirmed，events 定时器仍无独立 occurrence，网页仍要求高等级必填检查时间；这些旧路径尚不能满足 EVT-09/TECH-01，不能标为已完成。
- 新增 server/event-lifecycle.mjs，尚未接入线上路由：事务内创建四种组合、无约定经历、独立 eventOccurrence、确认本次、安排下一次、同实例稍后、明确结束、复核提交。event.lifecycleStatus 与兼容检查 status 分开；结束将待处理检查取消，不能自动重开。
- 迁移函数显式调用且可重入，旧 confirmed 仅作为旧检查确认，生命周期仍 ongoing；未知长期/一次性为 null 待用户选择，保留旧ID、图片、来源、已有建议。迁移尚未在线执行，接入之前必须先创建一致性备份。
- 改期保留原 occurrenceId 与旧建议历史、清除当前复核；新一次检查使用新ID。复核提交同时核对要事revision、检查revision/ID、等级、状态与到期时间；未来、高等级检查未复核均不能被错误确认，模型失败说明可由用户查看后确认。
- tests/event-lifecycle.test.mjs 5项隔离测试通过：旧确认迁移及重入、四种组合/无时间/下一次历史/结束、改期迟到复核、非法类型等级时间无写入、注入event写失败时occurrence一并回滚。未使用真实队列/模型，不作为TECH-01验收。
- 无应用入口改动，无线上数据迁移，故未重启、构建或运行无关网页测试；API继续PID1050593。下一步必须接入eventData及新增/编辑/confirm/check接口、页面类型和生命周期操作，备份后迁移线上旧要事；随后BullMQ调度、依赖签名与小九联动。禁止把本领域服务单测等同于页面已可用或模块完成。

### 2026-09-29 · 要事生命周期接入网页与线上迁移

- 上轮独立检查领域服务为有效进展。本轮接入新建/编辑/confirm/check以及checks、schedule、snooze、end接口；旧兼容status仍表示当前检查状态，新增lifecycleStatus单独表示进行/结束。新客户端可明确选择long_term/one_off；旧客户端省略类型保存null待选择，不伪造长期或一次性。
- 编辑事务同步待处理实例：改期保留编号和历史，清空时间取消实例，已确认后再次安排产生新编号；编辑正文使当前待处理复核失效。已结束事项可改历史文字但不能借编辑改期或自动重开。复核写入当前实例并绑定双revision；JSON导出增加eventOccurrences，避免导出遗漏检查历史。
- 网页移除高等级必须有时间的限制，新增类型选择与待选择提示；卡片明确“本次检查已确认，事情进行中”。独立检查历史/安排面板展示历史建议、失败说明及确认时间，支持指定时分改期、安排下一次、显式结束；结束取消待处理检查，保留历史。
- 一致性备份：.data/backups/before-event-lifecycle-20260929，28文件（含凭据，仅本地）；SQLite写锁覆盖备份过程。上线前无运行中后台任务；API按原环境重启PID1053509，健康返回ok。迁移4条旧要事、2个旧检查，逐项核对原标题/摘要/图片/来源/关联/等级/约定/确认状态保留。旧confirmed没有迁移成已结束。迁移可重入。
- tests/event-lifecycle.test.mjs 6项通过（含编辑取消/再次安排/结束后不可重开、事务回滚及版本栅栏）。构建index-CoiFUE6r.js通过。桌面event-lifecycle与events合计4项通过：无时间高等级→安排→无模型失败可见→人工确认→下一次→改期→结束→刷新历史，以及既有到期主页、关联布局和图片辅助编辑保存。图片用模型桩，未宣称真实模型/队列验收；仅desktop执行。
- 仍未完成：现有60秒定时器尚未替换BullMQ，复核依赖签名和关联证据读取尚待增强，小九按occurrence统一提示仍待接入；新增操作丢响应后的友好恢复也需跟随实例幂等完善。EVT模块不标完成，下一步优先接队列调度及迟到依赖检查，保留已通过的页面证据，不重复全套测试。

### 2026-09-29 · 要事接入持久队列与实例栅栏

- 上轮生命周期接入网页为有效进展。本轮移除API内60秒直接调用模型的检查循环，新增event-jobs，共用现有SQLite background_jobs、Redis/BullMQ队列与worker。生命周期写入和outbox同事务；每个操作键绑定occurrence ID/版本和event版本，due_at用于延迟投递。启动及worker周期reconcile补查，不依赖进程内定时器保存约定。
- 普通到期实例只保存检查收据，不调用生成模型；高等级run调用生成服务，失败明确写reviewNotice并保持待用户确认。commit在队列租约的同一事务中检查实例/要事版本及当前状态；改期、取消、结束和删除撤销旧任务，迟到worker不能写回。复核模型增加requireComplete，避免截断输出冒充成功。
- 手动复核接口返回202入队，已有同版本任务复用；已有结果显式重试时保留旧结果历史、创建新版本任务。任务失败可显式重试。bootstrap带reviewJob状态/错误；页面显示后台等待/执行/失败，待复核期间轻量刷新，避免只有job失败而实体没变化时错误始终不可见。
- tests/event-lifecycle.test.mjs 6项通过；新增event-jobs 2项通过，其中真实Redis/BullMQ（独立测试队列和DATA_DIR）验证普通无模型调用、高等级一次执行、重复投递无重复建议、显式重试、运行中改期租约撤销。另新Node进程读取并reconcile持久outbox通过。使用生成桩，不宣称真实模型内容质量；队列使用实际Redis6381。
- 桌面两条相关实际后台网页流程通过：event lifecycle与due high-priority；随后新增job失败不伴随实体变化的UI测试1项通过，能看到错误并显式重试。最终构建index-CImWIv9Z.js通过。未运行其他无关全套或手机测试。
- API按原环境重启PID1056188，启动前无运行中后台任务，健康返回ok；保留上轮一致性备份。本轮不改变旧业务数据结构，无E盘原件操作。
- 未完成边界：复核当前仍只读取摘要及有限来源文字，尚未接关联任务证据/来源依赖签名；显式重试的丢响应幂等与跨进程模型调用去重上限需继续核对；小九统一提示尚待完成。TECH-01/EVT不据单次队列验收整体关闭，下一步补实际输入依赖签名及确认时有效性。

### 2026-09-29 · 复核实际输入签名与确认失效检查

- 上轮持久队列接入为有效进展。本轮新增event-review-context：要事相关字段、来源全文/附件元数据、关联要事，以及已有relatedTaskIds的任务计划、要求、执行证据和成果形成实际输入；记录来源ID、实际版本、缺失状态、读取时间和输入签名。只hash实际消费字段，避免互相关联的要事因对方reviewedAt/revision等记账字段变化而无限重检。
- Queue key/payload绑定输入签名；run前、commit及用户确认时复查。生成中来源改动，旧结果不能提交；结果生成后来源变化/删除，bootstrap标reviewStale，旧结果保留而不能直接确认，reconcile安排当前依据新检查。没有只依赖event自身updatedAt。
- 复核prompt包含实际计划/任务证据，明确模型成果不等于用户已完成、缺失来源/证据要说明。本次未直接识图，只传图片元信息及已有description/caption/ocrText（若有），提示与UI均明确限制。资料超过40,000字符明确失败，不再默默截来源前2000字生成建议。relatedTaskIds读取已就绪，但要事的任务选择表单和保存校验尚未接入，不把底层读取宣称为完整关联功能。
- reviewSnapshot存入当前实例和要事，旧结果进入历史时保留快照。网页“本次复核依据”显示来源名称/版本/缺失信息，旧建议有过期说明并禁用确认，重检后恢复。
- event-jobs及event-lifecycle共8项通过；新增event-review-context 3项通过：模型等待中改源不提交、重检读取新版本及删除后阻止确认、计划/执行证据改变签名而关联要事纯复核字段不改变签名、无检查高等级不报错。初测修正括号语法及无检查空值判断，最终通过。全部生成使用桩，无真实模型质量新结论。
- 最终构建index-DuKX2g9-.js通过；桌面2项通过：实际队列完整生命周期、过期依据/旧版本展示/阻止确认/重检后恢复（后者接口桩）。无无关全套测试。
- API按原环境重启PID1058029，重启前无运行中后台任务，健康返回ok。无手机和E盘原件操作。
- 剩余：任务关联选择及严格保存、图片辅助编辑schema/异步草稿保护、重试幂等、小九按实例统一提示、真实复核样本。EVT/TECH和全目标仍未整体完成，继续推进。

### 2026-09-29 · AI要事草稿严格校验与来源并发保护

- 上轮复核依赖签名为有效进展。本轮抽出event-draft Zod协议：标题/摘要/标签/项目的类型长度及必填明确校验，拒绝越权字段和无效对象，不再把空标题自动回填、不再截标签或摘要；关联数组按建议处理，每个自关联/重复/范围外/已删除/非字符串/超10项都有removedSuggestions说明，网页展示具体原因。
- suggest请求校验来源类型与可选revision；显式选择不存在note返回404，不退回其他来源。图片读取前后及模型返回后检查原event/note版本。网页发送编辑event版本、新来源note版本；生成期间整个编辑fieldset禁用，关闭也禁用，防止异步回包覆盖后来的用户输入或来源选择。
- 正文不再默默只读前8000字，超过24,000字符明确报错并保留输入；模型requireComplete，预算2200 tokens。返回实际来源ID/revision、图片ID列表及文字长度receipt。非图片附件未直接读取时有说明；文字要事可独立辅助编辑，不再只接受来源记录/图片。
- event-draft单元2项通过：非法对象、空标题、超长摘要、过多标签、模型越权、错型关联均502且不回填；合法草稿和逐项移除原因准确。
- 构建index-DGov4x4s.js通过；加强既有图片编辑桌面1项通过：真实HTTP模型桩收到PNG base64、模型门闩期间控件禁用、服务端来源改变后409且表单原文保留、再试后显示自关联/重复/范围外原因，最终保存有效关联和原独立图片。只用隔离测试数据，未做真实视觉质量验收或无关全套测试。
- API按原环境重启PID1059673，前无运行中后台任务，健康返回ok。无手机/E盘原件操作。
- 剩余：手动无效已选关联的可见移除与严格校验、任务关联选择、图片复制阶段版本/校验和保护、复核重试幂等和小九统一提示；不能把本轮AI草稿通过视为EVT整体完成。

### 2026-09-29 · 关联要事/任务选择与提交校验

- 上轮草稿保护为有效进展。本轮新增event-relations共享校验和已认证的候选分页/选择解析接口；要事候选先排自身，按标题搜索全候选，每页20；已选解析独立于候选页并返回失效占位。任务使用已有workTask的稳定ID，最多10项，保留已有状态用于历史证据，不因关联启动/修改任务。
- eventData明确保存relatedTaskIds；手动提交的null、非数组、重复、错误kind、不存在和自身关联均拒绝，不用Set静默丢选择。生命周期创建/编辑最终事务再次核验关联对象，覆盖异步图片复制期间目标被删除的提交窗口。
- 网页共用EventRelations控件，两类关联分别搜索/分页、独立已选区；已选即使不在当前页或失效仍显示ID/标题且能移除。选择失败/保存失败保留草稿；AI关联建议标记保留，任务计划/执行证据/成果进入上轮已实现的复核输入及依赖签名。
- event-relations及event-review-context共5项后端通过：拒绝无效输入、已删任务不写入、移除后正常保存、任务未启动、分页/搜索/自身排除/失效占位、任务证据影响复核签名。最终构建index-BFTVHYwa.js通过。
- 桌面3项通过：新增关联选择流程（失效移除、跨页选择、搜索不匹配仍保留、保存失败保留、重试并重开）、既有长标题复选框布局、图片AI草稿保存。新增UI用接口桩；保存校验与任务证据读取由隔离后端测试覆盖，未声称真实模型理解质量或新ACT场景验收。
- API按原环境重启PID1061392，重启前无运行中后台任务，健康返回ok。无迁移、手机或E盘原件改动。
- 剩余优先项：图片复制阶段来源版本/校验和保护，检查重试幂等，小九按实例统一提示，真实复核小样本与覆盖表核对；EVT仍不标整体完成。

### 2026-09-29 · 要事图片快照完整性与提交保护

- 上轮关联选择与校验为有效进展。本轮将图片复制抽到event-images：限定uploads内普通文件，目标用独占创建预留，避免覆盖碰撞目标；复制前后原件及副本SHA-256一致、大小符合来源元数据才接受。新快照记录实际大小、sha256、sourceAttachmentId、sourceRevision，原图不修改。
- 所有本次预留文件先登记，任一图片失败（包括部分写入）清理本次临时副本；旧要事图片仅在新记录成功提交后清理。来源revision在复制结束及数据库事务提交内再检查；图片复制和数据库无法跨系统原子，但失败不会提交指向不完整快照的数据。未添加历史快照hash的批量迁移。
- 要事来源已删且拥有独立图片时保留快照继续编辑；既无来源也无图片的旧记录不会为了补图而调用空来源复制。
- event-images 3项通过：第二张写后抛错清临时而保留原件/旧快照、复制中与复制后提交前来源变化阻止写入、损坏副本拒绝且完整快照在源删除后仍可读。相关event-lifecycle 6项通过。首轮新增测试括号错误修复后通过，无产品失败被跳过。
- 加强图片编辑桌面流程：保存后删除来源，独立图片HTTP下载字节仍等于原fixture，随后编辑要事成功且images不变。首跑Playwright trace输出ENOENT导致退出失败；改独立输出/tmp/shiguang-event-images-e2e-20260929后完整重跑1项通过（未禁用断言）。网页未变，复用index-BFTVHYwa.js，未重复构建或无关套件。
- API按原环境重启PID1063916，前无运行中后台任务，健康返回ok。无线上数据迁移、手机或E盘原件操作。
- 后续继续检查动作/重试的幂等恢复及小九按实例统一提示，再做真实复核与模块覆盖核对。当前图片测试证明快照保存路径，不等于所有EVT/技术栈要求已完成。

### 2026-09-29 · 检查操作幂等与丢响应恢复

- 上轮图片快照保护为有效进展。本轮新增event-operation事务收据：schedule/snooze/confirm/end/check支持可选opId，操作路径与规范请求体绑定指纹；收据和检查/要事/outbox变更同事务写入。重放先读已保存结果，不再次创建实例、追加改期历史或清空新复核结果；同编号换内容409，结果要事已删410不重建。
- requestEventReview增加可选要事revision/occurrenceId保护，并移除路由里先查当前状态再重放的不一致顺序。旧客户端不带opId仍可兼容，但不承诺旧请求丢响应重试幂等。此处避免同操作重试再次触发模型，不宣称外部模型在worker崩溃/租约超时后计费恰好一次。
- 网页eventRequest在发送前持久化完整请求至sessionStorage；网络/5xx保留，明确4xx或成功清除；不同新操作在前一项未确认时被阻止，刷新后可重试原请求。进程内同时点击共用inFlight。页面和检查弹窗均有恢复入口，成功后刷新真实状态而非用旧收据覆盖当前数据。
- 后端既有event-lifecycle/event-jobs共8项通过（含真实Redis），新增event-operation 2项通过：新Node进程重放安排、确认/改期/结束不重复、异内容拒绝/删除不复活；复核完成后重放旧重试收据不清空新结果且不新增任务。
- 最终构建index-D4savZuy.js通过，保留工作区已有样式改动。首次桌面运行测试服务中途停止/连接拒绝，未视为验收成功；Playwright新增可选SHIGUANG_E2E_PORT（默认4432保持），改5442和独立产物目录后生命周期流程通过。新断网测试初次API在登录完成前发出401，加入app-shell就绪等待后通过。最终丢响应场景真实执行服务端schedule再中断响应，刷新重试body/opId完全一致，只有同一条同版本occurrence；输出/tmp/shiguang-event-op-final-20260929。
- API按原环境重启PID1068078，前无运行中后台任务，健康返回ok。无手机、E盘原件及线上测试数据改动。
- 下一步重点接小九按检查实例统一提示，并核对EVT真实复核样本及覆盖矩阵；普通新建/编辑要事的幂等与完整模块交付不能仅据本轮检查动作验收认定完成。

### 2026-09-29 · 小九统一提示只读聚合基础

- 上轮仅复述技术栈确认，判定为无开发进展；本轮重新核对PET spec/plan及业务源，开始PET-P01实际实现。
- 新增server/pet-reminders.mjs和已认证GET /api/pet/reminders：读事务内聚合全量当前事实，列表与total共用items；输出稳定id/occurrenceKey、源版本、处理目标、快照签名、cursor和serverTime。没有模型调用、确认、调度或候选过期写入。
- 要事只取ongoing且当前pending、关联匹配、已到时间的检查实例；高等级区分结果未就绪、依据变化、复核说明及待确认。改期/确认/删除直接退出当前提示；actionTarget带检查ID及版本。
- REC取上海当天未完成待办，不混入未转移历史；MEM使用同一五轮有效性规则，逐轮候选按批次展示并给候选数，另含手动candidate。SUP读取原调度最后一次已发提醒，不在读取时生成新提醒；遵守安静时段、稍后、暂停/取消/已处理、父任务存在性；等待资料/验收按任务状态聚合，避免同一任务与run重复提示。尚无记账提醒源，不伪造账单事实。
- 隔离测试tests/pet-reminders.test.mjs四项通过：65条待办加其他来源共68项完整无截断且重复读取total_changes不变；要事实例到期/改期/确认/删除；第五轮候选不再出现而实体不被读取操作修改；已发监督提示/稍后/静音/完成/失去父任务。补检查版本后重跑四项通过，server/index语法检查通过。
- 当前仅服务端基础：网页仍用旧记忆提示，尚未接新接口；未重启线上API、未构建未变更网页。PET-A02/A04/A05等跨端验收不标完成。下一步接单一前端数据源和完整提示表/标识，处理旧回包、来源精确导航、hover/常驻及三入口；其后补SUP三日事实、通用记忆和其他模块提醒。

### 2026-09-29 · 小九网页统一提示、常驻与来源入口

- 上轮只读聚合为有效进展。本轮按已有UI技能/主题接PetReminderTable/usePetReminders，App仅传业务cursor；同一返回列表提供徽标和完整表，不再另用bootstrap记忆数。10秒可见轮询/窗口恢复刷新，业务写成功发business-changed立即失效，epoch+AbortController阻止旧响应覆盖，15秒超时可见，普通轮询不反复中断慢请求；卸载清理监听和请求。
- 展示区分加载、真实无事项、失败原因/重试、过时内容；失败不显示可信待处理数量，改为错误标识。40条长提示内部滚动完整可见，来源按钮不自动确认；hover/键盘打开、提示语常驻、取消恢复hover、Escape/关闭收起，收起不修改业务。
- 删除喂食函数/转换和独立摸摸按钮，保留素材；角色直接摸摸，三入口为交流/汇报/提示语。汇报仅#artifacts导航和短反馈，不创建成果或提交证据。聊天输入在成功后才清空/加入成功历史，失败保留草稿，业务提示不放进聊天请求；补说明及独立收起交流按钮。同一情绪新事件重置反馈计时，避免旧计时提前覆盖。
- usePetTarget按源类型消费跳转：会话复用memoryDiscussion定位原轮次；待办切正确日期并聚焦条目；记忆切全部并聚焦；要事聚焦卡片；任务定位计划或具体run证据弹窗，不同时打开两个弹窗。缺失来源显示就近错误，不替用户重建。要事/任务/记忆新导航代码类型通过，但本轮浏览器实际只验待办与原会话，其他分支仍需联验。
- 原有memory-pet桌面测试更新为统一接口桩，仍验证原轮次读取、手动丢弃后提示退出，未弱化人工确认断言。新增pet-reminders桌面测试覆盖40项滚动、常驻/取消/键盘、汇报无写入、聊天失败保留且请求仅短历史、错误不是空、重试空态；隔离真实todo创建→提示→原条目聚焦→完成→提示退出；延迟旧快照不会复活提示。4项首次完整通过，后修慢请求轮询保护并最终构建index-D9NE0ZS7.js；最终对应桌面结果续记下方。
- API保留原环境重启PID1072975，重启前后台无running工作，health正常；后端聚合4项隔离测试通过，无数据迁移/手机/E盘原件操作。
- 仍待：源页面独立催促统一化（App首页要事、TodayTasks及WorkTasks旧notice）、SUP真实完成/三日未完成反馈、PET通用记忆读取、记账提醒、拖动/更多来源导航及完整PET验收。当前不标PET模块完成，继续总goal。
- 最终构建后的上述4项桌面测试全部通过（16.3秒），产物/tmp/pet-reminders-delivery-e2e、报告/tmp/pet-reminders-delivery-report；没有运行手机或无关全套测试。

### 2026-09-29 · 页面与小九共用提示快照

- 上轮统一提示网页与交互为有效进展。本轮新增PetReminderProvider，仅在已登录应用根部运行一套usePetReminders；小九浮层、首页要事、今日任务、任务源页、要事源页通过同一个Context读取同一items，不分别派生数量/文案或新增提示轮询。
- HomeEventPrompts替换App旧的event.dueAt独立筛选与“到点提醒”文案，复用来源ID、检查实例提示及精确导航。PetSourcePrompt携带统一data-pet-reminder-id，在任务/要事源页明确“小九：”台词；错误/数据失效时不继续当作当前催促展示。
- TodayTasks保留今日任务事实，去掉run.notice独立催促，复用小九对应run消息；业务成功后刷新事实，异步epoch避免旧列表覆盖新状态，获取失败可见。进入任务时使用明确来源导航结构，不构造虚假的提示数量/源版本。
- WorkTasks保留证据、计时、状态、稍后时间及操作，原reminded的notice不再独立催促；waiting/review任务卡使用统一提示，执行详情仍可展开原状态说明。统一提示定位到run只打开证据弹窗，计划来源只打开计划详情。SUP原有GET /work-tasks调用ensureRuns仍是旧行为，本轮没有将它误称只读，后续SUP重构需分离。
- 最终构建index-Eit_T6nC.js通过；5项对应桌面通过（18.3秒）：既有4项统一表/原会话/真实todo/旧回包回归，新增接口桩跨页联验首页与浮层同ID/同文案、要事精确聚焦、任务指定run单弹窗、稍后后各处提示退出且任务保留、旧notice不再出现。此次新跨页场景为接口桩，不代表真实SUP调度或三日规则已验收。
- 桌面产物/tmp/pet-shared-e2e，报告/tmp/pet-shared-report；仅网页变化，线上API PID1072975无需重启，无迁移/手机/E盘原件操作。未重复后端无关测试。
- PET-A04相关已存在来源的共用表达已落地，完整模块仍不关闭：通用记忆读取与实际采用记忆记录、SUP完成和三日未完成事实/反馈、记账提醒源接入、拖动/反馈计时与其余验收仍待推进。后续优先接PET通用记忆并回到SUP事实状态设计。

### 2026-09-29 · 小九通用记忆检索、参考记录及生成版本保护

- 上轮共用提示快照为有效进展。本轮新增server/pet-chat服务并替换旧内联接口；严格Zod验证输入，不接受额外业务字段。短历史保留现有最后6条，允许600字历史回复，修正旧回复最多600但下轮历史只收400的不一致。
- PET-P05复用hybridSearch(kind=memory)和MEM memoryApplies，不传project/thread/purpose，因此只接相关的已确认通用记忆。检索后再从SQLite读当前全文和revision，过滤候选/暂停/范围/用途/来源失效/陈旧向量/重复；最多3条、总正文6000字，不全量注入业务。沿用检索既有语义阈值和混合检索，不另写关键词替代语义。
- prompt明确记忆/历史为资料而非授权，不执行事项/激活记忆；自然短句适量emoji。缺检索配置或失败时不假装记得，返回可见memoryNotice，仍可普通交流；AI交互走既有脱敏日志，另记pet-context/accepted/stale及callId、参考ID和版本。返回memoryUsage表示“提供给模型”，不声称能证明模型内部实际使用了每条。
- 模型生成结束逐条再校验当前记忆revision/active/范围/来源；变化返回409，网页保留草稿。旧固定“汪…我在听”空输出兜底移除，空白或超过600字明确502，不截断伪成功；requireComplete避免截断回复。网页独立展示本轮参考通用记忆和版本、检索降级说明，下一轮清除旧参考展示。
- tests/pet-chat.test.mjs四项通过：仅命中且有效通用记忆入prompt（不注入未命中事实、项目/话题/周报/暂停/候选/旧版本/失效来源）；生成中暂停及改源409；检索失败无记忆仍可交流并有记录；额外字段/空回复/超长回复报错，550字前轮回复可继续。测试生成器/检索桩用于确定性边界。
- 最终构建index-BPTVCyzz.js；桌面4项通过（17.1秒），新增参考版本/下一轮检索失败提示及旧参考清除，回归失败草稿保护、提示隔离、真实todo和旧回包。产物/tmp/pet-context-e2e、报告/tmp/pet-context-report。
- 新增scripts/pet-live-evaluation.mjs，隔离SQLite和唯一Qdrant集合，仅合成记忆，真实本地Qwen+已配置生成模型调用1次：相关偏好入上下文、真实非空自然短回复、暂停但未清理向量仍排除，3项通过。回复准确提到安静/轻柔纯音乐并带emoji。证据artifacts/pet-live-2026-09-29T01-52-18-753Z.json，测试集合删除成功，私有调用日志.data/logs/pet-live-evaluation.log；不据一个样本声称全部情绪交流质量已验收。
- API保留原环境重启PID1077088，重启前后台无running任务，health正常。无线上记忆修改、数据迁移、手机或E盘原件操作。
- 下一步回到SUP计划/每日实例/条件快照及完成/三日事实，再接小九反馈；PET剩余拖动/计时竞争和全来源验收、记账提醒等依赖未关闭，总goal仍进行中。

### 2026-09-29 · 监督模板/日实例分离与条件快照

- 上轮PET通用记忆为有效进展。本轮完整读取SUP spec/plan，开始SUP-P01。迁移前在SQLite写锁下创建一致性备份.data/backups/before-supervision-snapshots-20260929（含配置，保持私有）。现场原有1个workTask、1个workRun，没有重造或清空历史。
- 新增server/supervision-runs：supervisionStatus独立于旧自动执行器status；新计划为draft，人工开始设active，显式暂停/取消分别设paused/cancelled。自动执行器因预算/失败停下不擅自结束已经确认的监督。旧draft/cancelled保持对应状态，旧paused/failed因无法区分原因迁移为监督paused；旧running/waiting/review为active。启动暂停自动执行器仍保留监督状态。
- 实例保存逻辑日、上海时区、起止时间、scheduleVersion、conditionsSnapshot（计划版本/源revision/最低秒数/必选证据要求）、evidenceRevision。日实例用taskId+logicalDay在SQLite事务内去重；日程版本不构成新实例；一次性模板只保留第一份实例。未来模板变化仅影响新日实例，旧快照不重写。
- 兼容迁移可重入，旧记录保留ID、状态、证据、时长和confirmedAt；旧快照标记legacy-current-template并在网页明确“来自迁移时模板，不代表还原历史”。孤立旧记录保留并提示缺来源，不捏造条件，验收遇缺快照会拒绝。
- ensureRuns复用独立创建函数，提醒时间读取实例快照且按supervisionActive判定；GET /work-tasks不再调用ensureRuns，页面读取不主动生成实例。旧计时心跳、轮询调度仍在，未冒充已完成SUP-P02/P03队列重构。PET同步识别监督状态，并优先采用实例截止时间。
- 现有AI证据输入及人工时长门槛改读实例快照；网页展示本次要求、目标时长、旧快照说明和独立监督状态。启动执行前先验证条件快照，避免无效要求已写running后才失败。当前仍是一个必选证据条件的兼容结构，逐conditionId判定及完整多条件编辑留下一步，不能据本轮认定SUP-A01全部通过。
- tests/supervision-runs.test.mjs 3项及相关pet-reminders 4项共7项通过：迁移不改旧事实/重入/孤立来源；同日改模板与新Node进程不重复、次日使用新条件；一次性和暂停/失败/取消不额外生成，自动执行器paused但明确监督active仍按约定生成。
- 构建index-D5aBN98e.js通过；桌面2项通过（11.7秒）：旧历史显示45分钟/三心得而非新模板90分钟/五心得、迁移说明、已完成禁再次确认；小九跨页统一提示与稍后回归。证据/tmp/supervision-snapshot-e2e及/tmp/supervision-snapshot-report。最后仅补启动前快照验证，Node语法检查通过，网页未再改。
- 线上初次部署迁移核对1条旧run的taskId/day/status/evidence/artifactId/confirmedAt/seconds全部保留，快照basis正确，health正常。最终API进程见本轮后续健康记录。无手机/E盘原件操作。
- 下一步SUP-P02：计时会话与补记幂等、evidenceRevision/条件逐项判定、引用来源有效性和人工完成提交原子门槛；再做队列调度、离线补查、改期和三日事实。当前SUP整体未验收。
- 最终API PID1079347，保留原环境，启动前后台无running工作，健康接口返回ok；第二次启动迁移重入未生成新实例。

### 2026-09-29 · 监督计时分段、补记幂等及断网恢复

- 上轮条件快照为有效进展，本轮继续SUP-P02的计时部分。部署前一致性备份.data/backups/before-supervision-timers-20260929成功，未修改手机/E盘原件。
- 新增supervision-timer：seconds作为已保存检查点，timerAt作为未结算区间起点；分段timerSessions保存开始/检查点/结束/时长/原因，timerVersion与evidenceRevision分离。保留小数秒，检查点用不倒退边界抵御系统时钟回拨；重复start不创建新分段，stop只结算当前未结算区间。
- adjust严格校验有限数值1–1440分钟及1–1000字非空原因，要求opId；收据与补记同SQLite事务，操作编号绑定执行ID/action/body。相同请求跨进程重试返回原收据，不再补记；同编号换内容409，已删run410。start/stop旧客户端不带opId兼容，新网页均带持久操作号；不承诺旧无编号start在更晚stop后重放不重新开始。
- 心跳改调用checkpointTimer；服务重启recoverTimers只关闭最近已保存检查点，不补算离线区间，并明确提示手动继续。旧timerAt无分段时标注legacy-checkpoint，不伪造更早分段。监督显式暂停/取消与停止其计时在同一事务；旧confirm/skip关闭当前分段。正常计时不增加evidenceRevision，但旧AI验收仍按实体revision检查，尚待下一步替换，不能据此宣称验收期间计时并发问题已完全解决。
- 网页runTimerRequest在发送前保存完整操作及opId，网络/5xx保留、明确4xx清除；页面/调整弹窗有恢复入口，刷新后重试原请求并刷新实际数据。投入记录可展开查看分段及补记原因，兼容显示旧adjustments，补记不静默截断原因。
- tests/supervision-timer.test.mjs四项通过：重复start/stop、小数秒心跳和旧start收据不重新启动；补记跨新Node进程重放不重复、错参/换内容拒绝；重启只留检查点并暂停；显式暂停停止计时、时钟回拨不重复计。TS检查及最终构建index-D3VXbavC.js通过。
- 新增桌面真实接口流程（模型仅计划/等待资料使用本地HTTP桩）：创建确认计划→开始/暂停→分段可查→补记5分钟服务端成功后丢弃响应→刷新重试→仅增加300秒、仅一条原因、evidenceRevision不变。首跑因locator要求卡片一直存在“开始计时”按钮，按钮变“暂停计时”后定位失效；改为稳定卡片内容后1项通过（10.1秒），未放宽结果断言。产物/tmp/supervision-timer-fixed-e2e，报告/tmp/supervision-timer-fixed-report。
- API保留原环境重启PID1081853，重启前后台无running工作，health返回ok。
- 后续SUP-P02仍需逐conditionId证据评估、evidenceRevision提交锁、引用存在/版本/归属、人工完成幂等，以及补记区间更细的重叠校验；本轮仅完成时长操作的基础可靠性，SUP整体不标完成。

### 2026-09-29 · 逐条件证据验收与人工完成提交

- 上轮计时为有效进展。本轮新增supervision-evidence并替换旧内联evidence/confirm；请求要求opId和evidenceRevision，确认还绑定assessmentId。收据与最终写入同事务，已完成后同操作仍可重放，旧验收收据不会覆盖更晚的完成状态。
- AI必须对本次条件恰好逐项返回conditionId/status/reason/evidence；Zod拒绝额外字段/错枚举，程序拒绝漏项、重复、未知条件及“满足但无证据”。引文必须真实存在于指定正文，保存sourceId/名称/原句/起止位置；多次出现时定位首个匹配，不声称精确到唯一语义片段。整体满足由必选项AND计算，模型不能提交completed。
- 生成前后用条件快照hash和独立evidenceRevision保护，心跳只改变计时字段不阻断验收，提交合并最新计时状态；真正并发证据提交只有一份能通过。确认再查证据hash、条件hash、逐项结果、源版本与最低投入秒数，才写人工完成和关闭计时。旧无version2逐条件依据的验收不再直接确认，网页提示重新检查。
- 支持服务端note/libraryFile/artifact版本引用；文件必须ready且有正文，成果必须属于本任务、不是本次实例创建前的旧成果、未用于其他实例。异步结束/人工确认都再核对存在与版本。输入总正文60000字，超限报错而非截断；提供资料日期、类型和mode给模型，说明AI报告存在不代表用户学习完成。当前网页仍只有文字/既有成果入口，记录/文件选择器后续接入，SUP-04不标全完成。
- 网页保存编辑时的证据版本，异步期间禁改文字/成果及关闭弹窗；逐条件展开状态、原因和原文位置，不把内部text编号当来源名称。任务操作恢复复用持久请求收据；明确502验收错误允许修改草稿后新提交（证据版本防并发重复），网络未知/500仍保留原请求。计时重试入口改名“重试任务操作”。
- 后端4项通过：心跳不干扰+时长与两条件AND+人工确认/收据重放；缺/重/陌生条件、错状态、假引文、越权字段失败无保存；并发证据及条件变更拒旧结果；来源改版在生成/确认时拒绝、错任务/旧成果模型前拒绝。相关phase2原“计划确认/产物/证据+时长门槛”单项更新到新契约并通过，未运行无关全套。
- 最终网页构建index-D76yQCxT.js。桌面真实业务接口（模型HTTP桩）验证证据→条件引文→不足45分钟拒完成→补记→用户确认完成，及已有计时丢响应重试。新增无效AI结果→草稿保留→修改→重新提交场景首次因React textarea填值后的getByLabel精确匹配失效；快照显示输入完好，改按textbox可访问名定位后通过（10.8秒）。未放宽业务断言。计时回归通过2.2秒；最终恢复场景产物/tmp/supervision-evidence-recovery-e2e，报告/tmp/supervision-evidence-recovery-report。
- scripts/supervision-live-evaluation.mjs在隔离SQLite用合成任务与文字、真实生成模型调用1次：两条件均给准确原句及位置、时长门槛仍拒绝、补记45分钟并显式确认后完成，3项通过。证据artifacts/supervision-live-2026-09-29T02-18-41-478Z.json；私有调用日志.data/logs/supervision-live-evaluation.log。不据单样本声称所有证据语义质量通过。
- 部署前一致性备份.data/backups/before-supervision-evidence-20260929成功；没有批量重写旧验收或用户证据。最后仅补来源mode元数据，语法检查通过，网页未再改。API最终PID/健康续记下方。
- 待补：多条件规划/编辑网页、记录及文件证据候选/已选/提交一致性、证据尝试历史/补记区间校验；SUP队列调度/补检查/复盘/待办升级和小九三日反馈也仍在范围内。总goal未完成。
- 最终API PID1086164保留原环境启动，重启前后台无running任务，health返回ok。未动手机或E盘原件。

### 2026-09-29 · 监督证据来源选择与版本可见性

- 上轮仅核对技术选型，无实现进展；本轮继续 SUP-P02。新增证据来源候选/解析 GET 接口，候选、已选解析与提交共用 readSources：记录有正文、文件 ready、有正文，成果属于本任务/不早于实例/未供其他实例使用。按标题搜索、每页20项、独立解析最多10个已选版本；查询不写业务数据或触发模型。
- 网页 RunEvidenceSources 支持记录/文件/成果，搜索分页、独立已选区、正文预览、刷新和移除。预览600字明确标注，提交仍读全文；已选版本失效保持原revision并显示原因，重新选择由用户操作，不自动更新。请求返回以 effect 生命周期隔离，旧响应不覆盖新查询。旧artifactId无版本引用要求重新选择，不捏造历史版本。
- WorkTasks保存打开时 evidenceRefs，提交不再走自动取当前成果版本的旧下拉入口；三类引用随证据保存，失败保留输入。后端仍保留旧artifactId客户端兼容，当前网页使用严格版本引用。
- 后端监督证据5项通过，新增23项分页无重漏、改版已选可见且提交拒绝、非法kind/revision、文件状态、成果归属、已删除来源占位；既有并发/计时/逐条件检查回归通过。构建 index-Df14tCBY.js 通过。
- 桌面真实API流程通过（4.3秒）：选择笔记→修改正文→刷新显示旧版本失效→移除重选→AI格式错误保留草稿→重新验收→时长不足拒绝→补记→人工确认完成，持久引用为用户重选的新版本。首跑测试HTTP模型桩对自动分类请求错误地JSON.parse；改为仅解析验收请求后通过，业务断言未放宽。证据 /tmp/supervision-picker-fixed-e2e，报告 /tmp/supervision-picker-fixed-report。
- 无数据库迁移、无手机或E盘原件操作。部署前后台运行任务数检查首用错列名status，查询失败且未终止服务器；核对schema后用state检查，后续正常重启。SUP整体仍未完成：多条件编辑、验收尝试历史、补记区间、队列提醒/补查/复盘/待办升级仍待实现。
- API以原环境重启 PID1089098，health正常；启动前后台无running任务。

### 2026-09-29 · 监督多条件编辑与未来模板版本

- 上轮来源选择为有效进展，本轮实现SUP-03的逐项编辑。新增supervision-conditions：1–20个稳定条件ID，每项必选证据、1–4000字、合计8000字，最小时长0–1440分钟；重复ID/空值/额外字段/非必选/超限由Zod拒绝。conditionSnapshot复用同一模板校验，旧单requirement仍按一个必选条件兼容。
- 条件更新使用独立planVersion乐观校验，不因执行器日志改变实体revision产生无关冲突。opId绑定任务及完整请求，更新与收据同事务；重放返回原结果、不重复增加版本。conditionChanges保留前后条件、分钟、版本、操作号和时间。取消任务不可改；一次性任务已有实例后不可改；每日模板修改不触碰任何已有实例，只影响以后生成的快照。
- 网页任务详情新增逐项完成条件编辑、添加/移除、分钟和明确生效范围。编辑期间禁开始，保存失败保留草稿；待确认请求先写sessionStorage，断网后刷新可重试原请求，不能偷偷另发新版本。4xx明确拒绝后可修改；另有读取/采用最新条件入口。新网页开始操作传planVersion，旧页面过期确认返回409；旧不传版本客户端兼容仍保留。
- 后端conditions两项+snapshot三项通过：合法双条件/幂等/版本冲突；次日使用新要求且同日/历史快照不变；非法条件无写入及一次性门槛；迁移和实例去重回归。证据验收相关回归另见后续结果。
- 桌面新流程首次通过2.8秒：新增第二项、改45分钟、保存响应丢失→刷新原操作重试只变更一次→开始生成双条件实例→再改未来模板，当前实例仍保留原双条件及2700秒。随后补“旧planVersion不得开始”的接口门槛并进行最终构建/同流程验证。未调用真实付费模型，此处使用HTTP模型桩测试状态流程。
- 最终构建index-PlnFDjd2.js，未改手机/E盘原件，无批量迁移。SUP仍缺验收尝试历史、补记区间、队列提醒与离线补查、每日复盘和待办升级；不据本轮关闭模块。
- 最终桌面流程通过3.2秒，包含旧planVersion开始409；产物/tmp/supervision-conditions-final-e2e，报告/tmp/supervision-conditions-final-report。相关evidence后端5项也通过，未运行无关全套测试。
- API保留原环境重启PID1092055，health正常；启动前后台无running任务。

### 2026-09-29 · 改期契约、操作恢复及旧截止重复提醒修复

- 上轮多条件为有效进展。本轮先核对TECH-01现有event/file worker与SUP旧轮询链路；发现旧snooze发出后清空snoozedUntil，下一tick可能重新发送原due提醒。先修复其源状态契约，再接队列；不声称本轮已实现SUP队列。
- 新增supervision-schedule：snooze/skip严格Zod校验；改期必须有效ISO未来时间，跳过必须1–1000字原因，拒绝额外字段。新网页发送opId及独立scheduleVersion，调整与收据同事务，重复/跨时重试返回原收据，不重排/重复跳过；同编号不同内容及旧日程版本409，已结束不可新改，已删除410。旧客户端可不带opId/version兼容，不据此保证旧请求幂等。
- 改期同时更新scheduledDueAt和snoozedUntil、递增scheduleVersion；保留逻辑日、原证据/条件/时长，scheduleHistory保存原目标时间、改后时间、前后版本和操作。skip关闭计时、保存skipReason/skippedAt、清除活动提醒并留历史。旧内联snooze/skip路径移除，其他动作保持原分派。
- 现有轮询的due去重读取当前scheduleVersion并将snooze视为该约定已检查；新增提醒保存scheduleVersion和scheduledAt，避免延期提醒后又补发旧截止提醒。该临时轮询尚未替换为BullMQ，安静时段、跟进日期和离线汇总完整验收仍待完成。
- 网页复用持久任务操作恢复覆盖snooze/skip；历史可展开查看原/新时间和跳过原因。构建index-C8_hnIRZ.js通过。
- 后端3项通过：跨日改期保留逻辑日/证据/时长；相同操作在约定已过后重放仍不再修改、版本冲突；非法日期/理由无写入；延期提示后连续三tick仍仅一条提醒。该测试使用隔离SQLite与受控Date.now，不声称真实Redis调度通过。
- 桌面2项通过14.5秒：真实API任务改期已成功但响应丢失→刷新→重试原操作，只一条改期历史、版本只增一次、逻辑日/证据版本不变且历史可见；小九/主页/源页改期提示同时消失的已有回归通过。模型规划使用HTTP桩；提示共享回归使用路由桩。证据/tmp/supervision-schedule-e2e，报告/tmp/supervision-schedule-report。
- 无批量数据迁移、手机或E盘原件修改；最后仅移除未使用导入，语法检查通过。下一步仍为SUP持久调度、领取/提交时版本校验、离线补查/汇总和每日复盘。
- API以原环境重启PID1093563，health正常，重启前后台无running任务。

### 2026-09-29 · 监督提醒接入持久队列

- 上轮改期契约为有效进展。本轮新增supervision-jobs，复用现有Redis/BullMQ worker和SQLite background_jobs；移除ensureRuns内直接写提醒的旧轮询。ensureRuns仅创建实例、检查点计时、协调持久工作；新实例通过onCreated回调在创建事务内投递，改期/跳过也在源变更同事务协调。人工完成和显式暂停/取消同事务撤销待发工作。
- 新增supervision_dispatch表，按run保存下一项工作签名/递增代次/jobId。签名包含约定版本、种类、计划时间/实际可送达时间、跟进序号及安静时段，不绑定会被计时心跳改变的实体revision。暂停/恢复、取消/改期重新协调时撤销旧工作并使用新代次；已完成但未实际送达的失效工作可重新生成，避免状态切回后永远卡住。
- worker领取及提交均回读源任务、run状态、调度身份/签名、到期和安静时段；源变化后的旧结果不写提醒。送达记录kind/at/deliveredAt/scheduledAt/scheduleVersion/dedupeKey，业务写入与后台工作完成同事务，重复投递不能重复追加。队列只形成待确认提示，不完成任务、不调用AI。
- 错过开始时直接转截止检查，不连发开始+截止。跨午夜/同日安静时段延到结束；截止后的跟进两小时一次，约定截止所在自然日最多两次，历史欠项不在之后每日继续轰炸。延期送达后不会再产生旧due。历史多项的合并展示和离线缺失实例补建未在本轮实现，SUP-A03/07不能整体标完成。
- 后端queue/schedule/snapshot共8项通过；后续queue+evidence共8项通过，覆盖静音时间计算、错过开始、两次上限、改期撤租约/迟到提交无效、暂停恢复、真实Redis送达/重复投递/延期后无额外due、原证据并发门槛。首次queue测试使用未来固定时钟而repository按真实时间claim，尚未到期导致断言失败；改用该用例实际时钟，保留claim/撤租约断言后通过。
- 追加新Node进程协调验证，已排未来工作ID不变；最终queue3项通过7.3秒。原schedule直接轮询送达测试移除，由真实Redis延期送达用例替代，未将它继续算作轮询测试通过。
- 桌面原多条件+改期丢响应恢复真实API流程在新worker集成下通过4.6秒；产物/tmp/supervision-queue-e2e，报告/tmp/supervision-queue-report。此轮无UI改动，沿用上轮构建index-C8_hnIRZ.js；新增服务端模块语法检查通过。
- 部署前一致性备份.data/backups/before-supervision-queue-20260929成功。API以原环境重启PID1095365，health正常，重启前后台无running任务。实际库supervision_dispatch一行，当前无待排监督工作（原任务已有状态不强制制造提醒）。真实Redis行为证据来自隔离测试，不冒充生产已有到期案例。
- 下一步：离线实例补建及多个历史欠项汇总、监督队列失败状态/重试可见性、每日复盘/待办升级；证据尝试历史和补记区间仍未完成。未动手机/E盘原件，总goal保持未完成。

### 2026-09-29 · 离线补建与小九历史欠项汇总

- 上轮持久提醒为有效进展。本轮新增supervision_calendar启用时段表：记录任务、起止逻辑日、已处理游标、不可变模板及签名。只从首次观察到的启用日起记录，升级前未知启用日不反推；每日任务按已保存时段补缺失日期，实例/游标/投递回调处于同一事务。
- 每轮每任务最多推进31天，游标持续保存，下轮继续，不静默截掉其余天数；同日既有实例只推进游标不复制。补建实例标backfilled、保留原计划分钟及条件，网页明确“恢复后补建、尚未确认完成”。一次性仍只保留一个实例。
- 显式暂停/取消立即关闭启用时段；恢复开启新时段，暂停间隔不补成欠项。已关闭时段尚未处理完的旧日期仍可补齐，不能因暂停抹去之前已有约定。条件编辑同事务保存新时段，次日生效，停机恢复不拿当前模板覆盖旧日期。签名排除会被日志改变的taskRevision，模板仍保留该来源revision供追溯。
- PET把同一任务两个及以上历史到期未处理实例汇总成一条提示，当前日及未来延期项不混入；保留每个run事实及独立处理。已有waiting/review任务级提示的优先规则保留，此类任务仍走任务待处理入口。点击汇总进入该任务的历史列表，可切回全部；查看不确认任何记录。
- 后端snapshot/conditions最终7项通过，新增离线四天补齐、暂停空档、恢复新要求、跨63天分批补完且无重复、停机前改条件从次日生效。原“直接save暂停”测试需补与实际API一致的当日recordSupervisionCalendar调用；否则只在第二天才观察到暂停，会按已知启用区间补当天。这是测试使用了未记录暂停时间的底层写入路径，正式API已同事务记录。
- PET/queue相关8项通过，新增历史组计数/当前项及延期项排除；真实Redis去重、改期和新进程协调回归保持通过。最终构建index-gYLK9sSg.js。
- 桌面2项通过13.2秒：实际API多条件/改期丢响应恢复回归，以及小九历史汇总跳转/仅对应任务/切回全部（后者路由桩）；产物/tmp/supervision-calendar-e2e，报告/tmp/supervision-calendar-report。日期补建的证据来自隔离数据库受控时钟，不声称真实停机数十天实测。
- 部署前一致性备份.data/backups/before-supervision-calendar-20260929成功。无手机/E盘原件操作。SUP仍需每日复盘、待办升级、验收尝试历史、补记区间及队列失败状态/重试可见性；未关闭模块或总goal。
- API以原环境重启PID1097800，health正常，重启前后台无running任务。

### 2026-09-29 · 每日事实回顾与按需 AI 复盘

- 上轮离线补建为有效进展，本轮实现SUP-P04每日回顾入口。GET按Shanghai逻辑执行日筛选workRun，延期目标日不改统计归属；计划/完成/跳过/待处理数和投入秒数由程序计算，只统计保存的计时检查点，未保存的活动秒数不伪计。缺少历史门槛单独计数，不以0冒充已知要求。
- 返回本次条件、已提交文字、引用及版本、已记录原因、约定时间和确认状态；失效来源保留占位但不提供其新正文作为旧版本证据。普通待办/要事不混入监督统计。网页可按日刷新、展开证据并查看对应任务记录；历史已结束项回到任务历史，不重新打开可提交的验收操作。
- AI按需调用既有complete/日志链路，结构仅允许每个runId一份advice；严格拒绝漏项/重复/陌生ID/空字符串/越权字段/非JSON。输入含当前事实与已提交背景，不再索要相同资料；完成状态/数字/原因仍来自程序字段，建议明确标AI且不执行。生成前后按完整事实签名校验，包括时长检查点变化，旧结论不覆盖新事实。
- 结果保存为supervisionRecap（事实快照+建议+签名），新生成不删除旧记录；相同opId绑定day/signature，收据与保存同事务，成功后重试不重复调用模型。网络不确定时网页保留sessionStorage请求，可重试；明确4xx/502允许修正重发。不承诺两个同时到达的同操作外部模型恰好只计费一次。
- 当前AI单次最多40条/60000字上下文，超限明确报错，不截断；完整事实仍可查看。大规模日记录分批AI复盘尚未实现，不能据此宣称不限量能力通过。当前复盘不另行联网。
- 后端2项通过：三状态确定性数字/延期逻辑日归属；AI保存与重放不改完成状态；来源改版不泄露新正文为旧证据；非法输出及生成中事实改变均不保存；旧建议可作为历史参考。最终构建index-DGgOKvy-.js。
- 桌面相关实际API流程通过5.0秒（模型HTTP桩）：原多条件/断网改期回归，打开每日复盘数字正确→无效AI输出有报错→重试显示建议→跳过并刷新显示真实原因、跳过计数及旧建议过期提示。产物/tmp/supervision-recap-e2e，报告/tmp/supervision-recap-report。
- scripts/recap-live-evaluation.mjs使用隔离SQLite和合成学习样例，真实生成模型1次；模型引用已有2700秒、三个用途和例子并建议人工核对，记录保持待确认。2项检查通过，证据artifacts/recap-live-2026-09-29T03-05-18-655Z.json；私有调用日志.data/logs/recap-live-evaluation.log。单样例不代表所有语义建议质量通过。
- 无批量迁移/手机/E盘原件操作。SUP仍有待办升级、验收尝试历史、补记区间、队列失败可见性等工作，模块与总goal未完成。
- API以原环境重启PID1100175，health正常；重启前后台无running任务。

### 2026-09-29 · 待办显式升级为监督任务

- 上轮每日复盘为有效进展。本轮新增todo-supervision：用户明确确认逐项条件、最小时长、一次/每日及时间后，单SQLite事务保存监督模板、当日实例、来源待办关联、日程时段、后台提醒及操作收据。待办原日期/历史保留，监督从确认当天开始；已完成、过期revision、已升级或已有今天转移项的来源拒绝重复升级。
- 新任务executionMode=supervision/status=supervising，只监督用户进展，创建及暂停后恢复均不调用规划模型或旧ACT工具循环。“帮忙做事”独立场景仍未扩展。提取initializeSupervisionRun供普通日历与升级共用，保留原快照/日期/队列契约。
- opId绑定待办及完整条件，相同请求重试返回原taskId/runId；不同操作编号重复升级被来源关联拦截。网页发送前保存请求到sessionStorage，响应丢失后刷新可恢复重试，不重复建任务；明确4xx后允许修改/重新核对。
- 原待办勾选不能改变监督完成状态或日期，删除来源和复制为普通待办也被后端拒绝；UI隐藏升级后的删除/再次升级入口，完成按钮禁用，保留查看监督记录入口。小九不再为已升级来源另发普通待办提示，监督记录作为处理入口。监督详情提供返回原日期待办的来源链接。
- AI验收满足仍不完成待办；用户确认监督实例后，同事务同步关联原待办done/completedAt，收据重放不重复写入。每日后续实例不会修改首日来源待办，只有来源绑定runId可同步。跳过/取消不冒充完成，原历史保留。
- 后端todo-supervision两项+日期快照五项共7项通过：升级去重、纯监督模式、来源日期/状态保留、勾选/删除/carry防绕过、小九来源提示排除、证据满足后仍未完成、人工确认和重放只完成一次、非法/已完成/旧版本无副作用。
- 最终构建index-B4cVMa1B.js。桌面首次升级主流程+上海跨日待办回归2项通过13.3秒；补来源回跳与暂停/恢复后不触发模型断言，最终升级流程通过6.4秒。流程为升级→服务端成功但丢响应→刷新重试只一份→普通done/delete接口409→小九无普通重复提示→证据验收后待办仍未完成→人工确认同步完成→来源回跳聚焦且不能普通重开。模型只在证据检查调用一次HTTP桩，升级/恢复没有模型调用。产物/tmp/todo-supervision-final-e2e，报告/tmp/todo-supervision-final-report。
- 无批量数据迁移、手机或E盘原件操作。SUP仍需验收尝试历史、补记区间重叠校验、队列失败状态及重试入口等收尾；全模块目标尚未完成。

### 2026-10-07 · 监督提醒失败状态与重试补录


监督提醒失败可见性与重试已实现：supervisionReminderStatus只读展示当前工作，retry-reminder绑定jobId/opId与当前约定签名；重复操作不再次排队、改期不能复活旧任务。小九统一显示失败提示，任务列表/证据弹窗可重试。网页未知响应恢复沿用sessionStorage。

后端相关9项通过，另有真实worker故障→failed→显式重试→completed单项通过，仅一条业务提醒且run仍open。桌面模拟接口故障恢复流程通过2.2秒，产物/tmp/supervision-retry-final-e2e。前两次测试定位歧义/模拟证据接口缺失已修正，业务断言保持。主项目最终构建index-BhD3Givg.js。

旧API进程不再运行，已通过现有scripts/start.sh恢复服务，最后直连健康ok，API PID2557、启动脚本PID2325，Qdrant/Qwen健康200；这些是权限变更前的验证，继续时应重新确认。默认urllib受代理影响报HTTPError，curl --noproxy直连正常。未更换模型配置。


### 2026-10-07 · 恢复写入、合入补记区间与网页验收

- 前轮受只读挂载与本地listen EPERM阻塞，临时补丁保留，未冒充已部署。本轮明确使用/mnt/d/OpenResource/PersonalAgent；写入/本地监听均通过。权限配置同时已改变，不能仅归因于路径大小写。
- 合入前逐一核对7个基础及目标SHA256均一致，原文件备份/tmp/personalagent-timer-before-merge-20261007。网页补记必须填写起止时间和原因，计算1–1440分钟；后端拒绝未来、倒序、时长不符、同任务跨实例与计时/补记重叠，相邻允许。失败在计时结算与写入前返回；旧分钟请求兼容并标duration-only，旧区间未知明确显示，未伪造可核对的历史。
- 后端node --test tests/supervision-interval.test.mjs tests/supervision-timer.test.mjs：6项通过。npm run build通过（含tsc），index--Rgnyvom.js。
- 桌面真实API/模型HTTP桩两流程分别通过：证据逐条件显示、时长门槛与人工确认3.4秒；计时→补记丢响应→刷新原op重试仅一份→重复区间报错且保留输入、秒数不变2.7秒。第一次计时测试末尾.phase-panel匹配到复盘面板产生strict locator错误；改为对应任务卡片并增加重叠回归后通过，无降低业务断言。产物/tmp/supervision-interval-merged-e2e及/tmp/supervision-interval-final-e2e，报告对应-report。
- 部署检查发现旧API/worker持有不可从路径访问的WAL/SHM句柄，新数据库连接报unable to open database file；没有据health成功忽略。主库immutable完整性ok且变更序号937，与旧API实际bootstrap游标937一致，已保存主库副本。旧进程正常退出释放句柄后，常规SQLite连接恢复，完整性ok、序号937、running任务0，并用SQLite backup保存快照到.data/backups/before-timer-interval-runtime-20261007/shiguang.sqlite。该目录为数据库专项备份，不冒充包含附件的整库恢复包。
- API以原环境重启PID10104，health正常；生产密钥未输出、未更改。未操作手机工程/E盘原件。SUP验收尝试历史等仍待继续，总goal未完成；后续按原全模块范围推进。

### 2026-10-07 · 监督证据检查历史

- 上轮补记区间合入及真实网页验收为有效进展。本轮补supervisionEvidenceCheck历史实体与每个实例的分页/详情读取，列表仅返回摘要，按持久rowid向前分页，新检查插入不打乱正在读取的旧页；详情核验run归属，未知/其他实例不能串读。
- AI已返回的有效检查与workRun更新、操作收据同事务保存；已成功请求重放不调用模型、不新增第二条结果。格式错误、调用失败或提交前真实并发变化分别保存失败/作废记录，不覆盖当前结论，也不确认完成。模型调用中进程崩溃尚未返回的请求没有被假造为已完成检查；本历史不冒充完整模型调用审计。
- 保存当时的条件、文字、引用版本和已校验正文快照。详情标明来源后来修改/删除，不把最新正文当作旧依据。旧版本当前assessment在下一次成功检查覆盖前保留为legacy，缺失的引用正文/更早历史明确无法还原；没有批量编造历史。
- 任务卡片新增按需展开“证据检查历史”，可刷新、加载更早、查看逐条件结论/当时文字和材料；请求序号防旧响应覆盖，长文本保留换行，错误可见。切换详情重置展开状态；查看不触发模型或业务确认。
- 后端证据相关7项通过；最后给legacy去重补run归属后仅重跑history相关2项通过。包含并发作废、来源改版/删除、幂等重放、25项跨页中插入新记录不重漏、跨实例拒绝及新进程读历史。
- 网页构建（含tsc）通过，最终index-C8AeyRGo.js；桌面真实API/模型HTTP桩一条主流程通过4.7秒：无效结果报错→修订成功→补记/人工完成→修改来源→刷新→回看失败和成功版本，旧正文可见且模型总调用仍为2。产物/tmp/supervision-evidence-history-e2e，报告/tmp/supervision-evidence-history-report。
- 部署前在SQLite写事务锁内创建一致性完整备份.data/backups/before-evidence-history-20261007（29文件，内部凭据保留不输出）；后台running为0后API按原环境重启PID11400，health和已登录历史接口均正常。未动手机或E盘原件。
- 下一步补PET-07的已确认任务完成反馈、同一每日任务连续三个完整计划日的未完成/待确认区分和刷新不重播；随后继续RES/记账/SET等全目标缺口。新增supervisionEvidenceCheck与既有supervisionRecap的JSON导出覆盖需在SET收尾验收，完整SQLite备份已保留这些实体。模块全项/总goal仍未完成。

### 2026-10-07 · 小九的完成反馈与三日关心（PET-07/P04/A06）

- 上轮证据历史交付为有效进展。本轮新增SUP只读事实计算supervision-feedback：完成反馈须有completed及有效confirmedAt；每日连续判断按上海日期和已过约定截止的实例，今日未截止从昨日回看，缺计划日/重复日/完成/跳过/已明确改期/未知历史条件均断开，不拼接任务或推断用户努力程度。已交证据review与待补进展open分别说明。
- 显式暂停同事务记supervisionPausedAt；恢复保留中断日期，暂停当日及之前不纳入新的连续段。旧暂停模板恢复时无中断时间则从本次恢复设保守界限，不编造以前准确的暂停时间。连续三个新合格日后可重新出现事实。
- 三日文字复用现有历史汇总/任务处理提示，不新增第二套队列或主动催促；只有SUP已实际发出的当日due/followup能产生关心反馈身份，quiet时不输出关心反馈，服从原跟进上限。任务完成庆祝独立于待办提示计数，不清除红点、不确认其他事项。
- /pet/reminders快照附feedback，首次读取仅建立基线，旧完成历史不逐条播放；重复读/刷新不重放。新事件可替换旧情绪，moodVersion和取消timer共同避免旧回调清掉新状态。聊天进行中不覆盖正在交流的内容，提示表仍保留业务事项。复用现有开心/思考素材，短暂反馈结束回常态。
- 后端pet-reminders+supervision-feedback共8项通过，覆盖三日截止边界、review/open、跳过/改期/缺日/重复日/暂停/取消/旧条件、只读聚合、稳定事件身份、安静时段及无实际送达不额外关心。npm run build（含tsc）通过，index-c7Q9_yGw.js。
- 桌面3项通过18.7秒：受控时钟验证初始历史不播放、完成→关心替换、旧timeout不干扰、恢复常态且红点保留、轮询/刷新不重播且无业务写请求；真实API/模型HTTP桩的证据人工确认触发开心与完成台词；待办升级暂停恢复保留时间标记、仍不调用规划模型。产物/tmp/pet-feedback-e2e，报告/tmp/pet-feedback-report。不真实等待三天，不新增模型质量重复实测。
- 无表结构迁移、无历史数据改写；运行服务无running工作后按原环境重启PID12760，health正常。未动手机/E盘原件。PET整模块仍需与后续记账提醒联验；RES/LangGraph及预算、记账、SET导出/恢复等仍未完成，目标保持active。

### 2026-10-07 · 调研持久检查点与累计预算基础（RES-P05 / TECH-02）

- 上轮PET业务反馈为有效进展。本轮完整读取RES spec/plan及现有worker、生成接口；确认现有complete只返回正文，没有用量结算接口，旧workTask工具循环不能直接宣称满足5分钟/1元或LangGraph要求。
- 对照已安装LangGraph 1.4.18、checkpoint 1.1.5契约实现ResearchCheckpointSaver，使用注入的现有SQLite连接，保存v4检查点/父子关系/命名空间/中间写入/序列化类型，支持按线程读取历史及删除。普通中间结果保留首写、框架特殊恢复/错误写可更新；写入前有租约校验回调，失效worker不能提交。版本不兼容明确失败，不自动猜测迁移。构造器才建表，导入模块不迁移在线库。
- 新增researchApprovalCommand，恢复前核对等待节点、计划版本与内容哈希、严格true确认；需要调用方另外核对SQL人工确认记录及持有工作租约，不能仅凭图状态授权。真实图测试发现“只在interrupt返回后拒绝旧业务版本”会保留错误resume值、妨碍正确重试；改为进入图前校验，错误版本→正确版本续跑用例通过。
- research-budget保存每次研究唯一预算、调用预留与结算：固定300000ms/1000000微元（1元），初始化/重试不重置；价格版本必需，同步骤不同请求/价格拒绝复用；成功结果可重放，未结算调用不能重复发起；调用失败/用量未知保留保守费用上界，取消不返还未知费用。等待人工确认无新执行段，不累计等待墙钟时间。异常提供方用量超过预留时如实保存超额事实并阻止后续调用，不截成假合规账单。
- 两独立进程竞争测试先发现deferred savepoint先读后抢写产生SQLITE_BUSY；改为外层写操作BEGIN IMMEDIATE、已有事务内savepoint，后到进程读取最新余额并得到RESEARCH_BUDGET。检查点写入也沿用相同锁顺序，读操作保持只读事务。
- 去掉预算模块对device-auth的payloadHash导入，避免基础库意外加载应用单例数据库；改为模块内纯规范化哈希。复核在线changes最大序号仍937、运行报告0、research新表0，本轮无在线数据迁移。直接依赖@langchain/langgraph-checkpoint ^1.1.5已写入package/lock，实际使用已有1.1.5，不升级其他包。
- 最终node --test tests/research-foundation.test.mjs：7项通过51.8秒。包含真正LangGraph图生成计划→interrupt→退出进程→新进程恢复，等待不增预算、旧计划拒绝后正确确认、重复恢复仅一份测试成果；取消拒绝、两个连接与两个独立进程共用额度、崩溃预留持久化、未知费用、超额事实、命名空间和失效租约。模型步骤/价格/成果为隔离合成测试，不冒充已接真实调研模型或生产成果。仅重跑因新增并发与锁修复受影响的基础套件，没有网页/手机/无关全量测试。
- 当前git已可用；git status显示用户记账原文、架构HTML等已有改动，本轮未覆盖这些文件。此前“无git”启动基线保留为历史事实。
- 未接应用生产worker/API/网页，未重启服务或写在线研究表。下一步：建立workTask的research执行模式及结构化简报，接入带用量/价格快照/取消信号的生成适配、队列与图节点，完成计划确认页面；再接本地证据/联网降级/固定报告与回填。调用上界和真实计费仍待提供方小样本核实，RES-A08/TECH-02整体未验收。全目标仍active。

依据：[LangGraph检查点持久化](https://docs.langchain.com/oss/javascript/langgraph/persistence)、[人工中断与恢复](https://docs.langchain.com/oss/javascript/langgraph/interrupts)，同时以本地安装包的BaseCheckpointSaver/MemorySaver契约核对实现。


### 2026-10-07 · 调研模型用量与费用结算适配（RES-P05，仍未全链路验收）

- 上个用户交互轮仅确认工作目录，未完成开发；本轮重新核对真实工作树后继续。所有命令明确指定 /mnt/d/OpenResource/PersonalAgent，未覆盖用户记账原文/架构HTML等已有改动。
- 从 engine 抽取 model-completion，原 complete 默认仍返回正文；新增可冻结提供方配置、返回计量收据及调用方 AbortSignal。读取响应正文也受超时/取消约束。空内容/截断异常仍带用量；HTTP/网络/无效JSON缺失用量保持null，不伪造零成本。收据只保留规定用量字段，不保存任意供应商附带对象。原提示/响应/错误终端日志及密钥脱敏保持。
- research-model 与持久账本贯通一次调用：先预留，再发请求，再一次性结算；已成功结果重放不再调用，失败的同一步也不偷偷重试，显式新尝试继承预算。租约失效后的结算不绕过保护，未结算预留继续占额。取消信号传递到底层网络；真实返回用量超出协议上界即记录实际值并停止该研究后续请求。图节点授权/队列租约和收束预留尚待集成，不能认为此适配器已完成整个调研。
- 核对官方当前人民币价格：只为官方deepseek-flash配置启用版本化价格契约，拒绝未知模型/中转地址。高峰价保守预留和用量核算，峰谷/节假日计费时刻无法确认，不冒充实际扣款；账本新增usage-upper-bound并计入uncertainMicros。新付费请求的价格复核期限2026-11-07，已有结算结果不因复核期失效而无法重放。
- 下载官方tokenizer包到/tmp只读检查，没有执行其中Python/trust_remote_code，也没有新增依赖。tokenizer.json SHA256 89085f12ef79460ac5f66d1119325ddfc694b4ab209d80bbd81d35f081dc9614，为无扩张normalizer的byte-level BPE。当前纯文本双消息以UTF-8字节数+1024协议tokens预留，关闭思考、限制最大输出；不支持图片/tools/schema计费。在线协议额外开销没有供应商硬保证，属于待持续核对的工程界限，实际越界会停止，不以小样本宣称费用绝对保证。详细来源和限制见scripts/research/README.md。
- 验证：model-completion+ai-log 6项通过（含真实本地HTTP响应体卡住超时、进行中取消）；research-model 6项通过，最后增加价格复核期后重放再跑这6项通过；账本受影响3项通过（两进程竞争、未知费用、崩溃预留）；原engine相关7项通过。没有重跑无关图/网页/手机全套。
- 真接口仅一条固定无个人资料提示，scripts/research/evaluate-model.mjs只读线上配置，在临时目录建立预算与日志，线上store不初始化。2026-10-07T15:14:35Z deepseek-flash返回“计费验证成功”，输入29/输出4/总33 tokens、缓存命中0，处理470ms；按高峰价保守核算90微元（0.00009元），余额999910微元。证据artifacts/research-model-metering.json；脚本遇已有证据拒绝覆盖，避免自动重复计费。没有把此输出当正式研究报告。
- 本轮未修改在线业务数据、未生产迁移research表、未重启运行服务；新增代码尚未通过生产RES入口使用。下一步接workTask research类型/结构化简报、实际LangGraph节点和共享worker、计划确认API/网页，再接检索证据/联网降级/成果版本；RES-A08/TECH-02与总goal仍未完成。记账及其他模块缺口继续保留。


### 2026-10-07 · 调研应用图、计划确认与网页报告入口

- 上轮模型计量适配为有效进展。本轮核对共享workTask/worker，新增research模式与结构化简报/类型/关键问题/原文引用/话题快照。创建、确认、取消、重试以操作编号与输入哈希持久去重；生成计划异步进入已有SQLite outbox→Redis/BullMQ worker。旧任务循环、监督条件编辑和资料关联接口不能绕过调研确认/固定引用，调研不会创建每日监督实例。
- 生产research handler使用实际LangGraph、ResearchCheckpointSaver和SQL预算：prepare_plan→confirm_plan interrupt→collect_evidence→write_report；人工决定先校验SQL计划版本/哈希，再传入Command。确认后新队列工作恢复同一图；等待阶段释放worker。检查点和预算写入都受当前job lease/researchVersion保护；取消每250ms传播到请求；成果与队列finish在同一事务提交。模型已返回但成果提交前中断，恢复从检查点发布，不再付费生成第二次。
- 新增researchInput保存当时原文与最近6轮话题快照；引用来源及话题版本在生成、确认、发布前重查，删除/改版不被当网络失败降级。选材当前每份前8000字，保留总长度/范围/truncated；这是尚待扩展的显式局限，不冒充自动混合检索或完整长文分析。
- 模型计划/报告均严格结构校验；报告只允许本次证据ID，覆盖项与用户问题一一对应，模型不能设置要事等级/确认等字段。原文依据与model_knowledge逐段区分，结构校验不冒充事实核查。搜索未配置或费用上界未知时说明原因并知识降级；计划提示词亦声明该能力限制。真实Brave/网页工具尚未接入，不能声称自动联网已实测。
- 报告保存复用artifact，当前为首个版本及只读候选；SQL生成Markdown下载。预算触限不额外总结调用，而是mode=local、明确“程序阶段进度”，不写成AI草稿。行动/要事候选没有自动执行或确认；用户选择保存入口仍待实现。
- 网页任务页新增“快速学习与调研”：四模板、背景/问题/约束/时效/产物、分页选材及旧版本保留/移除；计划详情、确认、取消、重试、处理时间/费用与未知费用说明、报告与原文快照。创建/动作请求先把操作编号存sessionStorage，未知响应可恢复同一操作。搭子创建任务携带当前引用和话题。小九接调研计划确认、失败与成果提示，未新增提醒调度器。使用ui-ux-pro-max表单反馈查询指导加载/错误与标签，延续现有页面样式。
- 后端research-tasks 5项通过，随后接来源话题校验/失败提示后与pet-reminders合跑共10项通过；新增预算耗尽、进行中取消两项单独通过。含实际Redis/BullMQ执行真正图到interrupt并释放worker、SQL人工确认后报告、错误计划拒绝、无监督实例、幂等创建、成果提交前中断不重付费、来源改版拒绝发布、非法AI引用/覆盖/越权字段。模型为隔离注入桩，未冒充真实模型质量。
- 网页构建含tsc通过，最终index-BiYEtA8q.js；第一次tsc发现由session草稿any推导出的参数类型，显式string修复，没有降低检查。桌面真实HTTP/SQLite/Redis/图+模型桩主流程4.9秒通过：旧选材报错保留输入→重选→创建响应丢失→刷新恢复仅一任务→人工确认前无成果→确认生成→原文与覆盖表/预算可见→刷新重开无重复。产物/tmp/research-first-e2e，报告/tmp/research-first-report。专用fixture仅在Playwright显式环境启用，生产模块没有模拟模型开关。
- 真模型隔离流程scripts/research/evaluate-flow.mjs只用固定无个人资料文字，人工确认由脚本模拟；DeepSeek实际计划/报告两次调用通过。artifact与检查点位于临时数据库，证据artifacts/research-flow-check.json；累计处理8348ms、保守费用14784微元（0.014784元），两个问题完整保留，报告明确未联网核验及练习未执行。之后仅补计划提示中的搜索能力限制，未重复付费实测；已有报告不当作真实联网证明。
- 部署前SQLite写事务锁内完整备份.data/backups/before-research-runtime-20261007，29文件含受限凭据，未输出密钥。确认后台running=0后按原环境重启API，最后补定时器构造失败清理后运行PID18819；首次进程校验因node可执行文件为绝对路径而安全拒绝，核验实际exe/cwd/entry后继续，无重复进程。health正常，在线changes仍937/research表0/running0，测试没有写用户业务数据，新表在首次实际创建调研时才初始化。未改手机/E盘原件/用户记账原文。
- 继续项不能遗漏：RET混合取材与长文分段、Brave付费界限/真实网页/失败分类、预算内缺口补查、编辑简报→网页接力→回填及报告版本、候选选择保存和要事等级人工确认；预算当前计模型/取材步骤，图编排与本地处理开销、收束预留、全图执行时间/费用边界仍需整体核算。研究输入新实体与图/预算表需纳入SET JSON导出/恢复审计。完整RES-A01–A08及TECH-02未全部通过；记账与其余模块缺口继续，goal保持active。


### 2026-10-08 · 网页接力、回填恢复与报告历史（RES-P03/P04）

- 上轮应用图与网页报告是有效进展。本轮在已确认计划上增加主动handoff→waiting→external→同任务续跑，以及结束接力返回原成果/继续失败进度。未确认计划、当前仍执行、旧handoffId或过期revision拒绝；操作编号去重涵盖接力和回填，未知响应不会重复创建材料或队列工作。等待不增加处理时间/费用，不在后台偷偷调用模型。
- 抽出search-brief的确定性renderSearchBrief，与搭子共用固定回答格式。调研简报直接整合背景、约束、时效、关键问题、已选片段及最近话题快照；助手建议单独标明未独立核验，不当成用户事实。可编辑后保存、复制与打开DeepSeek网页，复制不可用时选择文本并给出手动复制反馈。修正长话题/背景生成长度与提交上限不一致的风险，将可编辑简报上限统一为64,000字，没有静默截断用户背景或为了简报再付费调用模型。
- 新researchExternal保存完整回填文字、用户所附HTTP(S)链接和providedAt；链接不触发fetch，不把提交时间写成网页retrievedAt。每份回填明确user_fill/unverified，与原文和model_knowledge区分；报告逐段和来源列表均提示未独立核验。URL非法/重复、旧接力与并发状态错误无副作用，网页保留输入。新增只读原文接口按task归属/引用revision核验，完整回填记录在任务中可读；全局成果来源也识别回填类型，不再误显示“来源已删除”。
- 同一LangGraph thread以持久reportVersion标记从confirm_plan节点更新状态后续跑，不重建业务任务或总账本。新attempt沿用累积预算，重试不能把上个报告当新结果；成果用researchReportVersion/previousArtifactId关联，旧版不覆盖。第二版模型返回而成果提交前中断，恢复检查点后只发布一次、不重复调用；旧版字段缺失按第1版兼容。
- 预算触限仍保留前次已取得的证据和新回填原文，不发额外模型总结；阶段产物明确程序保存而非AI报告。初次模型失败也允许主动接力后恢复，保留失败调用的未知费用。正文片段仍有当前8000字取材限制，但完整回填可单独读取，不能把片段当全文分析。
- 后端research-tasks+web-search共10项通过；新增生成失败回填恢复/耗尽预算保留材料2项、长话题角色区分与无额外模型调用1项分别通过。覆盖同一线程updateState续跑、旧版不变、未知响应幂等、越权/旧接力拒绝、取消接力、报告提交前崩溃及累计费用。结构测试不冒充事实可靠性。
- 桌面真实HTTP/SQLite/Redis/图+模型桩一条扩展主流程7.4秒通过：保留此前的失效选材/创建丢响应检查，再编辑简报→等待→非法URL保留输入→回填响应丢失→刷新恢复只一份→第二版报告→读取超过片段长度的完整回填→切回第一版。产物/tmp/research-handoff-e2e，报告/tmp/research-handoff-report。随后只调整简报长度上限与话题补全，运行相关后端专项与最终构建，没有重复跑桌面或无关全套。
- 实际模型仅增加一次报告调用：scripts/research/evaluate-handoff.mjs复用上轮隔离真实样本的同一个task/checkpoint/预算，模拟用户回填，不读取真实用户资料。2026-10-07T15:57:40Z成功得到第2版，原版正文保持；等待前后预算同为8348ms/14784微元，续跑后16579ms/33132微元，本次增加8231ms/18348微元（0.018348元）。证据artifacts/research-handoff-check.json；这是模型处理手工回填和旧检查点恢复，不是自动联网验收。
- 最终网页构建含tsc通过，index-rCo2m-dj.js；保留默认约702KB主包提示，未通过提高告警阈值隐藏提示。本轮未新建依赖或改手机/E盘原件/用户记账原文。部署前完整备份.data/backups/before-research-handoff-20261008；运行API按原环境更新为PID21857，health正常；后台running=0，在线变更序号941。较旧基线增加的4次变更为note/classificationCorrection，完整备份已包含这些内容，未将测试写入在线库。
- 继续项：自动dense+sparse取材/长文分段、Brave价格与真实搜索/网页读取、错误分类和预算内补查、行动/要事候选确认保存、图编排与本地处理时间/收束额度统一核算，以及SET中researchExternal/图/预算/输入等导出恢复。RES-A03/A07的接力部分有证据但自动联网路径仍未完整验收；记账及其他模块缺口保持范围内，goal仍active。


### 2026-10-08 · 调研长文后段取材与准确位置（RES-P01，混合检索仍待接入）

- 上一交互轮只核对工作目录，没有业务开发进展。本轮重新读取19号执行文档、RES完整spec/plan、工作树与现有研究代码，继续使用精确目录 /mnt/d/OpenResource/PersonalAgent；保留用户记账/HTML/字体等改动。
- 新增research-evidence纯选段模块并接入实际research-jobs：短文保留原始空白和全文；长文扫描全部段落，按每个问题优先选取关键词匹配段落，再补相关段落。每份最多8段/8000个JS字符串单位，片段有100字重叠，保留准确start/end、版本、selectionMethod、matchedQuestions。没有匹配时分布式预览并明确标签，不把词项检索冒充语义理解，也不把全文扫描说成模型完整读完。
- 报告来源区写明关键词扫描或预览限制；用户回填仍无retrievedAt、保留providedAt和user_fill/unverified。现有网页来源列表和Markdown下载使用新位置，无须改网页布局。旧账本/检查点结果不重新选段、不覆盖历史成果。
- 本地取材每次扫描检查租约与剩余取材时间，成功/失败都结算实际处理时间；失效租约仍不能写账本。全图开销与完整预算保证仍待统一核算，不因本次检查关闭RES-A08。
- 验证：node --test tests/research-evidence.test.mjs tests/research-tasks.test.mjs 共16项通过（4项新选段专项+12项原应用图/恢复/真实Redis队列测试，模型为注入桩）；随后补一项确认长文计划→实际图取材→保存成果测试单独通过，原文相关内容位于8000字之后，成果引用逐字等于对应版本原文slice。未重复付费模型、浏览器/手机全套。
- 本轮没有新依赖、数据库迁移、生产服务重启或在线数据写入；新选段代码待后续取材整合后一并更新运行服务。下一步继续现有RET混合检索的取消/只读/源范围接口及RES接入，补自动发现证据与发布前版本验证。Brave价格/真实联网、补查、候选保存、完整预算以及记账等其余模块仍在范围内；本次不是RES-A01或整体goal完成。


### 2026-10-08 · 调研所需的只读混合检索接口（RET/RES基础）

- 上轮长文选段与验收为有效进展。本轮从现有searchIndex继续补接口边界，没有替换Qwen/Qdrant或重做索引。新增内部controls：readOnly、signal、sourceIds；既有调用默认行为保持。
- readOnly只核验已有集合维度/Cosine/sparse配置，不创建集合、不写索引descriptor、不生成outbox。明确来源ID范围同时写入dense/sparse预取与最终fusion filter，并在SQLite结果复核时再检查；空范围直接返回，不发embedding。非法/重复/过多ID拒绝。
- readOnly结果还逐条核对当前SQL正文的start/end和原文slice，拒绝版本虽相同但引文/位置损坏的向量payload。现有源版本、记忆状态/来源有效性、项目/话题范围与相关度过滤继续生效；这只是取材时校验，RES发布时仍需复查。
- 修复jsonRequest覆盖调用方AbortSignal的问题：调用方取消与内部15秒超时合并，embedding、Qdrant及响应体读取都受控；取消保留原始reason，不包装成可降级的503错误。普通非只读search的集合检查也传递signal，取消后不继续初始化索引状态或查询。
- 验证：首次retrieval+relevance共14项通过；补普通集合取消后retrieval全文件14项通过；最后增加原文位置/引文复核后仅运行相关6项通过。覆盖真实ReadableStream响应体挂起后取消、缺失集合不创建、源范围两层过滤、SQL total_changes不变、损坏引用拒绝。网络为隔离fetch桩，未冒充真实Qwen/Qdrant调研验收，未重复浏览器/付费模型测试。
- 尚未把此接口接入research-jobs，下一步需明确本地embedding计价边界、取材预算/超时和错误分类，再合并语义片段与已选原文、冻结自动发现来源并发布前复核。当前在线服务仍未重启，本轮无迁移/用户数据写入/手机或E盘原件改动。RES整模块、记账及总goal保持未完成。


### 2026-10-08 · 实际调研接入Qwen/Qdrant、证据冻结与发布复核（RES-P01）

- 上轮只读检索接口为有效进展。本轮新增research-retrieval并接到实际LangGraph确认后的collect_evidence；逐个关键问题调用现有dense+sparse/RRF检索，自动发现可用个人记录/要事/文件及适用已确认记忆，保存R编号、准确sourceField/start/end、源revision、取得时间和matchedQuestions。原已选材料/回填选段继续保留，报告写明混合检索片段与摘要字段位置。
- 每个问题/报告版本/显式尝试有独立持久计量步骤，沿用同一任务总账本；已结算步骤重放不重新查询，逐步预留最多15秒、实际结算。本机已安装Qwen协议加loopback Qdrant按零API费用处理；未知远端/中转费用没有发请求，也不假称语义检索成功。服务离线/429/超时保留其他已取得材料并说明限制；401/403/输入错误/来源冲突不降级。取消保留保守预留，仍受租约写保护。
- 自动发现来源在取材、缓存重放、报告模型调用前、恢复后及成果事务提交时复核当前版本、状态/记忆范围、可读副本与准确原文；来源变更时拒绝旧成果。显式重试失效自动来源后从原已确认计划继续，排除失效旧片段并明确说明，预算不清零。用户手选来源仍沿用原严格版本核对，不擅自换掉用户引用。
- 测试发现最初对所有researchAttempt变化重置图会导致“报告完成但发布中断”重试重复调用模型；已收紧为仅自动来源确实失效时重新取材。普通中断继续使用已完成检查点，网页回填仍按reportVersion进入新轮。这项回归未遗留在最终运行版本。
- 验证：接入后research-tasks+evidence 17项通过；research-retrieval新增4项通过（逐问账本/重放、部分失败、未知费用不调用、预算保留证据、引用/位置/记忆失效、取消）；只读检索相关6项通过。新增实际图自动取材→发布前改源→拒绝→显式重试取新版本通过。重试重置改动后全文件曾12过/2失败，修复后对新增来源恢复和两个失败检查点/网页接力案例共3项复验通过；其余11项有效证据复用，没有重复全套或付费模型。
- 真实本机服务：scripts/research/evaluate-retrieval.mjs只读线上检索配置、临时SQLite和随机独立Qdrant集合，索引两份固定无个人资料样本；实际Qwen+Qdrant在问题措辞不同的情况下找到9001字后的ROLLBACK段落，准确位置9001–9064，实际取材214ms、API费用0、无挂起预留。证据artifacts/research-retrieval-check.json（2026-10-07T16:22:31Z）；临时远端集合已删除，只删除脚本自己创建的随机集合。未把此结果当真实生成模型/联网搜索/完整RES验收。
- 本轮无数据库迁移、网页TS修改、用户数据写入、手机/E盘原件改动；在线change seq持续941，后台running=0。已有before-research-handoff-20261008备份保留；后端按原进程环境更新，随后修正上述重试回归再次更新（最终PID/health见后记）。启动首次health连接失败时核对原进程仍活跃并重试成功，没有因观察超时重起副本。
- 继续项：自动取材跨报告的证据保留/缺口补查与范围披露审计、Brave价格与真实搜索/网页读取、行动/要事候选确认保存、全图预算与收束额度、SET导出恢复，记账与其余模块缺口均继续保留。RES整模块与全goal未完成。

- 部署后记：最终API PID24385；再次启动初期同样尚未监听端口，复查同一存活进程后health成功。线上change seq941、running jobs0，未写入测试数据。


### 2026-10-08 · 调研候选确认保存、共享任务与要事关联（RES-07/P04）

- 上轮实际混合取材是有效进展。本轮实现save_candidate严格输入：指定原报告ID/revision与候选序号，用户可编辑标题/描述、选择保存类型；要事必须显式选择normal/high和one_off/long_term，AI没有等级默认值。约定检查时间可选，未填不偷偷建提醒；有时间复用现有event生命周期/队列。
- 行动建议保存为现有workTask的supervision草稿，计划/完成条件来自用户核对后的描述；投入分钟数和确认开始后的检查时刻可编辑。不会调用旧ACT执行器、不会自动开始监督、不会调用AI生成另一份计划或增加调研预算。界面明确“由你执行，确认计划后才开始监督”，不扩展待讨论ACT场景；后续可在共享任务页面核对条件并确认开始。
- 原报告保持不变；父调研candidateDecisions与目标sourceResearch保存报告版本、候选快照和相互关联。要事relatedTaskIds关联父调研；行动任务有返回来源调研入口。历史报告可选择保存，不强迫使用最新版；重复同一候选/同一决定返回既有目标，不同决定提示到原目标编辑，删除后的目标显示失效，不自动重建。
- 创建目标、发生次序/提醒队列、父调研保存和opId收据在一个SQL事务内。首次专项发现initializeEventLifecycle不支持外层事务；新增局部savepoint复用，保留原独立事务行为。触发器模拟父调研更新失败，确认event/occurrence/queue全部回滚，重试才创建一份，未留下半成功数据。
- 网页用ui-ux-pro-max表单确认/错误反馈指导，沿用原样式：逐条展开编辑、标签/长度、忙碌状态、保留草稿、保存后显示目标及跳转。复用researchRequest的持久操作编号和未知响应恢复，不另建并发请求规则。多片段同一回填只保留一个读取全文按钮，避免重复入口。
- 验证：research-candidates首次2过1失败（嵌套事务），修复并补回滚案例后4项全部通过；受影响event-lifecycle原6项全部通过。npm run check及最终npm run build含tsc通过，网页index-Begy9p1m.js，约706KB，保留原构建体积提醒。
- 桌面扩展研究主流程通过8.6秒（共20.7秒含启动）：先复用旧选择/确认/网页接力/历史报告路径，再保存行动响应丢失→恢复同一操作→仅一份草稿/无run；要事等级/类型未选不可提交→手选高等级长期要事→保存成功；打开任务并返回来源调研。产物/tmp/research-candidates-e2e，报告/tmp/research-candidates-report。首次浏览器运行在新构建完成前误读旧dist，遇到旧版回填按钮重复；新构建后复跑通过，未把旧构建失败算成新版通过证据。专用模型fixture现返回两条候选并最多引用8条证据，符合生产输出schema；没有线上模拟开关或付费模型测试。
- 本轮未迁移数据库/写线上测试数据/改手机/E盘原件/用户记账原文。部署前核对API和后台无running任务，change seq941，沿用原环境更新；最终PID与health见后记。继续真实联网与费用契约、证据补查/预算全口径、SET导出恢复和记账等范围内缺口，不把候选保存完成当作RES或总goal完成。

- 候选保存部署后记：API PID25930，health正常，在线change seq941、running jobs0；无线上测试写入。


### 2026-10-08 · 搜索/网页取材的取消、错误分类与真实正文位置（RES-P01/P03基础）

- 上轮调研候选保存为有效进展。本轮读取现有web-search/task-tools，核对Brave官方Web GET参数（600字符/75词）与Search价格（5美元/1000次，非Answers费用）。美元价不能直接当人民币1元保证；汇率/账户实际计费上界仍待接入，没有据此发起付费搜索。
- searchWeb保留旧数组返回方式，新增冻结key、调用方signal、timeoutMs、returnDetails。移除原query.slice静默截断，超长/空问题在请求前明确报错；只发送问题、不发送研究原文。401/403访问拒绝、429限流、400/422输入、网络不可用和无效响应分别分类；取消原样传播，覆盖响应正文读取。搜索请求禁止自动跳转泄露密钥，输出明确search_snippet/实际retrievedAt，不把结果页摘要当全文；记录现有脱敏后端日志。
- 从task-tools抽出public-page，旧入口兼容重导出。一个调用的DNS、各次跳转、正文读取共享总超时和取消；DNS每次验证公开地址并绑定实际连接，跳转/错误正文及时关闭。仍限公开HTTP(S)/文本/2MB；继续读取支持start/limit、实际total/end、全文SHA256和expectedHash。后段请求发现正文已变化则WEB_STALE，不能拼接不同版本；位置以抽取归一化后的网页文本为准，不冒充HTML字节或DOM位置。
- 验证：web-search 4项通过（完整问题/摘要标记、无请求输入拒绝、权限与服务错误分类、正在读取响应体时取消）；public-page 4项通过，新增expectedHash后只复跑这4项通过（长文分段、跳转清理/内网拒绝、DNS/正文取消、大小/类型/状态）。没有无关全套、手机或付费模型调用。
- 真实公开网页读取成功：2026-10-07T16:42:13Z读取SQLite官方事务文档 https://www.sqlite.org/lang_transaction.html ，抽取8211字符并找到ROLLBACK，保存内容哈希、范围、时间而未复制全文到证据文档。artifacts/research-public-page-check.json。此证据只证明当前真实网页传输/正文解析，不是Brave搜索、模型联网报告或完整RES-A06验收。
- 本轮无网页改动、生产重启、迁移或线上业务写入；共享网络工具代码待研究联网整合后一并部署。下一步需要Brave人民币价格/预留契约、逐步持久证据和图内搜索/读取/降级、跨报告保留与缺口补查；总goal与记账等剩余模块保持未完成。

官方核对来源：[Search定价](https://api-dashboard.search.brave.com/documentation/pricing)、[Web Search GET参数](https://api-dashboard.search.brave.com/api-reference/web/search/get)。

- 只读核对线上settings及当前API环境：Brave密钥尚未配置（只输出布尔结果）。真实Brave搜索验收暂缺凭据；可继续完成计价配置、隔离错误/预算测试及其他模块，不将这一外部依赖当作整个goal阻塞。


### 2026-10-08 · 搜索费用配置、联网图取材与重新联网（RES-P03/P05，网页验收受当前沙箱限制）

- 上轮网络传输修正是有效进展。本轮新增research-search-pricing：用户先核对当前Brave账户每次搜索的人民币费用上限，再设置未来31天内复核期限；配置绑定密钥哈希并有revision并发校验，密钥变更/价格过期/未配置均停止新付费请求。配置页不返回密钥哈希；不能将用户填写的上限说成供应商实际账单或已独立验证的硬上限，真实Brave账户验收仍缺密钥。
- 设置页新增费用配置/明确核对/停用/刷新入口，输入失败保留草稿，不预填未经核实的汇率或费用。更换密钥需重新匹配价格契约，价格有效期届满可继续已有材料/模型知识及网页接力。没有要求用户本次立刻配置或购买服务。
- research-web接到真实LangGraph确认后的collect_evidence。逐关键问题搜索，保存真实摘要，再读取每个问题首条网页；其他摘要保留且明确search_snippet，实际文字标web_page，保留URL、获取时间、范围及正文哈希。只发送问题给搜索服务，不发送已选私人材料。报告和原文区分别标识摘要/网页文字；摘要不冒充全文长度，也不因搜索成功就宣称所有结论已核验。
- 每个搜索/页面步骤以报告版本+尝试+问题编号持久预留/结算，同一任务累计5分钟/1元。成功或失败的已发搜索因缺实际计费收据按已核对上限保守计入uncertain，不凭免费额度/取消猜测退款；恢复重放已保存步骤，不重复网络请求。服务故障/限流/不支持正文保留已有材料后知识回答；取消、权限拒绝、输入、旧版本不能被吞成正常降级。搜索刚好耗尽费用时保留其摘要，不再读取网页。
- 增加显式retry_web：仅已确认且允许联网的计划在完成/失败后可重试，先核对价格配置；沿用预算生成新报告版本，旧报告保留，操作编号去重。普通失败恢复不等同重新联网，仍复用已有检查点。
- 验证：网络接入后的research-tasks原14项通过；research-web最初4项通过，补额度耗尽保留摘要/无效查询预留前拒绝后5项通过（最终使用test-isolation=none确认逐项输出）。新增实际图专项通过：未确认零搜索→确认取摘要/正文→显式重新联网→两版报告、旧版不变、累计费用51000到101500微元（供应商和模型均为注入桩）。npm run check与build通过，index-Cf9t8-bI.js约710KB，保留构建提醒。
- 网络错误额外修正：上游401/403以WEB_FORBIDDEN+upstreamStatus保存，但对应用HTTP不返回登录态401，避免前端把搜索密钥错误当拾光登录过期并退出。权限拒绝仍不知识降级。修改后web-search/public-page两测试文件通过；无付费模型/真实Brave调用。
- 新增桌面research-web.spec.ts，覆盖价格未核对不可保存、期限错误保留输入、保存重开、换密钥失效、摘要/全文展示及重新联网报告预算。专用fixture新增隔离搜索/网页桩（仅Playwright入口），生产代码未加模拟开关。该桌面用例尚未通过：运行环境切到managed sandbox后，测试服务60秒未启动；最小socket.socket()立即EPERM，确认当前环境禁止网络套接字。不是页面断言失败，不以模型桩单元测试替代网页验收。
- 当前沙箱可写根是小写路径，已stat核对大小写目录同一设备/inode（70:31243722414895038），不是另一份项目；命令cwd仍使用用户指定大写目录，写入走明确获准的小写路径。未绕过网络限制或申请不允许的提权。
- 本轮未部署后端、未写线上业务数据。沙箱进程命名空间看不到先前PID25930，不把不可见当作旧服务已退出，未擅自启动第二份生产服务。最后一次已确认运行状态仍是上节PID25930/health成功/seq941；新网络图与费用配置待具备本地服务权限后验收部署。
- 下一步：保留桌面验收/部署缺口；可继续做不依赖网络的跨报告证据保留、收束预算/全图时间核算、SET新增实体导出恢复与记账代码。真实Brave验收仍缺凭据，RES与全部goal均未完成。此沙箱限制尚不阻塞其他可推进开发，不标整体blocked。


### 2026-10-08 · 调研跨报告证据保留（RES-04/08，RES-A04/A06/A07 部分证据）

- 上次目录纠正只核验路径，未改变功能；本次重新读取执行入口、RES spec/plan、图与任务实现后继续代码工作。命令 cwd 已确认 `/mnt/d/OpenResource/PersonalAgent`；文件写入使用沙箱明确允许且同 inode 的小写路径。
- 确认真实缺陷：research-jobs 恢复时留下有效历史 evidence，但 collect_evidence 成功返回（即使联网失败只返回本地材料）会覆盖历史数组，导致旧网页证据丢失。新增 research-evidence-history 合并器并接入真实 LangGraph：当前取得材料优先，相同来源/类型/版本/字段/位置/正文哈希/片段去重；不同内容同时保留，编号碰撞重新分配唯一编号。重复取得相同内容不逐轮增长，匹配问题合并；原检查点/旧成果不修改。
- 沿用材料标 retainedFromPrevious，保留原 retrievedAt、正文 SHA256 和位置，不伪造本轮获取时间；报告来源区及失败说明明确“非本轮重新取材”，模型提示词要求新旧差异结合时间分析。新内容不自动被认定正确；结构校验不能证明模型事实判断正确。本地有效性仍由既有来源/版本/作用域检查控制，失效自动检索材料先剔除再合并。
- 单元验证：`node --test --test-isolation=none tests/research-evidence-history.test.mjs` 3/3 通过，覆盖失败保留时间/哈希及报告标签、同 URL 内容变化与编号冲突、相同材料重复20轮不增量及不同证据类型不混并。
- 持久图定向验证：`node --test --test-isolation=none --test-name-pattern='failed web refresh|web evidence follows|hybrid evidence enters|graph checkpoint after|explicit web handoff|exhausted budget keeps' tests/research-tasks.test.mjs` 6/6 通过，日志 `/tmp/research-history-graph.log`。新增场景确认第一版真实图保存网页桩证据→网页接力补充→第二轮联网失败→第二版同时保留原网页和用户回填、原报告完全不变、累计1500微元模型桩用量；原有失效来源拦截/显式重试/提交中断不重复计费检查仍通过。
- 此证据是隔离 SQLite + 实际 LangGraph + 注入模型/网络的测试，不宣称真实 Brave 或网页交互验收完成。本轮仅后端、测试和文档修改，无手机改动、无 E 盘操作、无线上数据写入或服务重启；未重复前端构建和已知受沙箱网络限制的浏览器启动。
- 剩余：大量不同证据的模型上下文选择/收束额度、全图执行时间核算、自动补查、真实搜索及桌面验收仍待处理。不同历史快照保留可增长，不能用相同内容去重测试宣称整体上下文已受控；10模块完整范围与记账仍保留，goal 未完成。


### 2026-10-08 · 报告模型输入与实际阅读范围（RES-04/06/09 部分）

- 上轮跨报告证据修复属有效进展，本轮继续核对实际 research-model/pricing/budget/graph。缺口：全部历史证据直接进入报告请求，网页原文和多轮新增材料可能超过输入费用预留；且没有明确记录模型实际看过的范围。
- 新增 research-context：对实际序列化 JSON（含转义和元数据）限128000字节，各证据片段最多8000 UTF-8字节，按问题首个匹配编号及证据类型轮转，避免大量同类片段先占满。Unicode按码点截取，不拆代理对；start/end仍是既有JS字符串位置，保留原total/hash/time，excerpt截取显示truncated。基础问题/计划/背景不静默截断；自身超过限额则保留阶段报告并显示原因。
- 图保持完整证据用于持久化、下一轮恢复和来源检查；只有选中片段送模型，报告引用校验以选中ID为准，未送入模型的ID即使已保存也不能被报告引用。报告来源位置采用实际送入范围，正文提示保存/读取/片段/未送入数量，不宣称通读所有材料；artifact.reportContext保存计数、JSON字节及各来源实际start/end，artifact.sources仍保存完整已取得片段。无选中证据时researchMode按model_knowledge计算，不因仓库里有材料误标mixed。
- 费用仍交既有已核验价格/预算账本预留。128000字节是输入选材政策，不冒充精确token数或已完成1元/5分钟总验收；固定前缀摘取也不是语义重排。所有不同历史快照的存储增长仍保留，不以静默删除换取较小请求。
- 验证：`node --test --test-isolation=none tests/research-context.test.mjs` 3/3通过，覆盖JSON转义与Unicode/位置、跨问题及类型轮转、超长必需背景、未送入来源拒绝。`node --test --test-isolation=none --test-name-pattern='large stored web|failed web refresh|confirmed long-document|graph checkpoint after|explicit web handoff|budget exhaustion publishes|exhausted budget keeps' tests/research-tasks.test.mjs` 7/7通过，日志 `/tmp/research-context-graph.log`；新增实际图场景保存三份长网页、模型输入限额、报告片段声明、成果原片段完整及分析范围一致；长文后段、本轮旧证据保留、断点不重复调用、网页接力和预算程序收束回归通过。网络与生成均为隔离注入桩，没有新增付费调用。
- 未修改前端/手机或E盘，未部署在线服务、未重复已知无法启动的浏览器测试。待继续：真正预留收束费用/时间、全图处理时间、必要的补查与真实搜索/网页验收；其后记账及SET等范围照常保留。全模块目标未完成。


### 2026-10-08 · 取材阶段保护报告收束额度（RES-09/P05/A08 部分）

- 上轮输入限额与范围记录是有效进展。本轮核对调用账本及本地/语义/联网取材入口，修复取材可能耗尽最后报告额度的缺口。
- 新增统一 research-limits：报告输入128000字节、输出5000 tokens；取材阶段保护320000微元（0.32元）和45000ms。现有 DeepSeek 已核验价格快照下，128000字节输入加4096字节系统提示和协议余量、5000输出上界费用306240微元，低于32分；实际报告仍走自身报价/预留/真实用量结算。保护额度不是已消费金额，也不保证模型服务成功。
- research-budget.reserve 在同一SQLite写事务内对 local-evidence/hybrid-evidence/web 新调用保护收束余量，其他连接、恢复worker不能各自花掉这部分；旧步骤重放先校验原请求并返回，不重新争用或扣额度。取材超限返回具体原因并保留现有材料，由报告步骤消费收束余额。免费取材在费用余额少于32分时仍可用，只要执行时间足够；不凭免费名义越过时间边界。
- 三个取材入口按“当前剩余时间减45秒”设置新步骤上限，旧步骤保持原预留供幂等核对。收束保护是每次新增取材都适用的账本规则，不是新建一笔会永久挂起的虚假供应商调用；取消/未结算调用仍依原账本保守处理。报告后继续补查/恢复仍使用同一累计预算，不清零。
- 验证：research-closing-budget 3/3通过（两个数据库连接竞争、收束可消费、重放、低费用免费取材、时间保护及最大请求价格上界）；research-web 5/5通过，日志 `/tmp/research-closing-web.log`。旧“把最后5分用于搜索后预算耗尽”用例改成“搜索不得占用报告收束额度”，明确验证零搜索/零网页调用及已消费费用不变，是落实已确认收束要求而非放宽约束。
- 定向实际图7/7通过，日志 `/tmp/research-closing-graph.log`：联网报告/重试、旧证据、长网页、自动来源失效、提交断点、预算触限阶段报告；供应商/模型仍为隔离注入桩。未发真实付费调用，未修改网页前端或手机，未部署线上后端。
- 未完成点：当前账本累计各调用的执行时间，图编排、选材/校验/保存等额外处理时间还未完整计入；不能因此宣布5分钟总时限或RES-A08全面通过。下一步补全流程执行计时，再推进缺证据补查、真实搜索/网页验收和记账/SET等其他范围。


### 2026-10-08 · 调研调用之间的处理计时（RES-09/P05/A08 部分）

- 上轮收束保护是有效进展。本轮核对 graph/job/checkpoint/预算调用边界，将模型及工具调用之间的处理时间、报告发布校验与实体保存纳入原预算账本；未新增数据库表或另造任务引擎。
- 新增 research-execution-clock，按单调时钟记录 processing:<lease>:<序号> 的零费用片段。执行时预留至多1秒小段，250ms心跳结算/续段；进入已有计费调用前结算处理段，调用未结束时不重复累计其等待时间，结算后重新记录处理。同一任务累计余额仍由SQLite原账本负责；实际处理达到时间上限时不能继续新模型预留。
- 任务返回人工确认/网页接力等待前结束计时，不把等待日期差额算成工作。正常结束没有悬空处理预留；进程丢失/租约失效时保留未结算小段，替代worker不能退款或以0耗时恢复。预算费用已耗尽时仅processing零费用记账仍允许，用于保存阶段结果，不重新开放模型或取材调用。
- run覆盖图读取、恢复、选材、输出解析等调用间工作；commit另开短段计入保存前校验和实体写入，和fileJobs事务保持一致。初始化后的异常亦会尝试结算；原错误优先，收尾因取消/租约失效报错不掩盖原错误。
- 初次图回归7项通过、取消项失败：注入模型未创建付费预留时处理段仍在，取消后的finish租约拒绝覆盖了原本aborted错误。已修复为保留主错误、保守留下不可结算小段。修正及commit计时后定向图8/8通过，日志 `/tmp/research-clock-graph-final.log`，覆盖联网/历史证据/长网页/来源变化/断点/耗尽/取消；旧失败日志 `/tmp/research-clock-graph.log` 保留。
- `node --test --test-isolation=none tests/research-execution-clock.test.mjs` 5/5通过：处理与调用不重叠、人工等待一天不计、恢复重放不增加模型费、心跳/丢失小段保留、零余额保存计时、租约不能迟到结算、299秒后再处理1秒拒绝新报告调用。可控时钟，无真实等待5分钟，无付费模型/网络请求。
- 限制仍明确：这实现了应用处理段计时及调用前约束，不是可强制抢占同步JS/SQLite的硬实时调度。极端事件循环阻塞可晚于1秒片段结束，账本如实结算而不截成假300000ms；账本自身终结写入和外层事务COMMIT的尾部耗时未精确自计，已耗尽时间后的最小阶段保存也不能因此承诺零耗时。RES-A08严格全边界仍待核验，未借该局部通过宣布整个5分钟能力完成。
- 当前无部署、无线上数据写入，无手机/E盘修改。下一步继续时间边界/执行恢复审查及补查；真实Brave和桌面验收仍有先前环境/凭据缺口，记账、SET收尾和其他模块完整范围继续保留，goal未完成。


### 2026-10-08 · 记账现状核对及金额/AI校验（原文Phase 1–3、V01/V24部分）

- 上轮调研处理计时及回归已形成有效进展；保留RES真实搜索/网页/严格时限未完成项，按执行文档允许的独立模块顺序推进记账。完整读取用户原始记账spec&plan及16号补充，核对17号Q11/Q12；不改写用户原文。
- 架构与复用：React Accounting.tsx 已有手工增改删、筛选、生活费预算和图表；index.mjs提供交易/预算/Excel/OCR路由；accounting.mjs有金额校验、JSZip解析和分类；store.mjs通用entity/transaction提供SQLite持久化；沿用现有Modal/ErrorBanner/API和Node/Playwright，不增加框架或数据库。
- 实际缺口：Excel只认序号日期、跳过未知方向/状态/错误金额，解析层自动丢同ID及模糊重复；提交层再次自动跳过重复；无持久批次/逐行状态/绑定原件/提交版本与操作幂等；OCR原图丢弃、未知类别强填第一项/未知日期填今天、备注截断；分类失败此前静默吞掉；统计全部前端计算；月初/月中独立横幅未接PET。支付宝手工Excel入口未实现。上述不因已有页面/旧测试通过而视为完成。
- 本次修复 accounting.amountToCents：以BigInt从十进制字符串解析整数分，不先做浮点乘法；仅接收数字/字符串，拒绝对象自动转字符串、超安全整数及超精度。accountingAmount统一新增/修改/预算：同时提交amount与amountCents必须各自合法且一致，不再优先整数分静默覆盖冲突；显式null/小数分/非法值不能回退到旧金额。单笔现有10亿元限制保持。
- validateTransaction接严格Zod输入结构，拒绝额外权限/ID字段、错类型、非法版本；部分编辑省略金额仍保留旧整数分、id与createdAt，显式无效不是省略。业务类型/分类/真实日历日期继续同套校验。预算路由复用金额规则，服务器语法检查通过。
- AI分类要求整段JSON数组（可代码围栏），逐批严格校验index/固定枚举/额外字段，重复行号报错；缺失项、结构错误、调用失败在notice保留明确原因，未返回项维持待确认。提示词不再要求无法判断时一律填“其他”。只给分类建议，不做统计计算；旧UI待确认默认值问题将在持久导入核对界面一起消除，本轮不声称已关闭V24全部路径。
- 验证：`node --test --test-isolation=none tests/accounting.test.mjs` 6/6通过：金额/类型/日期、双金额冲突及旧值回退、精确整数边界、AI越权/错分类/索引/缺失/失败。`node --check server/index.mjs`通过。测试中仍保留的“旧Excel自动去重”案例仅证明旧行为，明确与Q12相悖，不能算V22/V23通过；下一步连同解析/批次/核对界面替换，不借绿测试保留错误业务规则。
- 后续文件范围：accounting.mjs拆出逐行解析/导入服务，新增持久accountingImport/行/原件关系并复用附件保存及下载；index.mjs接新批次协议、统一统计；Accounting.tsx对应核对/恢复/错误保留；PET接提醒，SET验证备份原件。全部确认行才入统计，退款排除、转账计入、花呗仅还款、重复由用户决定按16号执行。
- 本轮仅网页后端相关代码/测试/进度，无手机、E盘原件、线上库写入或部署；未重复浏览器启动（现沙箱仍有先前socket权限限制），未做实际AI调用。原件保存、导入确认、统计/提醒及完整验收仍待开发，记账及整体goal未完成。


### 2026-10-08 · 账单逐行解析契约（V22/V23/V24，批次接入前）

- 上轮金额/分类严格校验是有效进展。本轮读取现有JSZip解析、路由使用及最新确认口径，新增 accounting-import-parser；未把新数据结构直接塞给不兼容的旧预览页面。旧parseWechatWorkbook/旧提交接口目前仍在使用，其自动去重等缺陷仍开放，不宣称用户流程已修好。
- 共用readAccountingWorkbook保留实际Excel行号、稀疏列位置、单元格类型和公式文本，不执行公式；读取1904日期体系和工作表名/数量。XML实体只解码一遍，避免把原始`&lt;`文本误改为标签；工作表关系按ID字面匹配，避免把外部文件ID拼接成正则。重复行号/单元格位置拒绝，列号限Excel范围。现有12MB文件/32MB解压/行数限制保留。
- 新parseAccountingWorkbook识别微信/支付宝常用明细表头，别名如金额(元)/金额（元）归一，但多列同时匹配不能任取一列。文本日期校验真实日期及时分秒，支持Excel1900/1904日期体系，不自动进位；Excel虚构1900-02-29拒绝。人民币符号和规范千分位金额可解析，原值仍保留。
- 所有表头后的非空行进入rows：rowId/rowNumber、rawCells/formulas、来源渠道/对方/原交易号及原字段、draft、recognized/needs_review/excluded、原因/issues、pending决定。前置说明行及表头另行计数，summary可核对总数。分类默认空，不拿“其他”冒充AI或人工判断；长备注不截断，公式缓存值/长数字交易号可能舍入均标待核对。
- Q11落实到识别建议：明确退款流水排除并说明不冲销原消费；带退款状态的原消费保持待核对，不因状态含“退款”就自动排除；转账按收支方向保留；明确花呗消费阶段排除、还款草稿分类花呗。所有行决定仍pending，不因recognized或排除建议直接写交易或完成核对。
- Q12重复项保留：同渠道交易ID、同日金额/对方两类依据生成重复分组；不同强ID但同额同商户也只提示可能重复，绝不删行。分组集中保存rowIds，每行引用groupId/依据/数量，避免5000个重复行生成平方级互链；独立导入与历史库再核对将在批次服务实现。
- 验证：`node --test --test-isolation=none tests/accounting-import-parser.test.mjs tests/accounting.test.mjs` 10/10通过，其中新4项覆盖原行号/总数/无效行/退款与原消费/转账、支付宝及花呗/公式/长备注/实体保真、日期体系、500行重复分组及多金额列拒绝；原6项仅兼容检查，不将旧自动去重行为作为需求验收证据。无AI/网络调用。
- 尚未实现：新解析结果的持久批次、原Excel/截图保存及下载、逐行人工决定/版本绑定/幂等提交、跨批次重复复核、页面核对与恢复。多工作表目前明确报告仅处理第一张，其他表未处理，不显示全表完成；后续批次需保留此缺口，不静默消除。原支付宝文件变体仍需真实样本核验，当前只有隔离构造xlsx测试。
- 本轮未动手机/E盘原件、未写线上数据库/部署服务，也未重复无法启动的浏览器验收。下一步实现原件+批次持久化和核对协议，再切换旧接口/页面；整体goal仍未完成。


### 2026-10-08 · 原Excel与导入批次持久化（记账Q12、V22/V23部分）

- 上轮逐行解析有实现及10项相关证据，本轮继续把解析接到持久服务而非只留工具函数。新增 accounting-imports.mjs，复用entities/operations/changes与项目uploads；无新框架/数据库表，无线上迁移或数据写入。
- POST /api/accounting/imports 接收xlsx与opId：校验文件/字段后以随机内部key写入项目uploads、同步文件落盘，再原子保存accountingImport和操作收据，然后才解析。批次含原名/MIME/大小/SHA256、解析状态/时间、逐行原值/建议/问题/重复分组；解析失败存parse_failed和错误，原件仍在，零交易入账。并发同opId只保留一个批次；同opId不同文件拒绝；另一个opId导入同一文件保留独立批次，不以文件哈希替用户去重。
- GET批次列表/详情支持offset/limit（最多200），列表SQL剔除大行数据，详情分行返回，避免默认隐藏100条以后的批次；GET original返回附件下载，读取时核对大小/SHA256，丢失/变化明确404/409，API不返回内部文件key。复用现有鉴权/同源保护，不新增公网服务。上传12MB超限提示同时修正现有路径判断。
- POST /:id/reparse 使用revision+opId：失败批次可重读已保存原件；parsing超过60秒可显式接替处理，活跃解析不重复启动，已有review结果不能被重跑覆盖。异步旧解析完成时再次核对批次版本，不能覆盖接替结果；操作收据使未知响应重试返回同一批次。60秒是解析接替门槛，不是误宣称运行中线程已经停止。
- 文件先写后数据库间若进程突然退出，可能留无批次文件；常规写入/数据库失败会清理仅本次新建副本，未删除任何用户原件。没有为了自动清理而扫描/删除uploads历史文件；后续SET备份/恢复需覆盖accountingImport与这些原件。
- 验证：`node --test --test-isolation=none tests/accounting-imports.test.mjs` 4/4通过，日志 `/tmp/accounting-import-batches-final.log`：原件/异常/重复行持久化、操作重放vs独立导入、分页、另进程重新打开SQLite读取原件；解析失败/版本重试；并发上传与过期结果拦截；缺失/篡改原件和非法上传无副作用。测试用实际JSZip解析和隔离文件/SQLite，无AI或网络桩。重启读取使用子进程写证据JSON核对，最初仅依赖子进程stdout的测试在当前沙箱输出为空而失败，已改为明确读取独立进程生成的证据文件，不将空输出视为通过。
- server/index.mjs/accounting-imports.mjs语法检查通过。尚未进行HTTP/浏览器交互验收，当前已知socket限制未解除；未启动线上服务，未修改前端/手机/E盘。
- 后续缺口：逐行编辑/入账或跳过、批次版本及完整重复候选绑定、历史库变化再核对、原子幂等提交；OCR原件与严格识别需接同一批次；页面切换和恢复、服务端统计/PET提醒/SET备份联验。旧页面仍调用旧预览/提交接口，其自动去重问题仍未关闭；下一步开发确认协议后一起切换。记账和总goal仍未完成。


### 2026-10-08 · 导入核对、重复复查与原子入账（V22/V23/V24、Q11/Q12部分）

- 上轮原件/批次持久化4项通过为有效进展。本轮新增accounting-import-review，接POST /api/accounting/imports/:id/review和commit、GET reviews；仍复用现有SQLite entities/operations事务，没有独立账本引擎。
- review每次最多200行（分页核对，不限制整批只能200行），要求当前批次revision，逐行include或skip；include带完整可编辑金额/类型/固定分类/日期/备注/渠道/对方/交易ID，统一validateTransaction；skip需明确原因。无效字段、同一行重复、外批次行、已处理行均拒绝。异常提示需明确已核对，建议排除行仅在用户说明“识别有误”的更正原因后允许入账；原解析状态/原因/原值与人工decisionReason分开保留，不把人工更正冒充自动识别。
- 核对结果持久accountingReview（可重开），绑定批次版本、规范化决定和重复候选快照/摘要。重复对照包括当前有效账本及同批次其他行：同渠道ID、同日金额/方向/商户；历史OCR/manual缺真实渠道时仅标渠道未核实的可能重复，不静默漏过跨截图/Excel风险。不同明确渠道不按ID直接认同。所有相似性都是用户核对依据，不自动删/跳。
- commit在BEGIN IMMEDIATE内再读批次与review、重新计算当前重复快照；候选新增/修改/消失或批次变化均409且无入账，必须新核对。疑似重复的保留行必须逐行确认，不能用一个无绑定的“忽略重复”旗标；两笔真实同额交易可明确保留两笔。同opId同提交返回持久收据，改内容则409；新opId不能重处理已入账行。
- 原账单在提交事务中再次核对大小/SHA256，丢失/改变不允许假称原件完好后入账。交易保存批次ID/行ID/原件SHA/商户/reviewId/确认时间；交易、行决定、批次进度、review状态和操作收据同一事务提交。未处理行继续pending不进统计；本工作表全处理但存在其他表未解析时仍明确未完成整个文件。
- 支出/收入校验扩充已确认支付宝source值，类别集合和金额规则不变。现有旧页面编辑渠道字段仍需在页面切换时核对（旧表单把非OCR来源写成manual），本轮不部署新协议供旧页面误用。
- 验证：隔离tests/accounting-import-review.test.mjs 7/7通过，日志 `/tmp/accounting-review-final.log`。覆盖两笔合法同额均保留及同操作重放、预览后新重复/旧候选改动、部分核对和排除更正、SQL触发器模拟第二笔写入失败全部回滚后同opId重试成功、跨批次review拒绝/原件缺失、历史OCR可能重复。人工原因与原解析原因分开保存后的相关2项补查通过，日志 `/tmp/accounting-review-reasons.log`。首次回滚测试给已改成不同金额的两笔错传了重复确认，实际在校验时就被正确拒绝；已将测试确认列表改为真实核对结果，才验证到事务回滚，不移除错误检查。
- server/index/accounting-import-review语法检查通过。无模型/网络请求，无线上库写入/部署，不动手机/E盘。新服务测试不能替代HTTP/网页验收，旧页面仍用旧导入路由；旧自动去重问题尚未从用户入口消除。
- 下一步：新核对界面接批次分页/重开/原件/人工决定/重复确认和未知响应恢复，随后替换旧导入接口；OCR同批次原件和严格识别、AI分类结果应用、服务端确定性统计、小九月度提醒、SET备份恢复仍待完成。记账和10模块全目标继续，未完成。


### 2026-10-08 · 网页接入账单导入与核对

- 按用户最新要求减少校验和测试，优先交付可操作流程。本轮新增 AccountingImports 并替换记账页旧 Excel 弹窗：上传微信/支付宝 Excel、重开已保存批次、下载原件、每页10行查看原始单元格、编辑收支/金额/分类/日期/渠道/对方/交易标识/备注、明确跳过、核对重复项、最终确认入账。入账后刷新账本并清除旧筛选，便于看到新账单。
- 翻页保留当前批次编辑；浏览器 sessionStorage 保存本标签页草稿和未确认操作，网络未知响应可重试同一操作。切换批次/新上传前提示未提交编辑。原件及批次由后端持久保存，浏览器草稿不等于跨设备保存。
- 原旧预览/提交接口返回410和刷新使用新入口提示，不再通过旧入口静默跳过重复项。编辑已有导入账单保留微信/支付宝渠道，账本显示支付宝来源。
- 网页使用两栏字段、窄窗口单栏、原文换行和错误提示；复选框沿用已有尺寸修复。只处理网页，未修改/打包/验证手机端，未操作E盘。
- 必要检查：构建首次发现新组件括号错误和大写路径写入受沙箱限制，已修复括号；命令工作目录仍为 /mnt/d/OpenResource/PersonalAgent，构建通过 npm --prefix 指向获准写入的同一项目小写路径。最终 npm run build（含 TypeScript）成功，server/index.mjs语法检查通过。产物 index-B90bhG_d.js / index-ey5DiPaC.css；现有大包警告仍在。
- 本轮不重跑后端全量或扩展边界测试。已知当前沙箱无法建立服务socket，未反复尝试浏览器启动；因此网页真实点击主流程尚未验收，不声称线上可用。未重启后端或部署，实际运行后端需与新前端一起更新。
- 剩余记账工作：AI分类接入新批次、截图原件保留与严格识别、服务端统计、预算版本、小九月度提醒和SET备份恢复。当前仅接通Excel人工核对界面，记账模块和全模块目标仍未完成。


### 2026-10-08 · AI分类接入新账单核对流程

- 上轮网页导入核对、替换旧入口及构建属于有效进展。本轮继续记账Phase 3/4，新增accounting-classification服务及持久accountingClassification记录，复用suggestCategories、现有模型接口和SQLite实体/操作收据，不引入新框架。
- 用户可请求本页待核对账单分类（后端每次最多25行，当前页面10行），模型仅接收收支方向及备注；备注是原始商户文本，不声称已经脱敏。分类结果只存建议，不改原始批次、人工草稿、交易或统计。仅固定分类可用，遗漏/非法输出和模型失败有提示，未知不默认“其他”。
- 页面显示每行AI建议，点击应用才填入编辑草稿；仍需核对和最终确认入账。人工修改备注或收支方向后，旧建议明确提示重新生成，不能直接套用。服务端建议可随批次重开查看，不依赖浏览器草稿。重放同opId不重复调用模型，未知响应可沿用现有恢复入口。处理中记录可刷新；若服务中断，可显式发起新的分类请求，未实现跨进程自动恢复模型调用。
- 必要检查仅一次定向测试+构建：tests/accounting-classification.test.mjs 1/1通过，验证持久建议与账本隔离、同操作重放仅一次模型调用、跨类型/越权输出不能生成分类。模型响应使用测试桩，没有宣称真实AI联调通过。npm run build含类型检查通过（index-CYlc_82g.js），新服务语法检查通过；未重跑全量及旧边界测试。
- 未部署或重启线上服务，浏览器端到端验收仍受此前确认的socket限制影响，本轮不重复尝试。截图原件/OCR、服务端统计、预算版本、小九月度提醒及SET联验继续待完成；记账和全模块goal保持进行中。


### 2026-10-08 · 截图原件与OCR接入统一核对

- 上轮AI分类已改变实际服务/界面并通过定向测试，属于有效进展。本轮实现记账截图原件保留与核对，复用accountingImport/Review，不新增独立交易写入路径。
- 上传入口统一接受.xlsx、PNG/JPG/WebP（12MB以内），核对图片签名后以随机文件名保存到项目uploads，原件先落盘、批次先持久再调用视觉模型。失败保留原件和可见错误，重试读取同一原件；原件下载/完整性、操作收据、批次版本协议沿用Excel流程。
- 新accounting-ocr要求模型返回明确结构。未知金额/日期/分类/方向不默认补齐；完整日期按真实日历校验，不把截图中的数字当Excel日期序号。超长/非法结构不截断冒充有效结果。截图仅识别一笔主要交易，多笔无法确定主要交易时明确要求留空并说明，不自行合并金额。
- 退款、花呗消费、失败交易显示建议排除；花呗还款按支出花呗类别，转账保留；所有截图都有对照原图人工核对提示。分类、金额、日期可编辑后经既有重复复查和确认入账，交易保留批次/提取行/原件SHA关联。
- 网页统一“导入账单/截图”入口，核对页直接展示已保存图片并提供下载。旧OCR接口返回410提示刷新使用新入口，删除旧的不保留截图、缺失日期填今天、未知分类用首项逻辑。未动手机端。
- 必要检查：构建（含类型检查）通过，产物index-CMjvXCOk.js；server/index语法检查通过；tests/accounting-ocr.test.mjs 1/1通过，仅验证“原图保存→模型失败→重试缺失字段留空→人工补齐确认→交易与原件关联”。使用真实隔离SQLite/文件和模型返回桩，不代表真实视觉模型识别或浏览器验收。未重跑全量/其他边界测试。
- 未部署/重启服务、未操作E盘；真实模型联调和网页点击仍待环境可用后完成。下一步为统一服务端统计、预算版本和小九月度提醒/SET联验；本模块及总目标未完成。


### 2026-10-08 · 小九账单提示与预算版本

- 上轮OCR代码、原件闭环和定向测试属于有效进展。本轮新增accounting-settings，预算修改使用严格金额/版本输入并在事务内比较当前revision；无历史预算时版本为0。网页在打开编辑时保留版本，避免后台数据刷新把旧草稿变成无条件覆盖。冲突显示错误且保留输入。
- 源模块按Asia/Shanghai日历在每月1日、15日提供账单检查项，接petReminders统一提示表、标识和记账导航，沿用安静时段。不再使用记账页独立催促文案，原地只显示检查状态和“我已核对本次账单”。查看/导航不确认，明确确认才持久accountingCheck并使当日小九提示退出；重复确认返回已有结果。
- 当前日期规则延续原记账页的1日/15日当天提醒：不新增跨天催促、自动补发历史缺失检查或替用户认定完成。已确认历史通过/accounting/checks返回最近24项；历史列表网页展示尚未补齐。读提醒不创建虚假历史，不自动确认。
- 必要检查仅tests/accounting-settings.test.mjs 1/1（真实隔离SQLite，预算旧版本拒绝、实际pet聚合/明确确认退出、下月新实例）和构建含类型检查通过。产物index-DwqXKHnY.js，未重跑全量，未运行浏览器/手机验收。未部署/重启服务、未操作E盘。
- 服务端统计尚未替换客户端计算，SET备份恢复与浏览器联验仍待完成；当前goal未完成。


### 2026-10-08 · 服务端统一账本统计与检查历史

- 上轮小九提示与预算版本属于有效进展。本轮新增accounting-statistics的/api/accounting/view：同一个SQLite只读事务取得已确认交易及预算，集中计算列表筛选、收入/支出、本月生活费、月度饼图/类别排名、单笔排名、年度与近六月柱图。以BigInt分累计，JSON传递十进制整数字符串，前端只做金额格式化和图形比例。
- 列表和筛选合计共用日期/类型/分类/关键词AND条件，今天/本周/本月按上海日历；自定义范围需真实日期且不倒置。原本独立的统计月份/年度选择保持不变，月度图表和排名使用所选月份，本月概况仍代表当前月，未把这些明确分区误绑定成列表筛选。
- 网页移除重复的账单聚合代码，更新筛选后短延迟请求，取消过期请求；加载/失败期间隐藏旧列表与旧数字，保留筛选和输入，错误可重试。已确认交易来源仍是transaction，导入草稿/AI建议不入统计。
- 补充最近24次已确认检查记录的网页回看；每笔带importBatchId的账单提供原件下载入口，可定位Excel或截图。
- 必要检查仅tests/accounting-statistics.test.mjs 1/1和构建：真实隔离SQLite中的账单/未确认导入、相同过滤的列表与合计、精确小金额、本月预算/图表/排名、空范围及倒置日期；未重跑全量。npm run build含类型检查通过（index-CSqemh1x.js / index-4QyPCpYr.css），server/index语法检查通过。
- 无部署/服务重启、手机或E盘操作。浏览器真实交互和模型联调仍未验收；SET完整备份恢复联验、记账端到端验收仍待完成。全模块目标继续，不能以当前定向检查代替全部完成。


### 2026-10-08 · 记账完整备份与隔离恢复

- 上轮服务端统计、网页集成和定向验证属于有效进展。本轮检查SET备份代码发现：已有完整SQLite快照和uploads复制自然包含新实体及原件，但验证器只检查旧attachments/images，账单原件缺失时可能仍称备份完整。
- 修复backups校验：accountingImport.original必须对应清单中的真实原件，大小/SHA与批次一致；已入账transaction的importBatchId/importRowId、行决定/transactionId和原件SHA必须相互对应。沿用既有校验/备份流程，不新建备份系统；旧非导入交易不强制补不存在的来源。
- JSON业务导出新增accountingImports（去掉内部文件key）、accountingReviews、accountingClassifications、accountingChecks，并明确JSON不带原文件，完整备份需使用设置中的完整备份。完整SQLite备份本身已有这些实体及operations，无需迁移表。
- 隔离tests/accounting-backup.test.mjs通过：真实创建导入、部分确认一笔、保留另一待核对行，完整备份恢复到新的/tmp目录后读取SQLite和原文件，核对交易关联/金额/操作收据/检查记录；源目录缺失账单原件会明确拒绝备份。首次通过后把收据存在断言收紧为确切operation键与原始结果相等，再运行同一项通过；未扩展全量测试。server/index语法检查通过，未改前端，无重复构建。
- 没有备份或恢复用户在线数据、没有替换现有目录、没有部署/重启服务，没有手机/E盘操作。本轮证明隔离恢复的数据一致性，不冒充恢复后真实服务/浏览器验收；记账真实模型与浏览器验收、其余模块完整验收仍未完成，总goal保持进行中。


### 2026-10-08 · 调研缺证据补查循环

- 上轮记账备份恢复与引用校验属于有效进展。本轮继续RES-06，检查真实research-graph发现原路径写完报告直接结束；虽然已有逐问题coverage，却没有按缺证据项补查。
- 增加supplement_evidence条件节点：仅已确认计划、启用联网、非预算触限阶段稿且有partial/missing问题时进入；只传原问题ID，最多一轮。collectResearchWeb复用相同问题已入账的搜索调用结果，读取第二个搜索结果，使用独立页面步骤键和证据ID，不将个人引用资料拼进新搜索词，也不重复支付同一搜索。
- 有新材料才进入report-supplement模型步骤重写，模型用量仍走同一任务预算账本；取材继续预留报告收束预算，取消/资料版本检查沿用现有服务。没有新材料保留原报告与待核实项；重写预算不足则保留之前已生成报告，注明新增资料尚未分析，避免用全空阶段模板覆盖已有结论。模型本身失败仍报错并保留图进度，不冒充成功。
- 补查标记持久在LangGraph状态，避免恢复后无限循环；用户回填/新的报告版本明确重置本轮标记，费用与执行时间账本不重置。当前补查是一轮后续结果读取，不宣称实现任意自动改写问题/无限搜索。
- 必要检查：tests/research-supplement.test.mjs 1/1，通过实际LangGraph执行验证计划确认前不取材、只补Q2、一次重新整理、仍partial时按一轮限制收束及实际证据引用；模型/材料用桩，没有外部请求。改动服务端语法检查通过，未改网页所以没有重复构建，未重跑其他全量测试。
- 未部署/重启线上服务、未操作手机/E盘。真实联网、费用整体联验及其余模块完整验收仍待完成；全模块goal继续。


### 2026-10-08 · 录音转写接入跨模块取材

- 上轮调研补查图和定向测试属于有效进展。继续REC-10审查发现：ASR/修订/总结已有，但多数来源读取只用note.content；正文为空的录音即使已有转写也可能被调研判为无文字、被搜索和成果取材遗漏。
- 新增纯函数source-content：组合原正文和带起止时间/匿名说话人的转写阅读视图，保留识别误差提示，不写回覆盖正文或transcript。录音总结复用相同格式；搭子显式引用、关键词搜索/摘录、成果资料选择、调研原文选择均接入。
- 向量索引改用同一阅读视图；调研自动检索增加transcriptContent位置类型，重新校验SQL来源修订及精确片段，报告来源说明位置属于正文+转写阅读文本。索引断点增加内容hash，阅读视图变化时不能仅凭相同业务revision跳过旧分块。
- 已有向量数据尚未重建，实际Qwen/Qdrant索引需后续重建/联验才能证明旧录音可语义命中；本轮没有悄悄迁移在线数据，也没有宣称语义检索实测通过。新完成或修订录音仍由既有note保存outbox进入索引更新流程。
- tests/audio-source-content.test.mjs 1/1通过：真实隔离SQL录音正文为空、转写含唯一关键词，关键词搜索/摘录及调研引用可读，transcriptContent原文位置校验通过，修订后旧证据拒绝。服务端语法检查通过；未改前端，未重复构建或跑全量测试。
- 中文真实识别质量、说话人分离及录音→总结完整网页验收仍待完成，不以本轮文本适配测试替代ASR能力验收。无部署/服务重启/手机/E盘操作。全模块goal继续。


### 2026-10-08 · 转写修订版本保留

- 上轮录音阅读视图及跨模块取材适配属于有效进展。本轮确认本地中文样本/模型齐全后，发现2026-09-29已有同样本turbo实测和质量记录，故按用户不重复过度测试要求，没有重跑模型或重新下载；保留“四人样本自动分五人、仍有错词”的已知限制。
- 发现重新转写会替换当前transcript及transcriptOriginal，人工修订无法再回看。新增audioTranscriptVersion：修订保存及ASR任务成功提交前，在既有事务内保存当前转写与对应模型原文；新版本继续显示，旧版本只读保留，不假造未曾保存的历史。
- 转写面板增加重新转写确认、版本历史查看、人工版对应模型原文查看、每页5版的更早版本入口；不引入新编辑器。删除源记录时历史一并软删除，JSON业务导出纳入有效历史，完整SQLite备份自然包含；原录音附件仍独立保留。
- scripts/asr/README修正“尚未接业务API/网页”的过时描述，保留技术样本及识别质量限制，不把文档更新冒充质量通过。
- 必要检查：扩展现有audio-jobs单项测试并仅运行该文件，1/1通过：真实隔离SQL/队列提交、原文保留、过期拒绝，以及修订后再次转写仍可读取旧人工文字和对应原始文字；没有实际ASR推理。构建含类型检查通过（index-CH8wUzNa.js），服务端语法检查通过。未跑其他回归、未重启/部署服务、未操作手机/E盘。
- 历史页面真实浏览器交互及REC全链路验收仍待完成；中文识别质量仍有限，不宣称完整ASR验收。全模块goal保持进行中。


### 2026-10-08 · 成果取材与来源摘录一致

- 上轮转写历史保留及定向保存测试属于有效进展。本轮REC-05审查发现旧generateArtifact：来源列表每条1500字、模型每条600字后整体8000字截断，可能保留了模型没实际读到的来源，虽然泛称“长度限制”但未准确对应实际取材。
- 新增artifact-context纯函数，为最近最多30条候选分配总计12000字符的摘录空间，不在拼完后切断整个上下文；模型、引用校验与本地整理使用同一份sources.quote。长文复用已有问题关键词/分布式预览选段，保存每段start/end/原文摘录、是否片段及content/transcriptContent来源字段，不声称语义阅读全文。
- 覆盖提示记录范围总数、实际采用数、上下文空间导致的省略和片段数量。模型指令明确位置标记不是事实、缺失进展待补充，不把计划写成完成。用户原记录及转写不修改，不额外调用模型做隐藏预处理。
- tests/artifact-context.test.mjs 1/1通过：30条来源都能逐条对应实际模型上下文、全局长度受限、摘录与原文位置一致、10000字后关键内容进入长文片段。只跑这项纯测试和engine语法检查；未改前端，未重复构建/真实模型调用。
- 尚未完成成果真实模型/网页验收，不能以来源结构一致推定生成事实正确。无部署/服务重启、无手机/E盘操作，总goal继续。


### 2026-10-08 · 来源变化后的后台与记忆状态

- 上轮成果取材修复属于有效进展。本轮检查跨记录切换发现App已按记录ID为NoteEditor设key，组件隔离已有保护，未为假设问题重复修改UI。
- 实际缺口：删除记录仅让后台最终提交失效，没有立即取消其pending/running任务；录音转写及文件重新解析改变正文时，没有统一撤下旧格式sourceId但无sourceRevision的active记忆，读时版本检查无法覆盖这些旧记忆。
- 新增cancelNoteJobs，在记录删除事务内取消该源的未完成/失败后台工作，旧worker不能再提交；ASR现有监控会观察取消并终止进程，不声称已经停止所有不可中断解析库的CPU工作。其他来源任务保持原样。
- 新增markNoteMemoriesChanged，正文、图片、文件解析、ASR完成/人工转写修订共用：关联的active记忆转candidate并注明原因，同时覆盖sourceId和sourceRef，暂停状态不改。记录删除对两种引用均标invalid。来源业务更新和记忆状态写入使用已有事务/保存点；不自动改记忆事实或伪造新的来源版本。
- 仅tests/note-dependent-state.test.mjs 1/1通过：旧格式/结构化记忆撤下、paused和其他来源不变，pending/running任务取消，旧租约finish不能提交。index语法检查通过；没有UI变更，不重复构建/全量测试。未部署/重启服务，未操作手机/E盘。
- 来源已变化的记忆仍需用户核对其内容和来源版本，不能把转candidate理解为已经通过重新激活校验。全模块goal继续，整体验收未完成。


### 2026-10-08 · 来源记录更新后的记忆重新核对

- 上轮来源变更撤下记忆/取消任务属于有效进展。本轮顺着用户操作核对发现：编辑candidate时旧sourceId会静默更新sourceRevision，而sourceRef.revision不更新，双引用或结构化来源仍无法启用；原文事实未变时也没有显式确认新版来源的入口。
- PATCH记忆新增reviewedSource（本轮仅原有note来源），明确绑定同一记录ID及当前revision，拒绝换来源或过期版本。核对后sourceRevision/sourceRef.revision同步，仍存candidate；不能在同次请求中同时启用或替代冲突。编辑文字不再偷偷刷新来源版本。后续确认继续既有完整冲突检查及事务重查，不伪造记忆事实。
- 记忆编辑页固定打开时的来源记录快照，展示标题/版本/正文及打开完整记录入口；由用户明确勾选“我已核对这个来源版本”后提交。录音/附件可到完整记录核对，未将无正文当无资料。未提供event/library/conversation的版本重绑入口，本轮只关闭记录来源的已确认缺口。
- tests/memory-source-review.test.mjs 1/1通过：来源变化直接启用被拒绝、单纯编辑不刷新版本、显式同来源核对保持candidate、随后独立确认才调用冲突检查并启用。冲突函数为桩，仅证明调用门槛，不代替真实模型冲突质量验收。
- 构建含类型检查通过（index-BlXirh85.js），未扩展全量测试。没有部署/重启、手机或E盘操作；浏览器操作及其余来源类型完整复核仍待验收。全模块goal继续。


### 2026-10-08 · 要事、资料与对话的记忆来源核对

- 来源核对扩展到要事、项目资料和对话；编辑记忆时可读取最新来源及版本，明确勾选核对后保存候选，再单独确认启用。不会替换原来源或直接跳过冲突检查。
- 来源在核对期间变化时拒绝提交；资料不可用、来源不存在或话题已删除时保留候选并报告原因。来源预览超过 100000 字符时明确显示截断说明。
- 按用户要求只做针对性检查：memory-source-review 两项通过，网页构建通过（index-Cq1OZ2iH.js）。冲突检查使用测试替身；没有调用真实模型、运行全量测试、验证手机端或重新部署服务。


### 2026-10-08 · MEM 来源在确认期间变化的保护

- MEM-P03 / MEM-05、V05：旧记忆缺少 sourceRef.revision 时，原确认流程只比较记录来源；补为记录、要事、资料、对话全部实际来源版本的前后快照，异步冲突检查期间变化即拒绝启用。成功确认旧记忆时写入来源版本，之后读取继续校验。
- 对话批次确认保存 sourceRef/sourceRevision，绑定清理候选之后的最终会话版本；同事务检查来源话题未删除，避免新记忆刚确认便绑定旧版本，也避免已删除话题产生有效记忆。
- 必要验证：仅运行 tests/memory-source-review.test.mjs，4/4 通过，覆盖来源核对、不可用资料、旧来源并发变化及新对话记忆的来源版本。首次新增批次测试遗漏 originTurn/expiresAfterTurn，触发旧数据补字段与版本冲突；补齐真实新批次字段后通过，未削弱产品校验。冲突模型为替身，数据库为 /tmp 隔离数据；不作为真实模型/浏览器验收。
- 本轮仅服务端改动，不重复网页构建；未部署、不动手机和 E 盘。总体目标继续，真实运行联验及其他未关闭条目仍须完成。


### 2026-10-08 · SET 跨模块业务数据导出

- 核对现有 /api/export 后确认遗漏项目/分类、分类纠错、话题与来源会话映射、监督证据检查/复盘、调研输入/回填。新增 server/data-export.mjs 明确业务实体白名单，保留旧顶层字段并增加上述分组及旧任务，导出 version 2 和各组数量 coverage。资料库现在包含解析正文，避免结构导出只留下标题而丢失可读文字。
- 读取使用单个 SQLite 事务，保持关联对象的同一时点视图；附件与账单原件去掉内部 key，保留名称、哈希和业务引用。不读取私有设置、凭据、会话令牌或后台运行检查点。导出正文是用户自己的业务内容，不对正文作擅自删改。
- 沿用设置页“仅导出 JSON”入口；导出说明明确不含二进制、已删除数据和可恢复运行状态，不能代替完整备份。本轮无数据迁移、没有修改完整备份格式或在线数据。
- 必要验证仅 tests/data-export.test.mjs，1/1 通过：真实隔离 SQLite 的项目→分类→记录、来源→话题、监督证据→实例关联及资料正文保留；测试配置密钥和内部原件 key 不进入导出。无模型调用、网页构建或全量测试，服务未重新部署。SET 全模块及总体目标仍未完成。


### 2026-10-08 · SET/RES 完整备份后的调研续跑证据

- 对应 SET-P03/P05、SET-A04、TECH-02 持久检查点：核对 backups.mjs 确认完整 SQLite 一致性快照已含所有实体与调研检查点表，无需为新模块另加复制逻辑。没有为重复覆盖而修改备份产品代码。
- 新增并只运行 tests/research-backup-resume.test.mjs，1/1 通过。使用实际 LangGraph、ResearchCheckpointSaver、SQLite backup 和恢复代码：生成计划→停在 confirm_plan→备份→新目录恢复→新图读取同计划和中断位置→模拟明确确认→生成报告结束。调用序列仅 plan、report，恢复没有重复规划；原数据库仍停在确认处，证明隔离恢复未推进原任务。
- 同一恢复样本逐字段核对项目、类别、记录、独立话题和 sourceThread、监督实例/证据检查/复盘及音频版本实体，ID、版本与引用原样保留。原件及账单哈希沿用已有专项证据，本轮未重复测试。
- 图/数据库/恢复为真实实现，模型输出与审批回调为测试替身；未声称真实模型、worker 或网页审批接口已联验。无在线迁移、部署、手机或 E 盘操作。整体验收仍未完成，goal 继续。


### 2026-10-08 · 项目要事图片与固定会话入口

- 对照 Q04 项目聚合与 CHAT 的来源固定会话约定，ProjectsPanel 原要事详情只有正文，遗漏图片及直接讨论入口。现显示要事独立图片副本，沿用 /api/events/:id/image/:imageId；图片可打开查看，并补“与搭子讨论”。
- 复用 DiscussSource 和已有 /source-threads 权威映射，不在项目页面创建另一套话题。成功获取来源引用后关闭项目弹窗并跳转搭子；失败仍在详情显示错误。记录依旧打开现有记录详情及其讨论入口；文件不扩展未确认的固定会话需求。
- 本轮仅网页局部改动，无后端行为变更、数据迁移、手机和 E 盘操作。网页构建结果续记；当前环境浏览器运行限制尚未解除，未重复启动浏览器，不宣称点击流程已实测。
- 必要验证：网页 TypeScript 与 Vite 构建通过，产物 index-BVkMFjio.js；无其他测试重复运行。未重启服务，跨模块浏览器验收仍待完成。


### 2026-10-08 · MEM 全需求阶段审查

- 新增 docs/memory-acceptance-audit.md，逐项对应 MEM-01–09、P01–05 和验收入口；读取真实8项样本artifact，复用历史专项，不重做真实AI调用。更正覆盖表过时的手动幂等及跨入口多冲突缺口描述。
- 确认真实未完成项：generateArtifact 仍将全部适用记忆拼入上下文，尚未按写作主题混合检索，与 MEM-05 相关性边界不符。已列为下一步，不能据其他入口正确而关闭MEM。
- 上轮启用时补来源版本使 memory-source 的旧断言失效；更新为要求 sourceRef 保留身份并含真实 revision，没有削弱失效保护。仅运行该相关文件4/4通过，无构建/网页测试。来源核对新增界面、成果取材及最终联验未完成。


### 2026-10-08 · 成果按主题载入记忆

- 修复上一轮 MEM-05 审查发现的全量注入：generateArtifact 使用 artifactMemories，按写作类型、用户要求和选取记录标题调用现有 dense+sparse 混合检索，目的范围沿用周报/文章。取回后再读 SQLite 的完整内容和当前版本，过滤不适用、暂停、失效、重复及旧向量结果，最多5条/6000字符；不截断单条记忆。
- 旧 project 名称不猜 projectId，不扩大项目专属记忆。检索未配置或失败则明确说明本次未载入记忆，仍可基于用户记录写作，不回退全库。生成后沿用状态/版本/来源二次核验。
- 成果持久化生成时的记忆正文、版本和适用范围；网页详情新增可展开采用依据，后续记忆变化不改写旧成果。旧成果无新增字段也能显示。
- 仅运行 tests/artifact-memories.test.mjs：1/1通过，真实隔离 SQLite，检索替身验证筛选/去重/当前全文/失败及未配置分支；不是新的真实向量或生成模型验收。网页构建结果续记，未部署、不动手机/E盘。
- 网页 TypeScript/Vite 构建通过，产物 index-pZtgOoTF.js；本轮没有重复浏览器或其他模块测试，真实链路验收仍保留。


### 2026-10-08 · 记账多工作表导入

- readAccountingWorkbook 读取全部工作表并保留名称/索引，解压限制仍按整工作簿计算，行数上限也改为整个工作簿共享。关系或文件缺失明确报错，不悄悄跳过损坏表；旧 parseWechatWorkbook 仍可读取第一张表 rows，现行批次解析使用 sheets。
- 每张可识别表独立识别微信/支付宝表头并解析；批次支持混合渠道，每行保留真实渠道。多表 rowId 带 sheet 编号，原始行号不改写；同渠道交易标识和弱重复跨表汇总，全部仍待人工确认。单工作表 rowId 保持旧格式，不改已存在批次。
- 未识别表头的表保留原始行与原文件并给明确通知，不伪造入账行；表头冲突错误标明所在表。核对页面、最终选择、重复候选显示工作表名称，避免两个“第2行”混淆。
- 仅运行 accounting-import-parser 五项，5/5通过，包含多表独立行ID、跨表重复、原有无效值/退款/花呗保留规则。测试用合成XLSX，无真实账单或模型调用；网页构建续记。未修改已有批次、部署、手机或E盘。
- TypeScript 与 Vite 构建通过（index-DCaDoROs.js）；未额外跑整套测试或受限的浏览器流程，多表真实账单验收尚未完成。


### 2026-10-08 · 手动账单新增/编辑的重试保护

- 核对原始记账spec的数据一致性、禁止重复提交和Q12操作幂等后，发现现行手动 POST/PATCH 没有回执；响应丢失后再次保存可能重复创建，编辑则因旧版本无法确认是否成功。新增 accounting-transactions，共享 SQLite operations，回执与账单同事务写入，按操作ID+动作/内容校验；相同操作返回原结果，不同独立操作允许合法相同金额交易。
- 新 accountingRequest 复用记忆请求的交互协议，发送前 sessionStorage 保留完整请求，刷新后仍可“重试确认上次保存”；结果未知时不允许把同一操作改成另一笔。账单被删除后回执返回410，不重建旧账单。旧无opId请求保留兼容，网页新入口均带opId。
- 已知保存成功立即关闭表单，再刷新统计，避免仅统计刷新失败导致用户再次提交同一新账单。后端版本冲突仍保护并发编辑。
- 新增 tests/accounting-transactions.test.mjs 定向隔离库验证回执重放、编辑不增版本、不同操作不自动业务去重、冲突与删除不复活；测试/构建结果续记。无真实数据、手机/E盘或部署操作。
- 相关定向测试1/1通过；网页类型检查及构建通过（index-DBD9OU4d.js）。未重复其他套件；网页实际丢响应交互尚待运行环境可用后的联验，整体目标未完成。

### 2026-10-08 · 记账全需求核对与跨页分类建议

- 新增 accounting-acceptance-audit.md，对照原文与16号补充逐项整理实现及证据。发现单笔排名只展示10项没有后续入口，保留为下一步；真实视觉/分类及网页完整验收仍未完成，不以构建和替身测试关单。
- 修复 classification 查询最近20条截断：按批次现有行选择每行最新请求，保留早期页建议；较新失败/处理中仍占据对应行，不回退旧成功结果误导用户。数据保持原样，仅读取结果去除已被新请求替代的行；不产生AI重复调用。
- 仅运行 accounting-classification 相关测试，结果续记；新增25页及较新失败压制旧建议场景，未运行网页构建或无关套件，无部署/手机/E盘改动。
- 相关分类测试2/2通过；使用真实隔离SQLite与模型替身，不代表真实AI分类质量。


### 2026-10-08 · 单笔消费排名完整查看

- Accounting 单笔排名由固定前10项改为渐进展示：显示当前已展示数/总数，继续查看每次增加10项；切换统计月份重置为10项，复用服务端完整排序结果，不引入另一套金额排序或统计。
- 核对现有排名列表CSS，没有固定高度或隐藏后续列表的样式；沿用既有按钮/排版。此处是可逆低影响界面变更，不另写镜像单元测试，只做必要网页构建，结果续记。
- accounting-acceptance-audit.md 同步实现状态；实际浏览器操作与全模块验收仍未完成。未重启服务、无手机/E盘和在线数据改动。
- TypeScript/Vite构建通过，产物 index-B89Qj8th.js；无其他重复测试。


### 2026-10-08 · CHAT 手动长文引用选段与历史依据

- 完整读取搭子spec/plan后核对实际 /ask 与 /search-brief，发现 resolveConversationReferences 仍固定 quote.slice(0,3000)，不是文档目标已落地。改为 conversationSourceExcerpt，共用 research-evidence 的词项选段器，按当前问题扫描全文，最多3段/3000字符正文；没有匹配时分布式预览并明确说明，不声称语义检索或阅读全文。
- research-evidence 增加内部 maxPassages 参数，默认8保持调研现有范围，搭子指定3。短文保留原始空白，录音沿用正文+带时间戳转写阅读文本。当前来源版本/删除校验及提交前复核不变。
- 保存 excerpts 原句、起止位置、选段方式、来源字段及总长度；Sources 增加当时片段的展开查看，旧引用快照不随原文变化覆盖。记录、要事和资料库显式引用及搜索简报走同一取材入口。
- 仅新增 conversation-source-excerpt 定向测试1/1通过：后半部关键句命中、最多3000字符、片段位置逐字匹配、原文修改不改已有快照、短文保真、无匹配时分布式预览。未调用真实模型；网页构建续记。CHAT-A03真实问答与网页入口仍需联验，不以纯函数测试关闭整项。
- TypeScript/Vite构建通过（index-DUC7egbJ.js）；未部署、未动手机/E盘，未运行无关测试。


### 2026-10-08 · CHAT 可引用状态与录音入口一致性

- 新 conversation-source-state 作为 /ask、搜索简报和 bootstrap 记录可引用提示的共同判断：needs_text 记录有实际转写文字时可引用，无转写时提示补充；资料库只有 ready 可引用，不能使用失败/不可用文件残留内容。不存在来源仍由原ID与版本校验拒绝。
- Assistant 引用选择器读取服务端 referenceIssue，展示具体原因；失效已选项保持可取消，不因禁用候选把它锁住。兼容旧无字段响应的原逻辑，没有修改记录正文或转写状态。
- 仅运行 conversation-source-state 定向用例1/1通过，覆盖真实转写文字、空转写、不可用资料残留和不存在来源。无模型调用；网页构建结果续记。未部署、未动手机/E盘，CHAT全场景验收仍未关闭。
- 网页类型检查及构建通过（index-B_noyntw.js），无无关回归测试。


### 2026-10-08 · CHAT 来源重开保留引用与新话题范围

- V14/V15：来源入口原实现每次 setReferences([target.reference])，会悄悄删除其他引用；改为当前话题保留当前选择，其他话题先读原话题最新已保存轮次的引用，再按 kind+id 更新版本或追加。满5条且来源不在其中时保持原5条，打开选择面板显示必需来源及全部移除入口，腾出位置后自动加入；未解决前不能发送。
- 来源读取失败保留入口数据并显示错误，不新建兜底；异步结果按视图epoch保护，读取期间有状态提示且不能发送。跳到其他话题时清理未完成的来源选择，避免跨话题追加。
- 修复“新建话题”只清旧project字符串、不清projectId的遗漏；新话题同时清理稳定项目ID和来源要求，不改变旧话题已保存范围。
- 本轮网页改动；构建期间补了来源读取时的发送保护，因此最终构建另跑一次以覆盖最终源码，未跑无关套件。V14满引用及切换界面的浏览器验收仍待完成，未部署，不动手机/E盘。
- 最终TypeScript/Vite构建通过，产物 index-Eax8ajpH.js；整体目标仍未完成。


### 2026-10-08 · CHAT 搜索简报保留上下文与失败提示

- 搜索简报保留已选择的完整引用片段、版本和换行，不再二次截取每份资料前500字；加入有效话题摘要和最近用户问题，并明确摘要中的助手建议不是已确认事实。
- 模型返回采用明确结构校验；失败或格式不完整时，展示“未采用 AI 整理结果”的可编辑模板，保留原问题、引用和上下文。未配置模型同样明确说明；不存在背景归纳时不再误报“没有附加记录”。
- 本轮仅运行 search-brief-context 定向测试1/1通过（模型替身，覆盖长引用、话题上下文和无效模型结果），最终提示文案调整后仅作语法检查。未跑全量测试或网页构建；真实模型与浏览器联验尚未完成，未部署。


### 2026-10-08 · CHAT 异步简报与删除会话的视图保护

- CHAT-07 / V15：搜索简报固定发起时的话题与引用，返回时核对视图epoch；已切换话题则不弹出原简报，不把旧错误写进新话题。来源恢复中、历史未加载或必需引用待替换时不可生成简报，保留操作说明。
- 删除话题的回调检查当前话题，而非请求发起时闭包中的话题；删除A期间切到B不再清空B。确实删除当前话题时清空项目文字/稳定ID、引用要求、来源加载状态及相关弹窗。摘要更新错误也按发起时视图区分，不覆盖新话题错误区。
- 仅执行一次网页TypeScript/Vite构建，通过，产物 index-BxlWZ2U-.js；未重复全量测试。浏览器请求延迟/切换联验仍未完成，不能据构建关闭V15；未部署、未修改手机或E盘。


### 2026-10-08 · CHAT → RES 保留较早话题背景

- CHAT-A04 / RES-01：核对发现调研创建固定只取最近6轮，较早约束会漏掉。现在复用 assembleThreadContext 的有效摘要+全部未归纳原文及预算规则；没有摘要但仍在预算内时保留超过6轮的原文。超预算明确要求更新摘要，不静默丢弃，不自动增加模型调用。
- researchInput 保存摘要文字/版本/原始依据签名，调研计划与后续图状态以及网页接力沿用同一快照。摘要标注包含助手建议，不能视为用户已确认事实；摘要对应原文被修改/删除时停止继续，单纯重新生成摘要不会改写旧任务背景。旧无contextSummary任务保持兼容，不伪造历史上下文。
- tests/research-thread-context.test.mjs 定向1/1通过，真实隔离SQLite与LangGraph计划输入，生成器替身截获后停止；覆盖8轮原文、摘要+6轮、接力简报、摘要重建保持快照、原文变化拒绝及超预算无新增任务。不代表真实模型建议质量验收。
- 网页同步关联话题提示，不再承诺只读6轮。只跑该定向测试及一次网页构建，构建结果续记；无部署、手机/E盘操作，整体目标仍未完成。
- TypeScript/Vite构建通过，产物 index-DWe-WhgG.js；未运行其他套件，真实模型与网页完整衔接仍待验收。


### 2026-10-08 · RES 网页接力选取相关原文

- RES-03 / CHAT-05：researchHandoffBrief 不再固定取每份资料开头500字，复用调研词项选段器扫描已保存的来源快照，每份最多3段/3000字符；保留版本、原文长度、字符位置和换行。短文完整保留；长文标明不是全文，无词项命中时标明分布式预览、不保证相关，未声称语义检索。
- 已保存并等待回填的用户简报保持原样，不因自动选段重写。共用简报标题涵盖记录、要事与文件；摘要之后的原话题片段不再错误编号为整个会话的第1轮。
- 仅运行 research-handoff-sources 定向1/1通过：长文尾部关键句、位置与原文逐字对应、短文换行、版本/约束/输出要求、无命中提示和已编辑简报保留。隔离SQLite，无模型/联网调用；后端改动未跑网页构建或无关套件。真实网页接力完整验收仍未完成，未部署。

### 2026-10-08 · CHAT 全模块覆盖核对

- 新增 chat-acceptance-audit.md，对照CHAT-01–08、P01–05、A01–06、Q04/Q09及V01/V02/V14/V15定位源码与历史证据；覆盖表由“未核对”改为“进行中”，未将模块标为完成。
- 确认A04普通任务表单/后台不携带引用；ResearchCreate成功后仍保留initial.threadId；搭子2000字问题直接填到调研500字字段。这三项是明确待开发，不只是缺测试；下一轮优先修复。候选全集可达性另列待核对，不凭猜测报bug。
- 本轮只读源码/历史证据并更新文档，未运行测试、构建、服务重启；不把历史模型替身或旧桌面测试提升为当前全链路验收。

### 2026-10-08 · 调研草稿重置与长问题保真

- 修复CHAT-A04审计第2/3项：ResearchCreate成功创建或成功恢复创建操作后，清除旧initial.threadId及来源草稿，同时重置背景、约束、时效、引用、模板与输出要求；请求失败仍保留所有输入。恢复非创建操作不清除草稿。
- 搭子超过500字的问题完整放入背景，主题/关键问题留待用户明确整理，有可见说明；不静默截断、不额外调用AI。提交前按服务端口径检查1–8个问题、每个最多500字，给出可修正提示。
- 仅一次TypeScript/Vite构建，通过（index-C-pAdNO1.js）；未加镜像单元测试或重复套件。网页连续创建/失败恢复/长问题场景仍待实操验收。chat-acceptance-audit.md同步状态；第1项普通任务引用仍待修复。未部署、无手机/E盘改动。

### 2026-10-08 · 普通任务保留搭子引用与规划背景

- CHAT-A04：WorkTasks普通创建传递所选来源kind/id/revision；新work-task-context复用搭子来源可用性/选段和thread-context，严格校验引用、去重、5条上限与版本，旧无引用请求仍兼容。取代旧话题固定尾部24000字符截断，摘要与未归纳历史按共同预算完整装配。
- 规划模型读取goal、requirement和sourceContext；返回后核对来源状态/版本与话题内容签名，变化则不创建任务。保存references及sourceContext历史快照，任务详情可查看来源版本/片段、摘要及原话题答复。仅修既有待确认计划入口，没有增加ACT业务工具或自动确认。
- tests/work-task-context.test.mjs 1/1通过：长引用尾部命中、旧无threadId会话背景、完成要求传入、状态仍draft、来源/话题修改拒绝保存、原快照保留；隔离SQLite与生成替身，没有真实模型调用。网页构建结果续记；普通任务失效引用的网页恢复与完整主流程仍待验收，未部署/手机/E盘操作。
- 一次TypeScript/Vite构建通过（index-Bc504n7Q.js），未重复其他测试。

### 2026-10-08 · 普通任务引用可编辑与草稿独立

- CHAT-A04/V02：普通创建表单复用ResearchSources分页选择器，显示已选资料标题/版本，删除或旧版本可移除后重选；增加maxRefs参数，调研保持8条，普通任务5条，与后台契约一致。生成时禁用引用编辑。
- 普通草稿初始化时固定来源话题和引用，提交从当前草稿读取，不再临时读取可能被ResearchCreate清空的taskDraft；界面可主动移除话题背景。成功后清空本次引用/话题，失败保留，未新增模型请求或更改来源原文。
- 仅运行一次网页构建，结果续记；未重复后台来源测试或无关套件。普通任务网页失效引用恢复仍待实操验收，不以选择器代码存在判全流程通过。
- TypeScript/Vite构建通过（index-BmmuDJ4T.js）；无部署或手机/E盘改动。

### 2026-10-08 · 搭子引用完整浏览与转写搜索

- 核对chat-acceptance-audit第4项：bootstrap.notes/events实际没有截断，不能把仅conversations最近200条的限制错误套用到资料。原搜索先过滤全部记录/要事，但仅渲染前100条且无更多入口。
- Assistant新增匹配结果渐进展示（每次100条），类型/搜索/重开选择器重置展示量，已选引用独立保留。搜索及录音无摘要时预览加入transcript.segments文字，同时搜索摘要；补Note转写文字类型，不修改转写数据。
- 本轮仅低影响前端调整，运行一次类型检查/构建，不写镜像测试或跑全套。大量匹配/录音搜索网页实操仍待验收；没有增加服务器分页接口、部署或手机/E盘改动。
- 首次类型检查发现新增Note局部转写类型与TranscriptPanel完整类型交叉导致字段推断缺失，已统一为共享Transcript类型（字段沿用原完整定义）。因此针对修复重新构建，非重复无关测试；最终结果续记。
- 修复后TypeScript/Vite构建通过（index-DD5PE4fU.js）；未运行其他套件。

### 2026-10-08 · EVT 复核读取转写与执行条件快照

- 完整读取要事spec/plan并核对event-jobs/events：到期时间/实例/版本检查、普通等级不调用复核模型、用户确认与复核提交分离已有实现；本轮未据静态检查关闭EVT-A02/A04。
- EVT-P02/V16：eventReviewContext来源记录改用共享noteReadableText，包含时间戳、匿名说话人及识别误差说明；原正文不改写。关联workRun加入conditionsSnapshot，让本次实际约定条件而非仅模板要求进入复核。二者属于实际消费字段并进入签名，修改后旧建议失效。
- 仅运行event-review-context定向测试，保留已有竞态/关联依赖测试并补录音与条件变更；生成替身/隔离SQLite，无真实模型调用，结果续记。后端改动不跑网页构建。
- 另发现关联workRun的evidenceRefs新式证据引用仍未完整纳入复核读取，现仅有文字evidence、assessment及旧artifactId；保留为下一项明确缺口，需要共享证据有效性规则并呈现失效原因，不能编造未读取证据。
- 相关测试4/4通过；未部署，无手机/E盘改动。要事全模块与真实复核质量仍待完整验收。

### 2026-10-08 · EVT 接入监督执行引用证据

- EVT-P02/V16：将supervision-evidence原有来源读取函数及引用schema原样抽到supervision-source-reading，监督候选/检查继续使用同一实现；新增只读inspectRunEvidence供要事复核消费，不绕开版本、文件ready、成果所属任务/时间/复用限制。无新增调度器或确认操作。
- eventReviewContext读取关联run.evidenceRefs完整有效正文，保存来源版本到复核依据；无效项只传具体原因、期望/当前版本和缺失状态，不用新版内容冒充原证据。引用变化、正文版本变化/删除/有效性变化均进入输入签名，旧建议自动失效。提示词区分历史assessment与当前有效证据，不能将其当成用户完成。
- 要事复核依据列表展示issue，避免存在但版本过期的资料仅显示“版本N”误导；未知格式在模型输入中标明不可用。仍沿用40000字符复核上限，超限明确报错，不静默截断。
- 仅运行event-review-context相关5项，5/5通过（含新增证据读取、异任务成果拒绝、版本变化无正文、删除签名变化及原竞态）；隔离SQLite和复核替身，不代表真实模型判断质量。网页构建结果续记，无手机/E盘或部署操作。
- 一次TypeScript/Vite构建通过（index-ByR4LfPB.js）；未运行无关套件，EVT真实模型/网页整体验收尚未完成。

### 2026-10-08 · EVT 独立经历日期

- EVT-P03新增可选occurredAt（YYYY-MM-DD日历日期），与dueAt约定检查时刻分离。创建/编辑共用严格日历校验，空值存null，旧客户端省略字段时保留原值；未填写的旧记录不推测发生时间、不批量改写。日期精度采用“天”，不编造发生时分。
- 要事编辑可填写/清除“事情发生日期”，卡片分别标记发生日期与检查时间；AI辅助编辑不决定该日期。复核输入加入本要事/关联要事的发生日期，相关日期变化影响依据签名。仅填日期不创建检查实例或提醒。
- event-lifecycle定向7/7通过，含闰年日期、非法日历拒绝、保存/省略保留/清除、与提醒独立，以及既有四类型/改期并发/回滚路径；隔离SQLite无模型请求。网页构建结果续记，未跑无关套件。日期网页重开实操仍待验证；无部署、手机/E盘改动。
- TypeScript/Vite构建通过（index-CAMl8nre.js）；整体目标未完成。

### 2026-10-08 · EVT 历史经历搜索与分类筛选

- EVT-01/P03：要事列表新增标题/摘要/标签/项目/发生日期关键词搜索，与生命周期、长期/一次性/旧类型待选、等级筛选组合。显示匹配数量/总数，区分没有任何要事与没有匹配结果，提供清除筛选。
- “本次检查已确认”仍属于进行中，不错误归入已结束；过滤只影响展示，不改变事件或提醒。小九跳回要事先清除列表筛选再定位，避免目标被条件隐藏。复核轮询仍基于全部要事，筛选不影响处理状态刷新。
- 低影响前端修改仅运行一次TypeScript/Vite构建，不新增镜像单元测试或重复全套；网页搜索/筛选与小九回源实操尚待验证。无部署、手机/E盘操作。
- TypeScript/Vite构建通过（index-AFpdMKbQ.js），未运行其他测试。

### 2026-10-08 · EVT 检查历史可解释展示

- EVT-05/06/P03：检查历史读取既有持久字段，显示改期/请求重试/替换结果/编辑后重检的动作及时间、旧约定、复核时间，取消时间和原因。历史建议以Markdown呈现，来源版本/缺失/失效原因可展开，明确旧结果不是当前结论。没有补造旧记录缺失时间或依据。
- 加载失败且列表为空时不再同时显示“尚无约定检查”，保留错误与重试入口。本轮只改历史展示，不改确认、调度或结束语义。
- 只执行一次TypeScript/Vite构建，不新增镜像测试；真实网页历史展开/滚动仍待验收，未部署或改手机/E盘。
- TypeScript/Vite构建通过（index-Bd5jtfrd.js），未运行其他套件。

### 2026-10-08 · EVT 清理当前复核依据残留

- EVT-05/06/V16：cleared及手动requestEventReview原先清文字/时间但保留reviewSnapshot，改期或重试待处理时可能把旧来源显示为“本次复核依据”。现在同步清当前快照，已经归档的history.reviewSnapshot及已确认旧检查保持原样；安排下一次检查也不继承旧快照。
- 只运行event-lifecycle新增“resetting a review”定向用例1/1通过，覆盖稍后改期、同时间编辑、手动重试、确认后安排下一次四条路径，核对旧文字/依据保留与新状态清空。未重复整个套件；后端修改不跑网页构建。未部署，无手机/E盘改动。

### 2026-10-08 · EVT 未保存草稿可交AI整理

- EVT-02/P03：辅助编辑入口原先必须已有note/event，且不传当前编辑字段。现在请求可携带严格校验的draft（标题/摘要/标签/项目），新要事写下大概即可整理；类型/等级/发生日期/检查日期不属于AI可写字段。前端提交当前草稿，已有来源文字与图片仍按原版本保护读取，录音文字沿用共享阅读视图。
- eventDraftTextInput区分来源文字和当前编辑意图，提示不得擅自恢复用户已删内容，矛盾需指出；旧无draft客户端仍读取原来源/要事摘要。版本核对、图片数量/大小限制及AI输出schema/自关联过滤沿用原逻辑，不自动保存。回执增加usedCurrentDraft说明实际采用草稿。
- event-draft相关3/3通过，新增未保存草稿、当前编辑优先、原文/转写同时保留、越权和超长拒绝；无真实模型调用。server/index语法检查通过；网页构建结果续记。旧来源无正文时回退已有要事摘要的兼容表达式随后保留，未重复无关测试。
- 网页实际手写大概→AI草稿→人工保存及真实图片识别仍待联验；无部署、手机/E盘改动。
- 一次TypeScript/Vite构建通过（index-BVC02Zli.js），未跑全量测试。

### 2026-10-08 · EVT 模块覆盖核对与保存缺口

- 新增event-acceptance-audit.md，映射EVT-01–09/P01–05/A01–07、相关V风险及PET/项目/技术栈证据；更新覆盖表为进行中，没有关闭整模块。
- 确认普通POST/PATCH保存尚未使用eventOperation/eventRequest，失去响应后可能重复创建或无法辨认旧编辑是否成功；检查动作已有回执不代表普通保存同样受保护。下一步补该明确缺口及图片临时副本竞争回收。
- 本轮只核对源码与已有证据、更新文档，未重复测试/构建，不操作运行服务或用户数据。

### 2026-10-08 · EVT 普通保存幂等与图片竞争清理

- 新event-save将新建/编辑接入eventOperation；回执在来源检查与副本复制前先重放，相同opId不同内容拒绝，已删除要事不复活。实体/检查/outbox/回执同SQLite事务，竞争失败的请求只清理自身临时图片；已保存副本保留，替换后才清旧图。
- 首次定向测试发现editEventLifecycle开启嵌套事务，新增内部atomic参数，保存服务使用外层回执事务；旧直接调用默认事务不变。修复后event-save单项通过，包含并发复制后竞争、一条实体/一套副本、持久重放、编辑不增版本、异内容拒绝、非法数据清理以及删除不重建。隔离库与合成图片，无线上数据。
- eventRequest扩展POST /events和PATCH /events/:id，持久化method与完整body，兼容旧检查操作缓存。保存改用该请求，未知响应可由页面或弹窗恢复；仅恢复当前编辑对象的保存才关闭编辑器，其他检查操作不丢草稿。
- 初次构建通过；因恢复回调增加目标判断，最终源码重新构建，结果续记。没有跑全量套件；真实网页丢响应/刷新操作尚未完成，event-acceptance-audit同步为已实现待验收。
- 最终TypeScript/Vite构建通过（index-CkEplyAw.js）；未部署、未改手机/E盘。

### 2026-10-08 · SUP 录音转写作为验收证据

- SUP-04/P02/A05、V02：共享 supervision-source-reading 原先仅取 note.content，导致纯录音转写不出现在可选证据中，也无法提交验收。现复用 noteReadableText，正文与转写同时保留，时间位置、匿名说话人及识别可能有误提示传给模型；不改写记录正文。空白转写不能靠时间标记和说明文字冒充可检查内容。
- 候选、已选解析、AI检查、人工确认与要事复核沿用同一读取器及来源版本规则；历史检查仍保存当时完整阅读文本和引文位置。转写编辑后旧引用失效，不能用旧结论确认完成。
- 仅运行 `node --test --test-name-pattern='audio evidence' tests/supervision-evidence.test.mjs`，通过1项：纯转写可选/可提交、空白转写不可选、模型输入时间与说话人、引文位置、历史快照、复核读取一致及改版拒绝确认。隔离SQLite与模型桩，无真实模型调用；后端改动不跑网页构建或无关套件。
- 网页实际选择录音→验收→人工确认仍待联验，未宣称SUP整模块完成。无部署、手机或E盘原件改动。

### 2026-10-08 · SUP 每日复盘共用证据有效性

- SUP-04/07/P04/A06、V02：dailySupervisionRecap 原先另写引用解析，只验存在和版本，既遗漏录音转写，又能把不属于本任务的成果、未就绪文件作为有效正文。现复用 inspectRunEvidence，与提交验收/要事复核保持一致；失效项保留占位和 invalidReason，但不向模型传其正文。
- 有效录音包含匿名说话人、时间和识别提醒。来源改版影响当日事实签名，既有AI复盘保留为历史参考；不重写任务完成状态或旧复盘。
- 执行 supervision-recap 定向文件，默认Node隔离输出只报告文件一项，无法直接核实子用例计数，因此用 `node --test --test-isolation=none tests/supervision-recap.test.mjs` 核实3/3通过：既有事实统计/并发/输出校验，以及新增录音正文、错误归属/未就绪材料排除、版本变化和历史保留。没有扩大到全套。
- 本轮纯后端修改，未构建网页、未调用真实AI、未部署。网页联验仍待完成；未改手机/E盘原件。

### 2026-10-08 · SUP 复盘失效依据可解释展示

- SupervisionRecap 使用后端 invalidReason 展示具体问题，不再把文件未就绪、成果归属错误等一律描述为来源删除/改版。兼容旧响应时使用中性不可用提示；格式异常的历史引用缺少ID/版本时保留占位、不显示空版本。
- 沿用 ui-ux-pro-max 的就近错误解释指导，无重设计或新依赖。一次TypeScript/Vite构建通过（index-DAQwl3bK.js）；仅有既存包体积提示，未部署。
- 针对前轮Node仅报告文件通过的证据粒度问题，额外仅选 audio evidence 用例以 `--test-isolation=none` 核实，1/1具名用例通过；未跑监督全套或其他模块。后续定向测试采用该模式避免文件级输出含糊。
- 网页实际复盘/音频证据联验仍未完成，不能据此关闭SUP；不改手机与E盘原件。

### 2026-10-08 · SUP 模块验收覆盖归档

- 核对 runs/calendar/conditions/timer/schedule/jobs、证据读取与复盘、待办升级、小九聚合及历史桌面/模型记录，新增 supervision-acceptance-audit.md，映射SUP-01–08/P01–05/A01–07和V01/02/09/10、PET/REC/TECH依赖。
- 修正覆盖表长期残留的“未核对”为进行中并指向对照，不将历史后端/桌面验证抹去，也不冒称最近录音改动已完成网页联验。当前下一步为合并一条录音证据→人工确认→复盘/来源改版网页流程，以及交付环境服务状态核对。
- 本轮是源码与证据归档，无代码改动、无测试/构建/模型重跑、无部署；未动手机和E盘原件，总目标仍未完成。

### 2026-10-08 · SUP 录音网页联验场景与环境阻塞

- 本轮先用临时回环端口检查本地监听，明确返回EPERM；未启动应用/模型服务，也未反复尝试浏览器运行。环境仍不能完成需要HTTP服务的网页验收，不据此否定既有业务实现。
- 新增 supervision-audio.spec.ts 和仅测试使用的 supervision-audio-web-server.mjs：隔离库种入已保存转写，通过真实API升级监督、选择录音、HTTP模型桩检查、人工确认、复盘、修改转写及显示失效原因。使用已有转写，不冒充真实ASR。生产API不加入测试后门，Playwright以SHIGUANG_E2E_SUP_AUDIO选择入口，其他测试默认入口不变。
- `--list`已发现一条desktop场景；首轮默认HTML报告写大写目录EROFS，改为`--reporter=list`后场景发现正常。仅证明测试可解析/发现，不证明流程运行通过。未重复网页构建或后端测试，未动线上配置/手机/E盘。
- 环境恢复后的定向命令：`SHIGUANG_E2E_SUP_AUDIO=1 PLAYWRIGHT_HTML_OUTPUT_DIR=/tmp/supervision-audio-report bash scripts/test-browser.sh tests/e2e/supervision-audio.spec.ts --project=desktop --output=/tmp/supervision-audio-results`。预期断言仍待实际运行确认，SUP及总目标保持未完成。

### 2026-10-08 · RES 计划生成读取长文相关片段

- RES-01/02/P02/A01：research-jobs 生成计划原先只取每份来源前1500字，与后续证据检索和网页接力脱节。现在复用 selectResearchPassages，按问题/主题词项从完整保存快照选至多3段；无匹配使用明确标注的分布式预览。输入携带来源ID/版本、原文长度、精确start/end和truncated，不改原文或资料快照。
- 规划提示明确区分词项选段与阅读全文，distributed_preview不保证相关，资料缺口进入unknown。没有把该选段称为向量检索，也没有绕过计划人工确认、版本检查或共享预算。旧持久检查点仍保持其已有输入，不在恢复时暗改已确认计划。
- 仅运行 `node --test --test-isolation=none tests/research-thread-context.test.mjs`，1/1通过。实际LangGraph规划节点配注入模型桩捕获输入：长文末尾实践内容可见，切片与原文位置完全一致、版本/截断标记保留，同时既有话题摘要溯源与上下文限制断言通过。
- 纯后端修改未构建网页，未调用真实模型/联网。真实长文调研质量及网页联验仍待完成；无手机/E盘原件/部署操作，总目标继续。

### 2026-10-08 · RES 来源改版后可结束网页接力

- 核对确认/重试/开始接力/回填均有 validateResearchInput，未发现越过来源版本继续执行的路径；但原统一前置校验也拦住了“结束接力，保留原成果”，使已有报告的用户在来源改版后不能退出等待。
- 将有既有成果的end_handoff移到来源读取校验前，仍核对请求revision、接力ID/状态、计划确认及操作回执。只关闭等待并保留原报告，不排队、不增加调用、不改预算；无报告的结束接力会恢复研究，仍走原来源校验。取消/预算异常限制保持。
- 新定向用例实际执行LangGraph计划/确认/报告后模拟来源改版：回填继续拒绝、错误接力ID拒绝、正常结束/幂等重放成功、成果/预算/模型次数/工作ID不变。首次检索桩返回数组与既有接口不符，修正为{evidence,notice}后同一用例1/1通过；没有扩大测试范围。命令：`node --test --test-isolation=none --test-name-pattern='closing handoff preserves' tests/research-tasks.test.mjs`。
- 隔离库、模型桩，无真实检索/模型或网页构建，网页操作仍待联验。未部署、未改手机/E盘原件；总目标未完成。

### 2026-10-08 · RES 模块覆盖与真实证据边界

- 新增 research-acceptance-audit.md，映射RES-01–09/P01–05/A01–08及V01/02/06/07、TECH/PET/SET，覆盖当前计划/检索/失败降级/接力/报告/候选/预算图与近期修复。覆盖表更新为进行中，没有据测试文件存在宣称验收完成。
- 实际检查research-flow-check.json：真实供应商隔离图通过，但人工确认由脚本模拟、缺搜索配置，仅为知识降级，不是联网证据。明确保留真实公开来源/比较冲突/账户计费/最近网页变化的验收缺口。
- 文档与源码核对，不跑测试/构建/模型，不反复尝试当前EPERM监听。没有部署/手机/E盘操作，完整目标仍继续。

### 2026-10-08 · SET 独立语音能力探测接入

- SET-01/02/P01/P05：发现capabilities将ASR/分离固定configured=false且不实现探测。现接localAudioCapability，按实际Python/各自模型文件展示配置，分别运行公开英语样本前15秒；不调用生成模型，不读私人录音、不自动下载。配置版本沿用已有指纹防止迟到探测覆盖新配置。
- Python提取业务共用create_whisper/create_diarizer，与新capability.py共用解码、模型加载和推理参数。转写检查非空文字，分离检查非空时间段；明确不代表中文/人数质量验收。Node子进程90秒上限低于网页110秒请求超时，退出清理、输出64KB上限，失败保留可理解错误；callId贯通终端和AI日志。
- 必要验证：Python AST语法和两个Node模块语法通过；audio-capability定向1/1通过，使用进程协议桩验证两项独立调用、无样本不执行、空输出/分离失败与对应日志，不冒充真实推理。之后仅将进程超时从120秒调整至90秒匹配既有请求期限并移除Python重复导入，未重复无关测试。
- 真实本地模型探测、网页按钮及配置改动后的结果展示仍待验收。没有网页源码变化，未构建；无部署、手机或E盘原件操作，总目标保持进行中。

### 2026-10-08 · SET 语音能力真实本地探测证据

- 针对新增探测入口各运行一次真实本地推理，调用与设置API相同的probeCapability，隔离DATA_DIR=/tmp/shiguang-audio-probes-YrWTZ1；仅使用已下载公开英语样本前15秒，未读取私人录音或下载/联网。
- ASR large-v3-turbo成功返回非空英文，18321ms；sherpa-onnx分离成功返回4段/2个匿名说话人，2460ms。capabilityList重新读取后两项configured=true，分别持久保存成功结果、配置指纹、调用编号与时间。终端和隔离AI日志包含对应请求/返回。
- 原始结果保留到 artifacts/audio-capability-check-20261008.json；checkedAt使用运行时UTC原值，不人为改写。该证据仅证明公开样本独立推理和状态保存，不证明中文准确率、人数准确率或网页交互。
- 新入口真实本地探测待验收项已完成；网页按钮和配置变化期间旧结果保护仍待联验。未重复其他测试/构建、未部署、未改手机或E盘原件，总目标未完成。

### 2026-10-08 · SET 语音配置错误隔离与探测版本

- SET-01/02/V20：新增语音能力读取会调用严格localAsrConfig；发现ASR_MODEL写错可能让整个capabilityList抛错。现将错误限制到ASR卡片，给出可选模型说明；其他能力列表仍可读取。分离模型加载不依赖转写模型选择，ASR配置无效不连带禁用分离。
- localAsrConfig增加内部可选model参数，既有业务默认不变；分离探测用固定合法占位ASR参数（不加载Whisper）。能力探测保留版本指纹，异步结束时配置已变则409且不覆盖已存结果；测试替身通过内部函数参数注入，HTTP接口未增加开关。
- 仅新增定向用例1/1通过：非法ASR配置时八项列表仍可读、分离项保持不变、ASR返回具体失败；探测中变更模型，迟到结果拒绝且原记录未改。无真实模型重跑、无网页构建/部署，用户配置与数据未变；网页联验和总目标继续待完成。

### 2026-10-08 · SET 数据位置和磁盘状态

- SET-04/P03/P04：新增登录后GET /settings/storage，在备份面板内展开查看DATA_DIR、数据库、上传原件（含要事图片和账单）、库副本、成果、备份、日志位置和存在状态；只做固定路径lstat，不遍历文件或链接目标，不读原件内容。
- statfs显示数据目录所在文件系统总容量与当前进程可用空间，明确不是应用独占用量；读取失败显示未知而非0。Qdrant解释为可重建索引，原文和业务事实归数据库及副本；JSON与完整备份区别保留。页面刷新失败保留上次带时间结果及错误，长路径允许换行。
- 仅一次隔离目录实际读检查验证存在/未创建状态与真实磁盘容量，未新增镜像测试套件；TypeScript/Vite构建通过（index-CZflv_dD.js），仅既存包体积提示。路由注册在统一登录校验之后。
- 网页展开/刷新实操受已记录的本地监听限制仍待验收，未反复启动服务、未部署、未动手机/E盘原件。总目标继续。

### 2026-10-08 · SET 后台worker实时状态入口

- SET-01/TECH-01：原能力页仅Redis PING，不体现worker运行情况。新增API所持子进程的IPC心跳观察：启动/退出/未启用/心跳超时/连接或处理异常/就绪分开。仅当前子进程消息生效，旧进程迟到退出或消息不覆盖新实例；不靠旧数据库心跳或Redis连接成功推断进程活着。
- file-worker每2秒报告当前连接/错误状态；10秒无心跳标未确认。设置新增登录后只读/settings/worker，数据库聚合pending/running/failed/completed/cancelled数量；页面展开后每10秒刷新，说明待处理含预约、running可能待租约恢复，进程就绪不代表业务已完成。具体错误/重试继续回业务来源。
- 只运行worker-status具名定向1/1：启动、错误、超时、替换进程的迟到消息、禁用；两个服务端入口语法通过。TypeScript/Vite一次构建通过（index-CVibVYzf.js），仅既存包体积提示。
- 当前沙箱本地监听EPERM，未尝试新应用/Redis服务，真实IPC与Redis断开/恢复、网页展开流程仍待联验；没有将纯状态测试当作真实worker测试。无部署/手机/E盘原件改动，总目标继续。

### 2026-10-08 · SET worker连接状态与恢复竞争修正

- 回查新增IPC状态发现仅观察消费连接，发布连接断开时可能仍报队列就绪。现同时读取实际publisher/consumer Redis client.status，并要求worker已触发ready；连接ready/close/reconnecting/end均触发状态报告，不因单侧恢复就把整体连接标正常。
- tick增加自身串行保护，避免前次dispatch仍等待时，下一次被跳过的dispatch返回被当作成功恢复。记录错误代数，执行期间新报错误不被迟到的成功结果清掉；下一次完整协调/投递成功才清处理错误。任务投递实现、业务状态和重试语义未改变。
- 仅语法检查通过，没有为简单状态表达新增镜像测试或重复全套。真实Redis双连接断开/恢复与IPC仍受当前服务监听限制待联验；不据源码修正关闭该验收。无网页构建/部署、手机/E盘原件操作。

### 2026-10-08 · SET 运行说明与旧语音断言更新

- 新增22-operation-guide.md集中说明4317构建/5173热更新、日志、独立能力与worker状态、实际存储位置、JSON边界、备份验证/隔离恢复和线上切换的单独授权边界。基于当前启动/备份/Vite实现，没有恢复或启动任何服务。
- capabilities桌面/API两个旧断言固定ASR未接入，会与已落地能力矛盾；改为核对实际配置及对应按钮可用性，不触发额外模型探测。网页场景执行仍受环境限制，未宣称此次已通过。
- 本轮文档和测试预期同步，未重复运行完整备份、模型、全套测试或构建；现行README为用户整理版，未覆盖。整体SET及总目标未完成。

### 2026-10-08 · SET 模块验收覆盖归档

- 新增settings-acceptance-audit.md，映射SET-01–07/P01–05/A01–05、V20、Q03/08/12及TECH/PET边界，覆盖实际配置/语音探测/日志/存储/备份/恢复/开发访问和新增worker状态。总覆盖表从未核对调整为进行中，不虚报整模块完成。
- 明确下一项可独立推进工作为各AI入口业务关联日志核对；网页/IPC/Redis重连及Vite私有路径HTTP仍受环境限制待验证。备份与真实语音既有证据复用，没有重复测试、模型调用、构建或部署。
- 没有修改用户原文spec/plan、手机或E盘原件，全目标保持进行中。

### 2026-10-08 · SET AI日志业务上下文贯穿

- 发现底层模型请求虽有callId，但部分业务调用未关联会话或任务。新增ai-context.mjs，用AsyncLocalStorage在统一日志出口附加context；认证后的API入口记录服务端生成requestId、method、endpoint及允许的业务标识，新建搭子会话补实际threadId；BullMQ执行入口附加jobId/jobKind/entityId/revision/attempt。日志上下文只用于诊断，不参与权限、检索或业务校验。
- 上下文采用字段白名单；凭据与图片仍经原日志脱敏。不同并发请求、嵌套调用隔离，日志现有callId和业务字段保持；网页现有完整JSON详情可直接显示context，没有改动UI或手机端。
- 必要验证：node --test --test-isolation=none tests/ai-context.test.mjs，1项通过；真实requestCompletion配fetch桩交错成功/失败，确认请求/响应/错误上下文与callId对应、无跨请求污染、嵌套恢复和凭据不泄露。index/background-jobs语法检查通过；未发真实模型请求、未重跑全套或构建。
- 该证据覆盖日志传播核心，不代表当前API中间件与实际Redis worker端到端已验收；独立脚本无业务上下文时context为空，逐入口业务语义完整性仍需收口。环境服务联验限制保持，总目标未完成。

### 2026-10-08 · 总验收阶段文档建立

- 新建21-development-acceptance.md阶段版，按19号要求集中十模块入口、七份已有审计、真实/模拟证据边界、数据兼容/回退、启动/日志和8个剩余关卡。明确REC/RET/PET逐项对照尚缺，并未预设所有实现已完成。
- 实际读取历史录音、Qwen留出样本/切换/回退、小九和调研产物，保留日期与限制；不把历史进程、旧final日志或桩当作当前验收。真实服务端口仍待现场核实，未伪造部署或在线状态。
- 本轮仅收敛交付清单，不重复模型、测试、构建或服务启动。后续先补三个模块编号对照及明确实现缺口，再合并受影响联验；goal保持active，本文不是全部通过声明。

### 2026-10-08 · REC图文归纳漏图修复（REC-03/V12）

- 阅读REC完整spec/plan时核实：旧summarize入口仅note.type=image时取首图；text记录附件图片和其余图片均漏读，图像提示亦未包含用户正文。新增readSummaryImages按实际附件读取所有支持图片，统一使用视觉配置，不依赖note.type；提示同时携带全部正文/转写与图片。
- 不支持格式、缺失原件、非普通文件、空文件/读取大小变化明确点名；图片累计20MB或图文正文24,000字符超限时要求压缩/拆分，不静默省略再输出摘要。纯文字原有长文分段流程保持。推理前后检查来源版本，旧结果不保存。
- 成功保存summaryInputs（来源版本、图片ID/名称、正文字符数）；日志有读取清单且无图片字节。记录摘要增加可展开范围说明，明确音频取已有转写、文档取已有解析正文，不声称重新解析附件原件。旧摘要不伪造范围，新字段可选兼容历史。
- tests/note-summary-images.test.mjs定向1项通过：真实归纳函数配fetch桩，text类型+两图+用户正文全部送入独立视觉模型；缺图/不支持图/超长正文不继续调用，迟到结果被拒。初次测试误用saveSetting已更正为setSetting后通过，非产品失败。服务端入口语法通过。无真实模型调用、未运行全量或手机测试。
- 本项修复重新打开REC-A03/V12的当前网页图文场景：桩验证输入完整性，不证明真实视觉理解质量；当前环境网页联验仍待进行。REC完整编号对照尚未完成，总目标继续。
- 网页构建含TypeScript检查通过，最新产物index-COE8LLUk.js；仅现有大包体提示，未部署或重启在线服务。

### 2026-10-08 · REC全需求与既有证据对照

- 新增record-acceptance-audit.md，覆盖REC-01–12/P01–09/A01–11、V01/02/11–14、Q04与TECH/PET联动；核对导入稳定重试、待办上海跨日/来源去重、成果SQLite版本导出、分类与录音当前入口。
- 可复用既有导入、每日待办、成果下载和英文真实ASR网页证据，不重跑。明确当前录音依次手动转写/总结，完整录制到总结、中文说话人数及长录音质量未关；自动处理口径需要继续对照确认，未用文档将缺口消掉。
- 总覆盖表相应未核对项改为进行中，不改原始spec/plan。无新测试、模型、构建或部署；REC模块及全目标保持未完成。

### 2026-10-08 · RET全需求与真实质量证据对照

- 新增retrieval-acceptance-audit.md，覆盖RET-01–07/P01–04/A01–06、V01–05、Q04及Qwen/TECH补充。核对当前两路过滤、SQL复查、前缀扩大/1,000候选上限、来源成员独立、分页/逐文件状态及任务关联。
- 复用既有53来源/120分段、20题18命中与2道无答案实测，明确题目留出范围及两个失败项。历史切流/回退不代表当前服务健康；网页桩不代表真实Redis/embedding故障恢复。
- 更新总覆盖和21号索引，本轮无测试、模型调用、构建或服务重启。后续核对近期转写与来源消费一致性，继续PET完整对照；目标保持进行中。

### 2026-10-08 · PET全来源与需求对照

- 新增pet-acceptance-audit.md，列出真实来源矩阵、PET-01–11/P01–05/A01–10、V01/02/21及Q09/10，核对共享只读快照、业务回源、静音/稍后、旧轮询隔离、情绪上下文与三日事实。
- 复用既有提醒、反馈和通用记忆真实/模拟专项；新增记账和调研的全来源网页联验未完成，未把来源代码存在冒充验收通过。十模块现均有对照索引，原始覆盖表逐项仍未全部关闭。
- 本轮未新增运行测试/模型/构建或部署；21号同步索引，后续收口过期审计说明及剩余实现/联验，goal仍active。

### 2026-10-08 · REC录音分类完整取材修复

- 核对REC/RET共享转写正文发现分类使用content || transcript，录音有附记时整个转写被忽略。改为复用noteReadableText，将附记、时间戳、匿名说话人和识别风险说明一起送入分类；长内容沿既有全段归纳流程处理。
- 空转写的时间标记/风险说明不能构成分类证据；仅无原始可读文字时才允许用未标过期的AI摘要，summaryStale=true不再回退分类。真实分类promptVersion改为note-category-v2，历史反馈保留原版本，不批量重跑已有分类、不覆盖人工选择。
- tests/classification-audio.test.mjs定向1项通过：隔离SQLite、真实分类handler与fetch桩，核对附记和转写都进入模型、保存类别但不改附记/转写、过期摘要和空转写不发模型请求。无真实模型调用、无网页改动，未重复构建或全量测试。
- 当前证据证明取材与保存契约，不代表真实分类准确率或队列/网页联验完成；目标仍进行中。

### 2026-10-08 · REC转写轮询与操作反馈隔离

- 重读用户Q01与REC完整流程，已确认上传/录制→可编辑转写→总结，没有指定上传后自动发总结模型请求。本轮保留显式转写/归纳步骤，不把历史开发备注当成新产品要求；完整网页闭环仍未验收。
- TranscriptPanel原2秒轮询无互斥，慢请求会重叠，且操作期间旧轮询仍能覆盖开始/取消/修订后的局部状态。现单轮在途时跳过重复请求，开始/取消/保存期间暂停轮询，依赖变化/卸载取消并丢弃旧结果；每次读取15秒超时。
- 轮询错误与用户操作错误分开，成功刷新只清轮询错误，不抹掉保存失败原因；获取失败明确标记旧状态并继续重试。没有修改ASR、业务确认或持久结构。
- 低影响网页修复只做一次构建/类型检查，不新增镜像单测或重复模型。真实慢轮询与操作交错浏览器联验仍受环境限制待完成，不能把构建当作实操通过。
- 首次类型检查发现ErrorBanner要求string，已将空态undefined改为空字符串后重新构建通过；最新index-D8huKtSk.js，仅保留原有包体积提示。无部署或服务重启。

### 2026-10-08 · 联验环境复核与过期审计说明清理

- 完成十模块对照及近期修复后，最小Node回环临时端口探针仍返回listen=false/code=EPERM，未启动任何应用/Redis/浏览器测试。没有按旧PID推断服务在线，不重复启动或请求绕过沙箱。
- 再读当前artifactMemories、generateArtifact记忆快照和work-task-context接入，修正MEM-P04/MEM-06与CHAT-A04审计的过期“待实现/下一步修复”描述为已实现待联验；保留全部未通过门槛，没有删需求。
- 21号总验收追加真实阻塞与恢复条件：在允许本地监听的项目环境继续既定网页/API/队列验收，不增加公网暴露/手机工作。当前不是全部完成声明。
- 本轮未运行模型或测试套件、未构建部署，goal仍active。

### 2026-10-08 · 阻塞期间核对最小联验恢复入口

- 本地监听EPERM的同一阻塞继续存在，本轮未再次探测/启动。核对test-browser、Playwright配置和现有SUP/RES/记账场景，21号补可直接执行的两条最小命令、fixture互斥、Redis依赖和真实/桩界限。
- 明确现有capabilities测试不覆盖新增存储/worker面板，transcription会实际跑ASR；避免恢复后误跑全套、重复音频推理或把搜索桩当真实联网证据。记账场景实际为accounting.spec.mjs。
- 没有运行测试或模型，也未新增镜像用例。本轮完成恢复入口核对，必要网页/API/队列验收仍需允许本地监听的执行环境；整体未完成。

### 2026-10-08 · 连续阻塞收口

- 同一本地监听限制连续三个goal轮次影响剩余必需联验；最后一次Node回环临时端口探针仍返回listen=false/code=EPERM。无已确认正在运行的测试句柄可等待，未重启应用/队列或绕过权限。
- 需求/实现对照、近期已证实缺陷修复及最小恢复命令已完成记录。当前不能以重复文档整理、桩或构建代替网页/API/队列与真实服务验收，暂无可继续关闭必需门槛的独立动作。
- 将goal标为blocked，不是complete或用户请求暂停；十模块范围及21号未完成关卡保持不变。需要允许本地服务监听的项目执行环境后继续，不要求公网部署、手机测试或替换线上库。新环境从21号剩余关卡接续，不重跑无关全套。

### 2026-10-08 · 恢复执行：本地监听与SUP录音证据网页通过

- 用户恢复后环境权限已变化，Node回环临时端口探针listen=true；Redis6381实际PING返回PONG。旧EPERM作为历史保留，不再作为当前阻塞。
- 执行21号最小命令SHIGUANG_E2E_SUP_AUDIO=1 ... supervision-audio.spec.ts --project=desktop，1项通过（总14.6秒、场景2.5秒）。真实网页/API/SQLite，存量转写fixture与HTTP模型桩：证据选择→检查→人工确认→复盘→转写修订→旧建议/来源失效提示，完成历史仍保留，两次模拟模型调用次数符合预期。
- 未调用真实ASR/生成服务、不修改在线数据/手机/E盘原件；测试报告/tmp/shiguang-sup-audio-report，结果/tmp/shiguang-sup-audio-results。该场景不证明录制或语音质量，仅关闭SUP此项网页缺证。
- 开始第二个此前受阻的research-web单场景，使用隔离SQL/队列及模型/网页桩；结果待续记。全模块目标保持进行中。

## 2026-10-08 恢复后的调研网页联验

单条 desktop 调研网页用例通过（21.4秒，用例9.2秒）。第一次执行停在过期的“关键问题”标签，改为匹配当前标签前缀后通过；没有放宽业务断言。真实网页/API/SQLite/Redis队列与调研编排，搜索、抓取和模型使用fixture，未调用付费接口。

覆盖搜索价格复核期限、持久化、密钥变更失效、人工确认计划、搜索摘要/网页文字区分与来源链接、重试生成第二版且原报告不变。累计保守费用断言51000→101500微元。结果在 `/tmp/shiguang-research-report` 与 `/tmp/shiguang-research-results`。此证据关闭该网页交互缺项，不证明真实Brave来源质量、供应商实际扣款或整个RES验收完成。

## 2026-10-08 记账当前网页主流程

`tests/e2e/accounting.spec.mjs --project=desktop` 两项通过（18.5秒，用例3.1/2.2秒）；真实API、SQLite、浏览器，隔离临时库，未调用AI。第一项含服务端已提交但浏览器丢响应、同操作重试只产生一笔、编辑、筛选、删除。第二项含合成微信格式Excel原件字节一致、逐行人工选择分类、关窗刷新草稿保留、核对前后均未入账、最终人工确认、列表及年度统计一致。更新了过时的旧导入界面测试，没有把手工分类称为AI分类验证。

报告 `/tmp/shiguang-accounting-report`，产物 `/tmp/shiguang-accounting-results`。真实平台文件变体、AI分类/截图OCR、小九账单检查仍按原范围保留待验收；两项不能替代全部Case 1–7。

联验同时发现正式file-worker使用BullMQ旧版Queue/Worker.client接口，当前6.3.9不存在，导致进程崩溃重启。已改为getBackend().client，并将worker阻塞连接纳入就绪判断，防止消费阻塞连接断开时误报就绪。修复后本轮网页运行未再出现该崩溃；独立进程与Redis断线恢复专项另行记录，不把未报错当作已证明恢复。

## 2026-10-08 worker 实际进程恢复验证

修复BullMQ 6接口后，以独立临时DATA_DIR和临时端口Redis启动正式file-worker，观察真实IPC，顺序得到 ready（queueReady=true/error=false）→停止隔离Redis后disconnected（queueReady=false）→重启同一隔离Redis后recovered（queueReady=true/error=false）。脚本退出时关闭自建worker/Redis，未停止用户现有6381服务。

实际产物 `/tmp/shiguang-worker-lifecycle-wcONie/result.json`。可复用入口 `node scripts/check-worker-lifecycle.mjs`（仅必要时运行）；本次未为保存入口再重复执行。此项证明正式worker连接状态与恢复，未覆盖设置面板渲染、失败业务任务回源或所有AI日志入口。

## 2026-10-08 设置面板与开发服务器实测

`tests/e2e/settings-runtime.spec.ts --project=desktop` 单场景通过（21.9秒，用例8.7秒）。隔离临时数据库，实际API、磁盘状态、正式worker与Redis连接：存储面板显示真实DATA_DIR和磁盘空间；模拟单次503后保留旧结果并明确标记，刷新恢复清除错误；worker实际达到ready，经面板刷新显示，单次503和恢复同样正确。没有调用模型或重复ASR测试。报告 `/tmp/shiguang-settings-report`，结果 `/tmp/shiguang-settings-results`。

当前vite.config.ts启动临时回环开发服务，HTTP访问 `/.data/shiguang.sqlite`、`/server/provider.local.mjs`、`/.local-runtime/redis/etc/redis/redis.conf`、`/@fs/mnt/d/OpenResource/PersonalAgent/.data/shiguang.sqlite` 均403，首页200；没有打印或导出私有正文。结果 `/tmp/shiguang-vite-private-paths.json`。初次沙箱禁止大写路径下Vite配置临时文件写入，经工具批准后执行成功；测试服务已关闭，没有公网绑定。

此证据关闭新增存储/worker面板及上述开发私有路径的缺证；各业务AI日志完整度、真实外部服务及其他模块关卡继续按各自范围验收。

## 2026-10-08 来源引用满额网页联验

`tests/e2e/source-reference-limit.spec.ts --project=desktop` 1项通过（19.0秒，用例6.8秒）。真实API/SQLite、未配置模型的本地摘录模式，固定要事会话已有五条其他引用时：从要事点击“与搭子讨论”进入原会话，未腾位置前发送会返回选择框且不新增轮次；用户移除指定引用后自动加入本次要事，保留另四条；发送后第二轮仍属于原threadId，再次从要事进入不重复创建会话，两轮历史保留。

报告 `/tmp/shiguang-source-limit-report`，结果 `/tmp/shiguang-source-limit-results`。关闭CHAT-V14满额替换交互缺证，不将本地摘录当真实模型代词理解；A01与A03真实回答抽样仍待完成。

另核对既有 `artifacts/context-summary-check.json`（2026-09-28T21:01:04.316Z）和当前context-compression-v2：16529字助手内容按结构化角色分段，真实摘要保留100元、拒绝订阅、周五晚八点、尚未开始、禁止代执行，并将助手建议标为未接受。本轮直接阅读正文而非只看checks布尔值，未重复调用模型。这是单条真实摘要约束保真证据；不证明所有真实话题准确，也不单独覆盖A02的历史分页/摘要失败补偿。

## 2026-10-08 调研网页接力与人工转行动

`SHIGUANG_E2E_RESEARCH=1 ... tests/e2e/research.spec.ts --project=desktop` 单场景通过（19.4秒，用例7.4秒）。当前实际网页/API/SQLite/Redis/LangGraph，模型使用fixture；未请求真实搜索或付费模型。

核实：失效引用拒绝且保留输入；创建提交丢响应后刷新恢复仅一个任务；先确认计划才生成报告；可编辑网页简报，等待阶段不计时；非法回填URL保留正文；回填丢响应后同操作恢复仅一个外部来源和新版报告；长回填末尾可完整回看、旧版不混入新来源；用户明确选择才生成行动草稿或要事，等级必须手选，行动不自动开始；候选保存丢响应不重复创建，任务可跳回来源报告。保守费用500→1000→1500微元断言通过，不冒充供应商账单。

报告 `/tmp/shiguang-research-relay-report`，结果 `/tmp/shiguang-research-relay-results`。关闭上述接力与候选交互缺证；真实联网、真实模型质量及从搭子传入长问题/草稿清理仍分别核实，不扩大该用例结论。

## 2026-10-08 搭子长问题转调研与草稿清理

`research-draft-context.spec.ts --project=desktop` 1项通过（18.2秒，用例6.1秒），真实网页/API/隔离SQLite/队列，规划模型为fixture。通过搭子实际按钮转任务，超过500字的问题完整进入背景；请求保留threadId、笔记ID/版本与全文。人工填写短主题/关键问题后生成待确认计划，尚未开始调研。关闭后背景、约束、时效、引用及来源话题清空，第二次创建请求无旧threadId或引用。

第一次测试的精确label查询未识别预填textarea，按实际可访问textbox名称定位后通过，未修改产品或放宽正文相等断言。结果 `/tmp/shiguang-research-draft-results`，报告 `/tmp/shiguang-research-draft-report`。结合既有research-thread-context后端快照证据，关闭CHAT-A04调研分支长问题及草稿清理缺证；普通任务分支和真实回答质量不据此扩大结论。

## 2026-10-08 记录原文、Markdown与图片操作

仅选择现有resilience网页用例中的structured note、record Markdown、paste an image三项，desktop 3/3通过（总21.1秒），未跑整个文件或移动端。真实网页和API证明：Ozon多级编号文本保存重开仍逐字保留换行，原文/Markdown可切换；Markdown标题、列表、强调、表格正常渲染；合成剪贴板图片可粘贴保存、复制、剪切后再粘贴保存，刷新仍显示附件。

结果 `/tmp/shiguang-record-format-results`，报告 `/tmp/shiguang-record-format-report`。这不证明所有浏览器系统剪贴板权限或刷新前未上传图片恢复；多图AI读取与真实视觉仍单列。关闭REC-A01/A02对应基础排版及单图复制剪切粘贴缺证，不声称完整输入/AI闭环通过。

## 2026-10-08 项目要事图片与固定讨论入口

仅执行projects.spec.ts新增的project event images场景，desktop 1/1通过（15.2秒，用例2.8秒）。实际API/SQLite：图片记录生成独立图片要事→关联项目→项目要事详情图片加载成功且下载字节等于原图→点击讨论关闭项目弹窗并进入既有会话；再次从项目进入threadId不变、旧轮次保留；记录和派生要事的threadId不同。结果 `/tmp/shiguang-project-event-results`，报告 `/tmp/shiguang-project-event-report`。未配置模型，证明入口和身份关联，不证明图片语义理解。

项目分组失败隔离/改名/候选记忆展示复用20号9月29日projects桌面记录；同名项目按ID隔离复用conversation-scope网页及categories后端记录，不因这次图片入口联验重跑全部项目场景。

## 2026-10-08 复用实际HTTP日志证据

读取已通过SUP网页场景生成的 `/tmp/shiguang-e2e-hwVN2y/logs/ai-interactions.jsonl`，两组模型request/response各自保持相同callId和requestId，endpoint分别为具体work-runs/:id/action与supervision/recap，method均POST。只提取关联元数据，未打印输入正文或凭据；未重新调用模型。

因此HTTP中间件→模型调用→响应日志的关联已由实际服务器配HTTP模型桩证明。后台BullMQ模型调用上下文仍只有核心定向证据，不能用这份HTTP日志替代；逐入口业务语义也不据此全部关单。

## 2026-10-08 搭子真实模型小样本

使用保存的deepseek-flash配置、隔离临时库与合成记录，在真实网页/API中续聊两种设为前一天的历史话题。产物 `artifacts/chat-context-live-20261008.json` 保存实际回答及来源，不含凭据。

- 篝火旅程回答准确保留137元、周五晚上八点、未确认不得订票。来源引文包含长文末尾4460–4787字符，不只读开头。
- 书架改造回答准确保留286元、周六上午十点、未确认不得购买。实际请求日志 `/tmp/shiguang-e2e-N5Th8R/logs/ai-interactions.jsonl` 的回答请求包含书架改造历史问句，不包含篝火旅程历史问句；记忆提炼请求没有混入历史。
- 两个回答都额外对比自动检索的另一个记录，明确说不能混用，未错误归属，但内容偏冗长。最初测试“来源只能一条/不能出现另一个金额”过严，A两次调用都因此失败；阅读完整正文后按事实归属人工接受，不声称原断言通过。B拆分后单条网页用例通过（18.3秒，用例5.1秒），没有再重复请求A。
- 本轮共三次实际回答尝试及相应记忆提炼（A两次、B一次）；测试fixture显式开关才读取配置，正常套件跳过真实模型用例。退出清除临时库provider；早先已结束运行的配置亦清理。未更改在线模型设置或私人数据。

CHAT-A01/A03因此已有真实模型小样本证据，结合既有固定会话/历史分页证据使用；不是同一浏览器真正等待跨天，也不是所有长文/所有问题准确率保证。全文切片与当前版本定位沿用已有后端与网页展示核对。进一步质量提升不要靠反复跑这一相同样本。

## 2026-10-08 调研报告查看确认与小九六来源联验

发现实际缺口：调研完成进入review，小九提示等待核对，但页面此前只有取消调研，没有处理该报告提示的确认入口。现新增“我已查看本版报告”：保存报告ID、revision与时间，仅收起当前报告提示，不执行建议、不确认事实、不修改预算或active记忆。沿用researchRequest固定opId和服务端receipt；旧任务/报告版本冲突拒绝。即使来源后来变化，仍允许确认已查看历史报告，不以源数据校验困住用户。新版报告或报告正文改版与旧确认不匹配时重新提示。

production前端构建通过，当前产物index-0eLS2nXt.js（既有743KB提示保留）。首次编译暴露action类型漏项已补齐；正确大小写目录的临时构建写权限经工具批准后执行。报告ID沿用实际的taskId:research:version结构，不错误限制为UUID。

`SHIGUANG_E2E_PET_SOURCES=1 ... pet-source-integration.spec.ts --project=desktop` 1项通过（17.7秒，用例4.4秒）。日期固定2026-10-15上海中午，真实API/SQLite/Redis/调研图，模型为fixture：要事、今日待办、候选记忆、监督、调研计划、月中账单检查六类同时展示；hover和回源查看不改变确认；账单人工确认后提示消失且历史保留；调研计划确认后更新为报告提示；报告人工查看确认后收起，另四类ID保持；网页接力生成新版重新提示，以旧报告ID配最新task revision提交仍409。

初次用例预期报告生成后提示消失不成立，实际暴露上述无确认入口问题；修复后按计划→报告→查看确认→新版的真实生命周期断言。结果 `/tmp/shiguang-pet-sources-results`，报告 `/tmp/shiguang-pet-sources-report`。测试时钟及模拟模型不证明真实搜索或长期自然运行；只关闭新增提醒接入及确认闭环缺项。未重启用户在线服务、未改手机/E盘。

## 2026-10-08 记忆来源人工复核网页

memory-source-review.spec.ts 单项desktop通过（17.3秒，用例2.7秒）。真实API/隔离SQLite，无模型调用：原来源改变使候选显示失效；编辑中展示最新来源正文和版本；核对后来源再次改变则保存拒绝且草稿保留；重新读取会撤销旧勾选，显式重新核对后保存到新来源版本，但仍是candidate，未绕过后续冲突检查/启用。

报告 `/tmp/shiguang-memory-source-report`，产物 `/tmp/shiguang-memory-source-results`。事件/文件/对话来源的后端同源身份与版本校验复用memory-source-review既有专项，不把本次note网页场景称为所有来源页面都已实测。

## 2026-10-08 成果真实记忆取材及历史依据

Qdrant6333与Qwen4320的实际health均200。artifact-live-memory网页单场景通过（17.5秒，用例4.4秒），使用独立临时数据库、独立Qdrant集合、真实qwen3-embedding-0.6b及deepseek-flash。已确认且适用周报的记忆被混合检索采用，暂停记忆未采用；网页可展开生成时的正文、用途和版本。来源正文更新后原记忆转candidate并显示来源失效，保存的成果及记忆快照不被改写，刷新重开仍可核对。

已阅读实际周报正文：先写结论，字段表设计明确已完成，自动备份明确尚未开始且下周讨论须人工确认；没有把计划改写为完成事实。原始产物 `artifacts/artifact-memory-live-20261008.json`，报告 `/tmp/shiguang-artifact-live-report`，结果 `/tmp/shiguang-artifact-live-results`。仅合成资料小样本，不是全部写作质量保证。

首次运行实际生成成功但测试等待错误API路径超时，网络记录确认POST /api/tasks返回201；修正等待路径后上述完整流程通过。本轮实际生成两次，不隐去失败记录。finally删除测试集合后，仍存活的自动索引器曾重建空集合；已在测试服务退出后，按两份合成数据库的索引键确认所有权，重新删除本轮两个集合，逐个GET均404。今后此专项应在服务退出后清理集合，不能只相信finally删除返回200。配置在fixture退出时移除，未修改在线库或正式索引。

## 2026-10-08 网页录音到真实归纳及队列日志

`SHIGUANG_E2E_AUDIO_LIVE=1 ... audio-live-flow.spec.ts --project=desktop` 单项通过（51.8秒，用例38.5秒）。当前网页、实际API/Redis/BullMQ、本地Whisper及真实生成接口，隔离临时库。Chromium模拟麦克风播放已有公开英文音频，录制16秒并保存265101字节原件；本地转写可见，人工修订第一段及说话人后，AI归纳读取转写版本2，保留人工补充的周五晚八点和未完成状态。原始模型转写独立保留，归纳前后下载原件逐字节一致，网页显示读取范围。

实际正文与日志关联元数据保存在 `artifacts/audio-live-flow-20261008.json`；报告 `/tmp/shiguang-audio-live-report`，结果 `/tmp/shiguang-audio-live-results`。实际转写首句有错词，未声称识别准确率通过；人工补充为合成内容。本场景关闭REC-10/A09完整网页录制→转写→核对→总结的交互缺证，不替代物理麦克风、局域网安全上下文、中文或长录音质量验收。只执行一次，未重跑完整套件，未修改产品源码或重新构建。

同次真实worker日志 `/tmp/shiguang-e2e-LpXjOb/logs/ai-interactions.jsonl`：ASR请求/响应具有同一jobId、jobKind=transcribe-audio、entityId、revision和attempt；真实分类模型请求/响应共享callId及classify-note任务上下文；归纳请求/响应共享callId、requestId、POST endpoint和sourceId。证明实际队列→模型→日志的关联，不把这些入口扩大为全部业务入口已逐一验收。在线库和手机/E盘未改动。

## 2026-10-08 搭子到普通任务的来源恢复

`SHIGUANG_E2E_SUP_AUDIO=1 ... work-task-context.spec.ts --project=desktop` 单项通过（14.2秒，用例2.1秒）。复用禁用worker的隔离fixture，真实网页/API/SQLite，规划模型是本地HTTP替身，不调用真实服务或启动未确认的ACT执行。

通过搭子按钮携带话题和记录创建普通任务；来源在提交前改版后，接口明确拒绝且不调用规划模型，目标和完成要求保留；刷新材料显示旧版本提示，用户移除后重选新版可保存。捕获到实际模型请求具有新版片段、原话题预算约束和完成要求；保存为draft且无产物，详情能展开生成时来源/话题，仍需人工确认计划。成功后目标、来源话题及共享taskDraft清空。首次测试停在成功后已折叠的创建表单，改为先展开再检查后通过，未修改产品逻辑或放宽断言。

报告 `/tmp/shiguang-work-context-report`，结果 `/tmp/shiguang-work-context-results`。关闭CHAT-A04普通任务引用/背景/失效来源修正的网页缺证；不将模型替身称为真实规划质量，不扩展ACT独立场景。调研分支继续复用前次通过证据。

## 2026-10-08 图片要事保存断响应与弹窗焦点修复

实际网页联验发现：打开编辑弹窗后立即填写摘要，发出的保存请求却将文字追加到标题。检查Modal发现30ms延迟自动聚焦无条件执行，能够抢走已选择的输入焦点。已在共用Modal增加保护：弹窗不是最上层或焦点已在弹窗内时不再自动聚焦，默认候选跳过disabled输入/按钮。没有改变表单正文、图片或保存协议。

仅运行event-operation新增image event create场景，最终desktop 1/1通过（17.8秒，用例3.3秒）。真实网页/API/SQLite、合成PNG，无模型：从图片记录新建要事，服务端提交后模拟丢响应，刷新后同opId重试仍只有一条要事、同一套图片、相同revision；编辑摘要再次丢响应，刷新重试不再增加revision且图片未替换，下载字节与原件相同。发生日期2024-02-29保存重开、按日期搜索可见，且不因此创建提醒。摘要输入后跨过延迟聚焦时间仍保持焦点，标题未变。

首轮失败暴露上述输入错位；修复后的首次回归因精确label定位及暂停页面时钟停在测试操作，改用实际textbox名称并仅等待50ms聚焦窗口后通过，未减少保存/版本/字节断言。构建通过（index-Ur3jW3Uj.js，既有约743KB体积提示）；未跑完整套件、未重启用户在线服务。报告 `/tmp/shiguang-event-save-report`，结果 `/tmp/shiguang-event-save-results`。关闭EVT保存回执网页恢复与发生日期交互缺证，不代表真实图片模型理解或全部EVT完成。

## 2026-10-08 图文归纳与图片要事辅助编辑网页联验

仅运行 `note-images-summary.spec.ts` 的multi-image及既有 `events.spec.ts` 的AI editing an image event，desktop 2/2通过（27.9秒，用例11.0/3.5秒）。复用禁用后台分类的隔离fixture，实际网页/API/SQLite与HTTP模拟模型；没有真实视觉模型请求，不声称识图质量已验收。

- 文字类型笔记附两张合成PNG，归纳模型请求实际含完整正文和两个图片data URL，使用独立vision配置。首次等待模型时更新来源，旧结果被拒绝且页面有错误；重试读取新版正文，保存summaryInputs中的图片ID、文件名和sourceRevision，页面显示2张及各文件名。第三次模型返回空内容时错误可见，旧成功摘要和revision不变，原附件保持。
- 图片要事辅助编辑期间改源会明确拒绝、保留原草稿；再次辅助编辑后自身关联、重复和越界建议各有说明，有效关联保持选中，人工保存成功。删除源记录后要事图片副本仍能下载且字节一致，要事仍可编辑。这复用了既有回归用例，没有新增重复的辅助编辑测试。

报告 `/tmp/shiguang-image-flow-report`，结果 `/tmp/shiguang-image-flow-results`。关闭REC-V12/V13图文读取范围/失败保留交互及EVT-A01/V01/V12草稿保存联验缺证；真实图像理解、账单OCR仍取决于可用视觉服务。当前产品构建未变化，沿用index-Ur3jW3Uj.js，不为新增测试重复构建；手机和E盘未改。

## 2026-10-08 原文 Case 1–7 网页证据补齐

仅新增并执行income validation单场景，desktop 1/1通过（16.8秒，用例3.6秒），隔离API/SQLite，未调用AI。API准备三笔对照支出；网页填写工资收入，负金额-100被拒绝、金额/备注保留且未入库；改为5000后成功，全部日期收入5000、支出65.50、差额4934.50，刷新仍一致。切换“本月+支出+美食”仅35.50的一笔匹配，旧月份、其他分类与收入均排除；编辑为40保持原ID和总记录数、筛选差额变为-40；人工确认删除后当前列表和三项筛选统计均为0。

首次测试在登录未完成时请求准备数据收到401；加入已登录页面等待。第二次测试误把默认本月统计当全部日期，实际45.50为正确本月支出；修正为明确选择全部日期后通过。没有改产品逻辑、放宽金额断言或重跑此前Excel/保存重试用例。报告 `/tmp/shiguang-accounting-cases-report`，结果 `/tmp/shiguang-accounting-cases-results`。

| 原文场景 | 可复用的当前证据 |
| --- | --- |
| Case 1 新增支出 | 10月8日前次ledger page网页保存35.50且列表/支出更新；本次对照账核实支出与差额。 |
| Case 2 新增收入 | 本次通过网页保存工资5000并核对收入、差额。 |
| Case 3 非法金额 | 本次-100报错、输入保留、数据库条数不变。 |
| Case 4 编辑 | 前次网页编辑；本次确认原ID/总条数与筛选统计同步。 |
| Case 5 删除 | 前次人工确认删除；本次补齐删除后列表及收入/支出/差额一致归零。 |
| Case 6 筛选 | 本次本月+支出+美食组合，三个不匹配来源均不显示，统计同范围。 |
| Case 7 刷新 | 本次已保存收入刷新后仍显示、金额一致；前次Excel待确认草稿刷新另有证据。 |

场景中的日期使用执行时上海当天来验证“本月”；分类使用用户前文固定集合“美食”，不把示例中的“餐饮”擅自新增为分类。Case 1–7的上述行为证据已补齐，不代表记账全部功能验收完成：真实截图OCR、真实分类建议、多表导入网页及新增排名展开/预算页面仍需各自证据。基础CRUD、默认统计、Excel单表和小九月中提醒不再重复运行。

## 2026-10-08 生活费预算与完整排名网页验收

只运行accounting.spec.mjs新增living budget excludes场景，desktop 1/1通过（16.8秒，用例3.6秒），真实API/SQLite/网页，隔离合成账本、无AI。准备11笔本月支出及1笔历史支出：本月美食36、日用20、花呗30合计86，交通100和历史消费5000不扣本月生活费；默认预算2000剩1914。单笔排名初始10/11，继续查看后11/11且从100降至1；切历史月份只显示该月消费，切回本月分页重置10条，生活费仍按本月计算。类别排名四类，美食合计36正确。

网页预算改3000后剩2914，刷新保留；负预算-1报错且输入/原3000预算保留，改50后正确显示超支-36。没有重跑CRUD、金额单元测试、Excel或小九提醒。报告 `/tmp/shiguang-budget-ranking-report`，结果 `/tmp/shiguang-budget-ranking-results`；产品代码未改，构建沿用index-Ur3jW3Uj.js。

## 2026-10-08 多工作表与真实AI分类网页闭环

`SHIGUANG_E2E_ACCOUNTING_LIVE=1 ... accounting-live.spec.mjs --project=desktop` 单项一次通过（54.4秒，用例40.3秒）。复用显式授权的保存文本模型配置，隔离临时数据库且关闭不需要的worker，只上传合成的两表XLSX，未使用私人账单或真实视觉服务。

“餐费表”和“工资表”均保留第2行，rowId分别sheet-1-row-2/sheet-2-row-2；下载原件3707字节与上传文件一致。deepseek-flash真实输出分别为美食、工资；现实现按支出/收入分组，因此共调用2次（18029ms及19887ms，总用量304 tokens），不是重试或两次测试。建议返回时本行决定仍pending、0笔账；人工应用分类后仍0笔，核对页仍0笔，最后人工确认后才得到3550分支出和500000分收入，来源批次/行各自保留，页面差额4964.50由程序统计。

已阅读实际返回JSON，分类符合两个明确的合成描述。证据 `artifacts/accounting-classification-live-20261008.json` 含结果和日志关联元数据，不含凭据；原日志 `/tmp/shiguang-e2e-r3qoKR/logs/ai-interactions.jsonl` 的两组请求/响应共用分类HTTP requestId和endpoint，各有独立callId。配置仅加载到临时库，fixture退出清除；未改在线设置。报告 `/tmp/shiguang-accounting-live-report`，结果 `/tmp/shiguang-accounting-live-results`。

关闭多工作表网页识别/核对与真实分类建议→应用→最终确认的缺证，不据两条明确描述保证所有分类准确。真实平台导出变体仍未给样本，账单OCR仍需视觉服务；此前跨页建议/重复核对/退款花呗规则等有效确定性证据继续复用。未修改产品代码、重复构建或操作手机/E盘。

## 2026-10-08 局域网HTTP录音提示与随机ID兼容修复

静态核对发现11个网页组件直接使用crypto.randomUUID，局域网HTTP非安全上下文中该方法不存在，会影响ImportFile/NoteEditor/ClassificationStatus、搭子、项目、分类、监督等组件。新增src/randomId.ts：有原生randomUUID时沿用，否则用crypto.getRandomValues生成符合版本/variant位的UUID。所有src组件直接调用统一替换；既有getRandomValues操作ID保持原样，不改服务端ID/回执协议，mobile未触碰。没有用Math.random降级，也没有绕过麦克风权限。

构建通过（index-C09Ja2dF.js，约743KB体积提示保留）。`SHIGUANG_E2E_SUP_AUDIO=1 ... lan-http.spec.ts --project=desktop` 单场景最终通过（14.4秒，用例2.4秒）：使用实际私网网卡10.161.147.235及隔离测试端口4432访问，未用localhost或伪造window.isSecureContext。浏览器实际isSecureContext=false、randomUUID=undefined；麦克风入口正确提示HTTPS/本机localhost及导入替代路径；通过网页上传已有公开WAV、音频播放器/转写入口可见，再编辑保存文字成功，无pageerror。没有开始ASR或调用模型、没有新增公网映射。

首轮上述业务已成功，测试最后查询原文类名而页面为Markdown视图导致失败；改为显式切换原文排版后通过，未隐藏业务错误。报告 `/tmp/shiguang-lan-http-report`，结果 `/tmp/shiguang-lan-http-results`。该IP/端口仅为本次隔离服务，不作为线上部署地址；未重启在线服务。关闭REC-P07实际HTTP录音安全上下文及可用导入替代路径缺证；不声明HTTP可直接麦克风录制。

## 2026-10-08 剩余项去重与正式服务差异

按RET/RES/SUP/PET/MEM/CHAT各对照前表和后续实际证据清理过期“待验收”，21号第6节改为具体剩余队列，不重跑已完成流程。只读检查：API4317及首页200、served和disk均index-C09Ja2dF.js，Qdrant6333/Qwen4320 health200；演示登录读取在线设置确认Brave hasKey=false，随后退出。正式/settings/worker返回404，而当前源码存在该路由，标记后端交付版本未对齐为优先事项。独立视觉设置未保存，默认文本回退是否支持图片未证明。产物artifacts/runtime-handoff-20261008.json不含凭据。本轮未测试、调用模型、改业务数据或重启服务，未将模块整体标完成。

## 2026-10-08 正式服务版本缺口关闭

正式4317后端已在一致性备份后保留原环境完成更新；本次复查health、worker、storage接口均200，worker ready且queueReady=true。误用/storage/status导致的404已纠正为/settings/storage。证据 artifacts/backend-refresh-20261008.json；21号剩余队列与22号运行说明同步纠正，避免重复重启及重复已通过的面板/Redis恢复测试。未调用模型，不动手机及E盘原件。

## 2026-10-08 来源分页与转写编辑保护

`tests/e2e/remaining-input-boundaries.spec.ts` 使用隔离SQLite、真实网页/API和已保存的合成转写，不调用模型/ASR。

- 101条合成记录：初次显示100条，查看更多后101条；选择原先未显示的资料后，搜索及切换要事/记录类型保持选择，完成引用后显示在搭子输入区。单项通过5.8秒，结果 `/tmp/shiguang-input-boundaries-results`。
- 转写：模拟轮询503显示刷新失败但保留输入，恢复后清除刷新错误；另一窗口实际保存新转写，当前人工草稿仍保留；尝试提交旧版本被拒绝，服务端新正文不变、localStorage草稿仍完整；主动放弃后显示服务端新版本。单项通过5.1秒、整体18.1秒，报告 `/tmp/shiguang-transcript-poll-report`，结果 `/tmp/shiguang-transcript-poll-results`。

首次转写用例未通过，因为旧fixture没有音频附件，产品按附件类型不显示转写面板；已为隔离fixture补充真实四秒静音WAV与附件元数据，仅重跑该失败用例，未重复已通过分页用例。这里的存量文字为合成转写，不把静音原件当作真实识别质量证据。产品源码/构建未改变，不需要重启正式服务。

## 2026-10-08 转写修订与真实混合索引衔接

仅执行 `SHIGUANG_CHECK_TRANSCRIPT_RETRIEVAL=1 node scripts/check-transcript-retrieval.mjs` 一次。使用当前已配置的本地Qwen3-Embedding-0.6B/Qdrant、隔离SQLite和随机前缀集合，单条合成录音来源，不启动后台indexer、不修改正式索引、不调用ASR或文本生成。

实际旧命中revision=1、字符0–92，正文含32元/周五/说话人1；来源修订后outbox记录revision=2，重建前旧向量即被SQLite版本复核排除，调研validateRetrievedEvidence同时拒绝旧引用。indexPending完成后outbox清除，新命中revision=2、字符0–95，正文含86元/周六/说话人2；片段严格等于sourceReading派生阅读文本的对应切片，原始人工附记及识别可能有误提示保留。Qdrant库存只剩新版点。

产物 `artifacts/transcript-retrieval-live-20261008.json` 保存前后实际内容与位置；临时集合删除后GET返回404。没有长录音/语义质量泛化结论，不重复全库评测。脚本仅显式开关允许运行，并限制为本机服务。搭子conversation-source-excerpt、调研research-retrieval直接复用sourceReading；成果engine先用noteReadableText派生正文，artifact-context将位置标为transcriptContent，与此索引文本契约一致。前次REC人工转写/真实总结及MEM成果取材证据继续复用。

## 2026-10-08 高等级真实复核、同到期与归档依据

`SHIGUANG_E2E_EVENT_LIVE=1 ... event-live-review.spec.ts --project=desktop` 使用隔离库、合成资料和已保存的deepseek-flash。普通/高等级约定同一到期时间，直接调用正式event-check处理器生成并提交结果（本次不重复测Redis运输）；仅高等级调用模型一次，两个提醒均保持open并同时出现在小九提示表，普通等级没有AI建议。

模型实际指出180+80=260超过200预算、场地尚未预订却拟登记已预订、没有预算确认及付款证据，需要用户确认。网页执行改期，随后更新来源，再刷新打开历史，旧建议和当时来源revision=1均保留，明确是历史结果，不混入新版300元。

首轮网页通过但人工阅读发现模型把约定复核时间称为截止时间；已修正server/events.mjs提示词，明确dueAt不表示完成截止/逾期/作废。由于实际提示词变更，只重复这一小场景一次：17.4秒（网页2.3秒）通过，真实回复已准确区分复核与截止。两轮总共2次真实生成，普通等级均无调用，不重复ASR或其他要事用例。首次与修正后的原始输出分别保存在 artifacts/event-review-live-20261008.json、artifacts/event-review-live-v2-20261008.json。

当前最终报告 /tmp/shiguang-event-live-report-v2，结果 /tmp/shiguang-event-live-results-v2。关闭EVT-A02同到期网页、A04归档依据、A05真实建议小样本缺证；不宣称所有建议质量或视觉已通过。正式4317尚未重载这次服务端提示词，交付时统一更新，无前端构建变化。

## 2026-10-08 比较/可行性真实报告与输出契约修正

沿用scripts/research/evaluate-flow.mjs，增加显式comparison/feasibility合成场景参数；仍只读保存的模型配置、使用隔离SQLite/图和模拟人工确认，拒绝覆盖既有结果，结束移除临时provider配置。没有用户资料、Brave搜索或浏览器/队列运输的额外重测。

真实调用暴露两项缺口并修正：比较报告候选遗漏kind；可行性规划返回12步而schema只允许8步。未推测或补写候选类型，未放宽上限；research-graph提示词补齐必填字段及数量/长度约束，并要求需要表格时实际输出Markdown表格。research-contract改用仅含已知中文字段名和数组位置的安全错误，例如“候选事项 / 第1项 / 候选类型”，不再返回无法定位的“字段.字段.字段”。未知键和值不暴露。定向research-output-errors单项通过。

修正后比较报告：费用、时间、隐私按相同维度比较；0元订阅预算排除30元/月方案，未证实的离线能力保留未知，不假装实际使用或联网核验。该次输出主要为同维度段落，所谓比较表仍是行内文本，已进一步明确表格提示要求，未因格式优化再重复该付费样本。

可行性修正后计划8步，实际报告正确计算1+3+1=5小时、2小时不足，保留不可并行/不可省略/未授权边界；建议缩小至备份并核对额外校验耗时，没有声称已执行。此轮实际包含Markdown比较表。正文仍偏冗长，并回显部分内部字段名；不把两个样本推广为全部报告质量保证。

证据：artifacts/research-comparison-live-20261008.json与research-feasibility-live-20261008.json保留两次失败；research-comparison-live-v2-20261008.json与research-feasibility-live-v2-20261008.json保存实际修正后计划、报告和保守用量预算。各失败仅在对应提示词修正后重试一次，没有自动循环修复或消耗完整预算。真实联网仍因Brave未配置而未验收，所有报告均明确使用材料/模型知识且未联网。

服务端提示词/错误文案尚未在正式4317重载，G08最终重载应一并包含events.mjs、research-graph.mjs、research-contract.mjs；不需要前端重建。

## 2026-10-08 AI入口与备份适用性审计

逐入口映射见[23号日志与备份核对](23-ai-log-and-backup-coverage.md)。复用实际HTTP/worker/模型日志与现有恢复专项，未重新运行全部AI入口或线上恢复。发现并修复调研schema失败缺少专门错误日志，以及embedding契约失败先记成功日志两项问题；两个具名替身测试通过，没有付费调用。新增research-jobs/retrieval日志修改需随最新提示词在最终交付时重载正式后端。

## 2026-10-08 已验证服务端修复正式生效

确认正式后台pending/running任务与运行中workTask均为0后，核对4317原进程身份，在内存保留完整环境，以相同Node、工作目录、启动参数及数据目录重启。未恢复/覆盖数据库，不重复构建前端。当前API健康200，worker ready且queueReady=true，存储接口200，deepseek-flash及已保存密钥状态保留。

已加载events.mjs检查时间语义、research-graph.mjs输出约束、research-contract.mjs安全字段错误、research-jobs.mjs校验失败日志、retrieval.mjs向量契约失败日志。产物 artifacts/backend-reload-verified-20261008.json记录启动时五份文件SHA256和实际运行状态；不保存进程环境或密钥。该证据替代前述“等待统一重载”的当前待办，不据此关闭真实搜索、视觉及其余验收。

## 2026-10-08 现有模型视觉能力与真实账单OCR网页闭环

此前没有独立visionProvider配置，不能据此断言视觉不可用。实际使用当前deepseek-flash文本配置作为视觉回退，对一张无私人信息的合成英文账单调用正式parseAccountingScreenshot：35.50元、2026-10-08、expense、Test Cafe及美食分类正确。证据 artifacts/vision-ocr-live-20261008.json。可复用脚本 scripts/check-vision-ocr.mjs需要显式SHIGUANG_CHECK_VISION=1，已有结果拒绝覆盖，隔离库结束移除凭据。

随后accounting-ocr-live网页完整走上传→识别→人工逐行核对→最终确认→入账与统计：原图下载字节与27358字节输入相等；识别和核对阶段交易均为0，最终确认后仅1笔3550分支出，统计一致，原图仍保持。最终desktop 1项通过14.8秒（用例2.8秒），报告 /tmp/shiguang-accounting-ocr-live-report-v2，结果 /tmp/shiguang-accounting-ocr-live-results-v2，实际交易快照 artifacts/accounting-ocr-live-20261008.json。

初次网页已识别正确但测试对select使用精确getByLabel未找到控件，改为实际combobox可访问名称后重跑此一项。总计探测1次、网页2次真实视觉调用；未自动反复识别或读取私人图片。隔离fixture也会读取已有独立视觉设置（若存在），结束清除provider/visionProvider；没有改线上配置、产品源码或重新构建。

关闭G05单张截图从原件到人工入账的真实闭环缺证，并证明当前回退模型对此样本有视觉能力。仍不证明模糊/中文账单、所有真实平台导出变体、记录/要事图文编辑全部质量；这些范围不能被单张清晰英文样本替代。

## 2026-10-08 真实中文/英文多图记录与要事辅助编辑

单次执行image-note-event-live.spec.ts，desktop通过23.8秒（用例11.5秒），真实deepseek-flash视觉回退共2次调用。使用合成中文工作坊草案与独立英文午餐收据，加上要求区分两图用途的中文正文，隔离库/真实网页与API，后台worker禁用，不触碰私人资料。

实际摘要准确读取图片中的200元预算、180元场地/80元交通、35.50元独立午餐及日期，明确场地未预订/未付款、活动未执行、账单不计入活动支出。两图读取范围记录完整。记录转为普通要事后，在编辑窗口实际调用AI，返回analyzedImages=2，summary正确分开活动与账单，relatedEventIds为空；保存前要事revision未变，点击确认保存后更新且仍为普通等级，两张副本下载字节与原图一致。不是通过正文直接给模型金额来冒充识图。

实际输出与保存快照：artifacts/image-note-event-live-20261008.json；图片样本tests/fixtures/synthetic-workshop.png、synthetic-receipt.png；报告 /tmp/shiguang-image-note-event-live-report，结果 /tmp/shiguang-image-note-event-live-results。人工阅读完整摘要和要事草稿未发现把未执行写成完成或混加金额。

此证据关闭REC/EVT图文真实模型小样本缺证，与此前图文范围/失效来源/自关联过滤/副本保存专项共同使用。不推广为所有模糊、手写或密集表格都准确；不追加未约定的图像质量压力测试。产品源码和构建没有变化，不需重启正式服务。

2026-10-08：录音按原需求与既有原始JSON复核，未运行ASR。中英文文字/时间/分离输出及录制→修订→总结已有证据；中文错词/4人拆5编号仍明确保留，用户人工校对质量边界尚待答复。证据 artifacts/audio-evidence-review-20261008.json。ASR运行说明已改为实际默认turbo并删除过期“未接入”说明，未缩小既有范围。

## 2026-10-08 搭子简报与删除迟到响应

chat-late-actions.spec.ts desktop单项一次通过13.8秒（用例1.6秒）。隔离真实API/SQLite，本地摘录模式创建两个独立会话，简报响应使用受控替身、不调用模型：甲的简报请求延迟时切到乙并输入，旧简报返回不打开弹窗、不覆盖乙输入；实际删除甲提交成功但延迟返回期间切到乙，回包后甲消失、乙仍选中且输入完整，后端甲轮次已删、乙仍在。

报告 /tmp/shiguang-chat-late-actions-report，结果 /tmp/shiguang-chat-late-actions-results。结合原send-retry/context-switch及近期满额引用/101条来源选择证据，关闭近期简报/删除视图epoch变更的网页缺证。不声称真实联网或新增模型质量验证；产品源码与构建未变化。

### 2026-10-08 · 交付状态纠偏与SUP/PET证据收口

本次继续执行读取4317健康接口为ok。读取正式重载、真实多图要事编辑及真实账单OCR产物，纠正21号首页仍称worker路由404、缺视觉服务、相关样本待验证的旧描述；保留中文ASR质量、真实Brave联网及G01总覆盖的未关闭状态。日志/恢复入口对照改为引用已完成的23号文档，不将其再次当作未开始工作。

核对监督job签名、显式重试回执、小九runId回源以及候选五轮规则、共享轮询epoch。既有真实Redis后端用例与网页接口桩分别证明队列去重和交互恢复；读取原网页结果文件为passed，未据此声称是一条全真实端到端用例。PET/SUP对照补入实际代码、产物和适用边界，删除已完成契约核对的泛化待办。

本次只修改交付文档，不增加模型调用、测试、构建或服务重启，不改手机端和E盘原件。总目标尚未完成，下一步收口其他原始编号与最新证据的对应关系，并保留真实联网配置及中文ASR质量决定所需的外部输入。

### 2026-10-08 · SET语音诊断页面最后一项缺证

补入capabilities单条网页用例，验证文本/转写成功与说话人分离失败互不覆盖、刷新保留结果、分离单独重试成功。初次status定位歧义修正为结果段落后，desktop 1项通过（14.0秒，用例2.0秒），实际产物 /tmp/shiguang-audio-diagnostics-results-v2。诊断HTTP结果用桩，没有ASR或模型调用；真实能力使用已有独立探测证据。未运行原视觉用例或完整套件，未改产品/构建/在线进程。

SET对照移除已关闭的逐入口日志和语音诊断网页泛化待办，保留其编号、证据与边界；23号纠正旧OCR未通过描述。总目标仍保留真实联网、中文ASR质量决定和其他原始编号覆盖收口，不据此宣布全部完成。

### 2026-10-08 资料库引用到当前搭子话题

核对RET-07/P03与CHAT引用衔接发现：资料库只在记录页有入口，搭子正在讨论时无法直接再选资料；旧libraryDiscussion只在挂载时读取，重复引用会整组覆盖。新增搭子“引用资料库”按钮；沿用全局资料库弹窗，并以library-discussion通知已挂载的搭子。引用按kind/id合并，同资料刷新revision；最多5条，满额使用既有待加入/移除流程，不暗中移除旧资料。保留当前thread和输入，空输入才填默认提问。不新增资料库文件固定会话的未确认产品规则。

App、Assistant、LibraryFiles、TaskLibrarySources完成衔接。网页定向 `library-discussion.spec.ts` desktop 1项通过（19.8秒，用例7.6秒）：记录页入口→搭子、同页再次选择、输入保留、重复项不增、5条满额→移除指定旧项→新项加入、入口消息消费清除。资料API用桩，真实浏览器/构建；不调用模型，不冒充实际语义检索或引用回答质量。

首轮用例停在搭子页面不存在“资料库”按钮，说明最初仅增加事件监听不足；补齐真实按钮后通过，未用脚本注入事件代替用户入口。最终类型检查/构建成功 `index-r4GVwf8d.js`，既有大包提示保留。报告 `/tmp/shiguang-library-discussion-report-v2`，结果 `/tmp/shiguang-library-discussion-results-v2`。无需重启后端，不改手机或E盘。

### 2026-10-08 · MEM原始编号证据收口

读取当前spec/plan、实际memory-live八项结果和对应状态/并发/期限/范围测试内容，复用已记录的执行结果及最新source-review、真实成果记忆网页证据。将MEM需求/步骤/验收表中的过期未核对和已关闭待办回填为对应范围已验证；细节与样本限制见memory-acceptance-audit.md新编号表。未新跑模型、测试或构建，不把MEM证据收口视为总goal完成。

### 2026-10-08 · EVT/SUP/PET人工确认链条编号收口

读取三模块验收条款、当前要事队列及监督确认/小九反馈调用点，复核实际event-review、recap-live、pet-live输出与对应测试断言及已执行记录。将三模块A编号的已证实范围回填到总表，保留模型桩/真实服务/样本质量边界；详情见三份模块对照文末。没有新增测试、模型请求、构建或线上状态修改。总goal仍未完成，RES真实联网及REC中文语音结论等未决项继续保留。

### 2026-10-08 REC-A02多图部分上传失败恢复

仅运行note-image-recovery.spec.ts，desktop 1项通过（17.3秒，用例4.0秒），实际API/SQLite/上传下载，第二张图片第一次请求注入503。新记录第一张导入成功后，第二张失败时两张仍可见、标题/正文保留；重试保存成功。随后剪切第一张、使用应用内剪贴板回贴并保存，刷新重开仍为同一条记录/两张附件；逐一下载与输入PNG字节相同，正文未变。

测试主动禁用系统剪贴板，明确验证既有应用内回退；不证明所有操作系统剪贴板权限。三次图片批量请求分别为失败、重试、剪切回贴，不是后台自动重试。报告 /tmp/shiguang-note-image-recovery-report，结果 /tmp/shiguang-note-image-recovery-results。本次只补REC-A02明确要求的多图/上传失败证据，没有模型调用、产品变更、构建或重启。

### 2026-10-08 · 24项过滤校验风险与TECH证据索引

读取14号完整风险及18号TECH条款，复核当前相关实现和测试断言，将24项从统一“未核对”转为具名实现/定向证据/边界索引。V08独立ACT明确范围外，不能误作为必需待开发；V06/V07供应商桩覆盖与真实Brave未验收分开。新增24号文档并保留TECH实际接入与真实计费的边界。本轮无测试、模型调用或运行配置变更；没有将风险索引编写等同产品全部验收。

### 2026-10-08 最终比较提示词真实样本

仅执行一次 `node scripts/research/evaluate-flow.mjs /mnt/d/openresource/personalagent/artifacts/research-comparison-final-20261008.json comparison`，复用已保存生成模型、隔离SQLite/LangGraph和合成约束；人工计划确认由脚本模拟，不调用Brave、不修改用户事项。原失败及v2样本保留未覆盖。

结果passed=true、单份报告。人工读取完整报告：实际Markdown表格按费用/时间/隐私并列A与B；B的30元/月与0元订阅预算冲突，离线能力保留未知；两方案均未实际使用，未将建议写成执行事实。Q1标answered，Q2因离线等信息未核实标partial；本地原文来源E1保留revision及0–109字符位置。明确说明未联网核验。正文仍偏长，部分风险基于通用模型知识，不能用这一合成比较证明市场信息正确。

累计执行14248ms；账本chargedMicros=28741且uncertainMicros=28741，这是保守占用，**不是供应商已核实扣款**。没有取得新材料的补查保留原报告，不自动重试模型。最终表格格式缺证关闭，不重跑学习/可行性或已有网页模板。日志 /tmp/shiguang-comparison-final.log，原始产物 artifacts/research-comparison-final-20261008.json。

真实Brave、公开网页时效冲突及账户费用仍待G04；脚本没有加载线上检索配置，其“自动语义取材未启用”仅描述隔离样本，不能误报正式Qwen/Qdrant不可用。产品源码/构建未变。

### 2026-10-08 · 剩余未核对项与技术栈状态纠偏

按状态列（而非正文中的“待确认”等业务词）核对，总表真正标“未核对”的只剩MEM六项附录/交叉引用。读取Qwen实际启用/回退产物、MEM真实样本与PET当前证据后补齐映射；TECH旧“尚未接索引/提醒/调研”也以当前实际接入和恢复证据更新。没有重跑迁移、队列或模型。

“进行中”不能统一改为全部通过：原表同时含需求、步骤、交叉引用和历史状态，当前证据见各模块对照与24号索引。接下来只处理实际仍欠的外部验收与明确缺证，不靠重复全文审计制造新工作；G04真实联网/账户费用、中文ASR质量决定仍保留。

## 2026-10-08 · PET需求与plan状态回填

逐项读取PET spec/plan、现有编号对照并复核当前提示快照、轮询旧响应保护及汇报入口，六来源网页产物仍为passed。将PET-01–11及P01–P05对应的25条覆盖行更新到已有证据；不再将已完成的六来源联验列为下一步。本轮health返回ok，未运行测试、构建或模型；RES真实联网与费用仍独立保留。

## 2026-10-08 · SET原始编号回填

完整读取设置spec/plan和23号入口/备份对照，核对当前备份及配置入口、既有隔离恢复用例覆盖范围；实际网页结果文件仍为passed。更新27条SET需求/步骤/验收编号到对应证据，P05保留真实Brave/账户费用缺证。未运行测试或模型，也没有恢复线上数据。

## 2026-10-08 · EVT/SUP需求与plan回填

读取两模块完整spec/plan和既有A编号证据映射，实际要事复核/图片保存恢复/监督录音网页结果仍为passed；将{'EVT': 23, 'SUP': 21}条需求与实施步骤从过期进行中改为对应范围已验证。未改产品、执行模型或重跑测试。正式/API/settings返回webSearch.hasKey=false、environmentManaged=false，真实Brave搜索仍受配置阻塞；未输出凭据。

## 2026-10-08 · CHAT/RET编号与剩余边界

完整读取两模块spec/plan，对照已执行网页、实际模型和检索产物及当前摘要/过滤代码，更新{'CHAT': 32, 'RET': 22}条编号。CHAT联网要求继续随G04保持部分验证。RET-06/A04/P01/P03中涉及完整接入恢复与链路的范围未据分散证据直接改为全部通过，下一步先确认既有测试是否已经覆盖衔接，缺证才补最小用例。本轮未调用模型、重算索引或运行测试。

## 2026-10-08 接入到索引的跨进程恢复

新增 `tests/library-pipeline-recovery.test.mjs`，单条 `node --test tests/library-pipeline-recovery.test.mjs` 最终通过，9.24秒（用例9.19秒）。临时来源/SQLite/实际文件复制与解析，三个独立Node进程依次验证：源暂不可读导致复制失败且等待解析；恢复测试源后显式重试得到同一来源副本，第二段embedding模拟503，第一段成功检查点保留且outbox未清；新进程读取失败状态，经正式单文件重试与迁移handler完成，只补剩余分段，不增加来源/副本/正文版本，完成后outbox才清除。拼接全部索引片段等于全文，原件/副本字节不变。

Embedding/Qdrant为跨进程持久的确定性替身，后台任务使用真实SQLite领取/提交与正式handler，未启动Redis运输，不把本用例称为真实向量服务恢复。实际worker/Redis恢复和真实Qwen版本更新分别复用SET及transcript-retrieval证据；无需再做整库或付费测试。

初次失败把prepareIndex的探测embedding算作正文，实际注入故障早于预期；增加诊断重跑仍失败，排除探测计数后第三次通过。产品源码未改，未构建/重启正式服务。删除的只有本用例创建的临时目录，未读写E盘原件。该证据补齐RET-A04/P01/06的复制失败到索引失败、跨进程续跑衔接，不扩大为所有故障与语义质量保证。

## 2026-10-08 REC原始编号与滚动证据

完整核对REC spec/plan、记录/成果/分类和音频现有证据；本轮仅运行现有scroll.spec.ts两个desktop用例，2/2通过（14.8秒，用例0.905/1.7秒）。隔离实际API/SQLite、本地整理模式：960×480桌面窗口侧栏能滚动到设置；成果创建/编辑保存80段长文后末尾标记可见，无横向溢出。不运行android项目、ASR或模型。测试去除固定“拾光”演示项目依赖并明确desktop宽度，没有产品修改或构建。产物 /tmp/shiguang-final-scroll-results，报告 /tmp/shiguang-final-scroll-report。

REC编号已对应各自证据；REC-10/P07/A09保留中文错词和4人分5编号的已知质量问题，不以英文流程通过代替中文质量结论，不新增未约定长录音压力测试。

## 2026-10-08 记账原文章节逐项回填

完整读取用户合并spec/plan和16号最新口径，核对金额/模型/原件/人工确认/统计及Case1–7。将29条具体功能与阶段行对应实际证据；未修改用户原文。真实分类、多表、单张OCR及预算/Case网页结果仍为passed，没有重跑。原文Phase10提到lint，而项目无lint命令/配置，明确保留此缺项，不冒充构建已执行lint。真实平台导出变体和模糊图仅为样本边界，不把提供私人文件新增为用户必须通过的门槛。

## 2026-10-08 记账lint入口落地

新增eslint.config.mjs和npm run lint（转到lint:accounting），检查src/Accounting*.tsx、src/accountingRequest.ts、server/accounting*.mjs及记账单元/网页测试。采用ESLint推荐错误规则和TypeScript推荐规则，零warning门槛；没有格式化规则、不扫描手机端或无关模块。锁定依赖版本见package-lock.json（ESLint 10.12.0、@eslint/js 10.0.1、typescript-eslint 8.71.1、globals 16.5.0）。配置依据 [typescript-eslint官方快速开始](https://typescript-eslint.io/getting-started/) 和 [ESLint配置文档](https://eslint.org/docs/latest/use/configure/configuration-files)。

初次lint发现两处未使用变量及文件名控制字符正则：删除未用allCategories、遍历表头别名改为Object.values；控制字符拒绝是有意安全校验，用单行规则例外注明理由，没有取消过滤。修改后npm run lint退出0，零错误/警告。没有改变运行时依赖或业务语义，无前端源码改变，不重建/重启或重复浏览器验收。

安装首次因目录权限失败，经工具批准后完成。最初选择ESLint9收到已停维护警告，随后改为10；最终配置使用10。该项补齐原文Phase10的lint缺项，typecheck/build与业务测试仍各取已有证据，不把本次lint称为全项目检查或测试执行。

## 2026-10-08 长文学习实测暴露并修复取材范围问题

新增evaluate-flow的long-learning合成样本，6952字符，末尾条件从6785开始。第一次真实调用完成报告，正确使用practice_lantern、73→91、18分钟和未执行条件；但不能判为A01通过：报告输入实际仅有0–2719字符（reportContext），末尾事实来自规划预览，补查无新材料却把正文来源范围重新渲染成0–6952，且丢失输入截断提示。首次“模型已经收到全文”的判断经reportContext核对撤回。原产物passed仅是状态机结束，不是语义验收结论。

修复：research-evidence不再把1000字以上中等长文打成一个会被报告字节上限截尾的证据，沿用现有按问题选段；research-context增加按已保存模型阅读范围还原证据；research-graph补查无新材料/额度不足沿用旧报告时保留实际范围和截断提示，提示词区分规划预览与当前证据。

定向执行research-context/evidence/supplement三文件，9项通过，6.08秒，日志 /tmp/shiguang-research-range-tests.log。新增用例证明中等中文长文后段进入实际报告输入、位置逐字相等、旧报告重新渲染不会扩大阅读范围。没有重跑浏览器或其他模块。

另一次仅提示词修改后的真实尝试未完成：规划请求max_tokens=1800，供应商返回completion_tokens=1801，预算保护取消任务，最终错误被显示为RESEARCH_CANCELLED。未放宽费用上界或自动循环请求。两个产物research-long-learning-20261008.json、research-long-learning-v2-20261008.json保留；前者不是A01通过，后者失败。后续需保留原始用量越界错误给用户，并在费用契约明确后验证最终长文报告；本轮修复后的服务端尚未重载到正式4317。G04及总goal未完成。

## 2026-10-08 用量越界错误保留

修复research-execution-clock：供应商用量越界后，completeResearch会取消预算并结算真实用量；原计时包装器结算后又预留处理时间，抛出RESEARCH_CANCELLED覆盖原始RESEARCH_USAGE_BOUND。现在已取消账本不再开启新计时段，已结算用量仍保留，后续付费调用仍拒绝。research-model错误显示输入/输出实际tokens和上限，便于定位1801/1800这类情况，不修改预算或供应商契约。

新增使用真实SQLite预算+实际计时包装器+模拟响应的回归：请求64、返回65输出tokens，保留原错误、560微元用量上界、零未结算预留、无第二次网络调用。research-model与research-execution-clock两文件12项通过（约0.66秒；加入具体计数文案后重跑约0.67秒），日志 /tmp/shiguang-research-bound-error.log。未调用付费模型。

静态核对researchTaskView/status把失败job.error映射到notice，ResearchTasks显示该notice；因此本修复保留的原始原因可沿现有链路显示，未声称新增浏览器测试通过。长文报告与真实Brave验收仍未完成。research-evidence/context/graph/execution-clock/model五文件等待正式后端统一重载，不需要前端构建；没有重启或修改手机/E盘。

2026-10-08：长文取材/报告范围和用量原始错误修复已在正式4317加载；worker/storage 200、worker ready、queueReady=true。证据 artifacts/backend-research-reload-20261008.json，详情见21号文末。此前等待重载项关闭，A01/G04未关闭。

## 2026-10-08 跨模块补充条款去除过期状态

47条共享引用已指向对应主模块/24号风险与技术栈证据，不把它们分别当新功能重做。PET统一提醒、CHAT固定会话、SUP/REC待办升级、分类纠错、Q04聚合、Q09候选期限及Qwen迁移保留各自范围；ASR中文质量和RES真实联网仍单列。没有改写目标spec或把共享引用一律宣称全部通过。

只读正式settings返回webSearch.provider=brave、hasKey=false、environmentManaged=false；没有读取或打印密钥，没有搜索付费请求。RET-P03原plan明确要求桌面扫描→检索→定位→引用同次流程，目前分别测试和后端恢复证据不能替代这一条，已改成具体待办。下一步只补该串联，不重复18/20语义评测或已通过边界用例。

2026-10-08：记账原文错误/空态/展示分页边界网页一次通过，17条汇总/测试行已对应具体子项证据；见accounting-acceptance-audit.md文末。未重新测试已有CRUD或真实AI。


## 2026-10-08：9.3协议治理首批实施

用户授权开始实施。已完成本地独立协议仓库/Submodule、152个接口新旧映射、首批公共类型与JSON形状校验、网页v1入口；6项接口回归、1项桌面网页冒烟及构建通过。57个操作已抽取本轮形状、92个复杂操作仍待完整抽取、3个已退役，协议远端已发布，Android接入未完成。本次没有恢复历史暂停goal。详细状态见[实施记录](26-contract-governance-implementation.md)。


## 2026-10-08：9.3复杂协议迁移完成（服务端/Web）

原92个legacy-owned操作已全部抽取，当前149个现行+3个退役；协议0.2.0，155个Schema。67处Web读取和49处具体写入按operationId消费生成类型；复杂页面传输类型改为共享引用。原业务Zod/事务/幂等/人工确认保留，新增原始路径与查询形状检查以及可选无正文响应诊断。10项真实HTTP定向测试通过，含监督升级、调研取消、Excel核对入账与新旧路径重复提交。详见[实施记录](26-contract-governance-implementation.md)。未启动Pi/Electron/skill/Android工作，未恢复暂停goal。

发布：协议仓库提交991d0aa与v0.2.0已推送；4317服务按原环境重启为PID184334，健康及协议版本0.2.0已确认。生产构建通过（保留原有包体积提示），桌面网页冒烟1项通过。

## 2026-10-08 · Pi与搭子续批

Pi 1.1.0 统一生成/图像适配及搭子只读循环、会话独立联网许可、持久预算和libraryFile固定会话已实现。停止记录不增加成功轮次；既有记忆需人工确认。20项定向服务端检查、1项隔离网页场景、构建及协议检查通过；未做真实付费压力测试、手机验证或打包。协议0.3.0为153个现行+3个退役操作、159个具名Schema。完整实现、价格支持边界及未覆盖项见[27](27-pi-agent-implementation.md)。本轮继续用户交互任务，没有恢复暂停的goal。


## 2026-10-09 · 桌面小九本机版

Windows Electron 主窗口、独立小九、托盘、快捷方式、默认自启及只显示小九已实现。复用原后台与数据；控制通道核验实例/路径，按执行来源收尾并保留共享后台。新增桌面与后台日志入口。模型范围仅 DeepSeek flash，不开发手机端。验证和未包含的发行能力见 [28](28-desktop-xiaojiu-implementation.md)。本项为用户直接授权实施，不代表恢复历史暂停的 goal。
