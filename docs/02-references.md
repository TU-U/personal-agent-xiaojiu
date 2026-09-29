# 同类产品与开源评估

检索日期：2026-09-22。依据为官方页面、官方仓库 README 及少量源码阅读；未安装实测，不以宣传数据代表本项目性能。下文“建议/评价”是本项目判断。分支链接会变化，正式引入依赖时需锁定版本与提交。

## 1. 产品参考

| 对象与来源 | 已核实的公开描述 | 适合借鉴 | 评价与边界 |
|---|---|---|---|
| [闪念贝壳官网](https://ideashell.com/index-cn.html)、[产品动态](https://ideashell.com/blog-cn.html) | 官网介绍跨手机、手表、电脑记录，以及记忆、Agent、内容产出；动态列有 2026-08-20 的 2.0 更新 | 记录→思考→行动的闭环，移动收集与电脑工作的分工 | 与愿景最接近；公开页面不揭示同步协议、记忆可信度策略或实际成功率，不能据此复制技术方案 |
| [mymind](https://mymind.com/)、[功能说明](https://access.mymind.com/pricing) | 集中保存笔记、图片和书签，提供自动标签、图片文字识别、摘要、智能分组 | 低负担收集、视觉化浏览、自动整理 | 适合参考入口体验；这里没有验证它能覆盖本项目的 Agent 执行闭环 |

注意：[闪念贝壳旧功能页](https://ideashell.cn/features/)仍有“即将推出”等描述，与新官网和更新日志口径不同。本设计优先参考新版定位，并保留“官方描述、未实测”的限定。

## 2. 开源与组件比较

| 项目 | 公开能力与证据 | 本项目评价 | 建议 |
|---|---|---|---|
| [Khoj](https://github.com/khoj-ai/khoj) | 自托管个人 AI，支持资料问答、搜索、自定义 Agent 与自动化；仓库标注 AGPL-3.0 | 最适合观察完整产品流程；直接改造会继承其技术栈与产品结构，手机原生体验仍需另评估 | 作为端到端参考，不默认整仓 fork |
| [Mem0](https://github.com/mem0ai/mem0) | 个人化记忆层；[源码](https://github.com/mem0ai/mem0/blob/main/mem0/memory/main.py)的 add 接口包含 user/agent/run 范围与时间、过期字段；[许可](https://github.com/mem0ai/mem0/blob/main/LICENSE)为 Apache-2.0 | 适合验证抽取与检索，不能代替原件管理、引用、同步和产品权限 | 保留适配接口，用评测决定是否接入 |
| [Letta](https://github.com/letta-ai/letta) | 官方仓库将当前实现指向 [letta-code](https://github.com/letta-ai/letta-code)，定位持续有状态 Agent | 值得研究长期上下文；当前入口已有变化，不能直接采用旧 MemGPT 教程搭建 | 概念参考，落地前单独核实新仓库 API 与许可 |
| [LangGraph](https://github.com/langchain-ai/langgraph) | 提供有状态工作流、持久执行和人工介入；README 标注 MIT | 有利于任务恢复与状态可见；本身不提供本项目的可信记忆规则 | 待任务 PoC 验证后作为编排候选 |
| [Docling](https://github.com/docling-project/docling) | 文档解析、OCR、结构化表示与导出；README 标注 MIT | 可减少格式适配工作；中文扫描件、复杂表格和页码映射仍需自己的样本测试 | 优先做解析 PoC；模型权重许可另核 |
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL 内向量搜索；官方说明可与全文检索组合 | 初期与业务数据同库，减少基础设施；中文关键词召回必须单独解决 | 推荐为首版向量存储候选 |

许可记录仅用于技术选型，不代表完成分发或商业使用审查。Khoj 的 AGPL-3.0 是直接复用决策的一项因素；在决定改造分发方式后再确认具体义务。

## 3. 实现层阅读结论

### Khoj：任务过程需要结构化保存

已阅读 [conversation/utils.py](https://github.com/khoj-ai/khoj/blob/master/src/khoj/processor/conversation/utils.py) 中的 `ResearchIteration`、`OperatorRun` 和历史构造逻辑：它们区分工具查询、上下文、结果与轨迹。这支持本项目把 TaskRun、ToolCall、Evidence 分开建模的思路。只阅读该局部代码，未审计整个任务系统。

### Mem0：记忆能力不能直接等同于可信事实库

当前 [README](https://github.com/mem0ai/mem0/blob/main/README.md)介绍追加式抽取，也明确性能表包含托管平台的专有优化。不能把其托管评测结果当作开源 SDK 的保证，也不能沿用“所有版本均自动更新/删除事实”的旧印象。本项目仍自行定义：来源、候选确认、冲突、失效和用户纠正。

### LangGraph 与 Docling：使用基础能力，保留产品规则

参考它们的编排和解析能力，但同步、引用授权、偏好作用域、删除传播和使用体验由应用层负责。解析库换掉后，原始资料和来源定位仍须可用。

## 4. 跨端技术证据

手机候选为 React Native + Expo，电脑为 React Web。依据：[Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)提供本地持久存储，[Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)提供录音相关能力。后台调度受系统控制，不能承诺退到后台后准时执行同步或定时 AI 任务，见 [BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task/)。因此主动任务放服务器，手机回前台必做增量同步。

这是面向小团队、偏 TypeScript 的初始建议。若用户更熟悉 Flutter，则需以真实设备的录音、文件导入、离线和同步 PoC 比较后再定；当前未完成这两条路线的实测。

## 5. 选型结论

建议自建产品与数据边界，复用解析、向量检索和工作流组件。理由是本项目真正需要验证的差异在于：随手记的速度、跨端可靠性、记忆可纠错、输出有依据。

暂不叠加多套记忆框架、图数据库和多个 Agent 框架。先建立自己的小规模评测集，比较“只有原文检索”和“原文检索 + 已确认记忆”是否存在稳定收益。
