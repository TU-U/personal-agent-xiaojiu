# 设置和数据：实现与验收对照

更新：2026-10-08。当前状态为进行中；历史通过结果与新增待联验项分开，不以health正常或构建通过关闭模块。

| 要求 / 步骤 / 验收 | 当前实现与入口 | 证据与剩余边界 |
| --- | --- | --- |
| SET-01、02 / P01 / A01、A02 | Settings、CapabilitiesPanel、capabilities：文本/独立视觉/embedding/Qdrant/search/语音/分离/Redis分别配置或显示环境来源、分别探测。 | 9月29日真实API配HTTP模型桩的配置/视觉失败测试及桌面保存刷新记录；不能据此声称当前外部模型均健康。 |
| SET-01、02 / P05 / A02 | local-audio-probe、capability.py复用业务模型加载/解码，独立本地转写和分离探测。 | 10月8日真实公开英语前15秒，ASR18321ms，分离2460ms/4段2编号；artifacts/audio-capability-check-20261008.json。无私人录音、无网络，非中文质量证明。 |
| SET-03 / P02 / A03 | ai-log、模型调用层及AiLogs；后端终端与文件日志，凭据/内联二进制脱敏；后台与语音记录关联ID。 | ai-log现有用例覆盖输入/输出/空响应/密钥/二进制，账单隐藏原始正文；语音新增关联结果具名测试通过。逐入口调用链与实际HTTP/队列证据已汇总在23号文档；调研及embedding错误日志缺口已修复并正式重载。 |
| SET-04 / P03、P04 | storage-status、StorageStatus展示固定数据路径/可用空间/索引职责；businessDataExport版本2明确导出范围和数量。 | 10月8日隔离真实磁盘读取及index-CZflv_dD构建；data-export专项包含项目/分类/话题/监督/调研及解析正文。新增网页存储面板及刷新失败/恢复已在10月8日通过，见文末。 |
| SET-05 / P03 / A04 | backups以SQLite一致性快照、manifest、哈希与附件/副本引用校验；默认移除密钥/会话，只恢复到不存在的新目录。BackupPanel创建/下载/隔离验证。 | 9月29日备份3项及实际桌面创建ZIP/恢复流程记录；损坏/穿越/覆盖拒绝。显式含凭据内部备份禁止网页下载。没有授权自动替换线上目录。 |
| SET-05 / P05、TECH-02 | 账单原件/导入与交易关联、音频版本/分类反馈/监督复盘和证据、调研输入和图检查点随完整库备份。 | accounting-backup、research-backup-resume历史专项：原件哈希、持久去重、实际图恢复仍等待确认；模型/审批由桩模拟。不能宣称已验证所有未来实体的语义引用。 |
| SET-06 / P04 / A05 | 现有演示口令可用；start.sh与dev入口、Vite fs.deny、登录后数据/日志/导出接口；22-operation-guide现行命令。 | 已有API未登录拒绝；Vite敏感路径存在禁止配置。10月8日开发服务四个敏感路径实际HTTP403、首页200，见文末。未新增公网映射或移动端工作。 |
| SET-07 / P01、P04 / V20 | settingsPatchSchema先验证，所有配置在同一事务保存；能力结果绑定配置指纹；主题仅浏览器本地。 | 历史配置非法拒绝/保存后结果失效；10月8日非法ASR不影响其余能力，迟到测试结果409且不覆盖旧记录，具名用例通过。 |
| SET-P05 / Q03、Q08、Q12 | ClassificationCorrections入口；ResearchSearchPricing价格复核与有效期；调研累计预算和账单原件备份。 | 相关模块专项见RES与记账对照。Brave账户价格是用户核对上限，真实账户计费仍待验证，不能冒充供应商实际账单。 |
| TECH-01/03 / worker状态 | file-worker双连接状态+IPC心跳，API持有子进程身份；WorkerStatus展示启动/停止/超时/异常/就绪和SQL各状态数量。 | worker-status定向转换测试、index-CVibVYzf构建；后续修正发布/消费连接分别就绪与错误清理竞争仅语法检查。10月8日真实IPC、隔离Redis停启恢复及页面刷新已通过；失败业务任务回源另行核实。 |

## 对共同校验与提示的解释

V01/V02是跨模块规则，不应把不存在的设置候选列表或AI编辑功能虚构出来测试；相关表单schema、能力状态、分类反馈与业务来源遵守各自规则。V20聚焦原子配置、结果版本及备份清单/数据库/附件一致性，索引健康不替代权威数据恢复。

普通配置错误、测试结果、存储状态是就近反馈，不额外生成小九催促。业务后台失败与待确认来源由业务模块接小九，不能把Redis PING成功当任务完成。

## 剩余验收和下一步

1. AI入口与业务关联已核对，见23号及下方修复记录；不重新跑所有模型。
2. 存储面板刷新失败/恢复、worker启动/断线/恢复已通过，复用下方证据；语音诊断页面已补定向用例，见文末；失败业务任务回源见PET对照的监督重试核对。
3. 本地监听已恢复，开发私有路径实际HTTP拒绝已通过，无相关改动不再复测。
4. 保留现有备份恢复证据；如果之后修改持久化结构或附件契约，再对受影响恢复用例定向验证。线上切换继续需要单独明确动作。
5. 完成上述项后才写入总验收结论；本文不是十模块目标完成声明。

## 2026-10-08 日志关联补充

统一AI日志已附加隔离的业务context：API requestId/method/endpoint、新会话threadId，以及后台jobId/jobKind/entityId/revision/attempt。tests/ai-context.test.mjs的交错模型成功/失败1项通过，凭据仍脱敏。当前证据为实际日志与模型调用函数配fetch桩；HTTP中间件、真实队列贯穿及每个入口的业务语义完整性尚未全部验收。不能仅据此关闭SET-03/P02。

## 2026-10-08 worker 实际进程恢复验证

修复BullMQ 6接口后，以独立临时DATA_DIR和临时端口Redis启动正式file-worker，观察真实IPC，顺序得到 ready（queueReady=true/error=false）→停止隔离Redis后disconnected（queueReady=false）→重启同一隔离Redis后recovered（queueReady=true/error=false）。脚本退出时关闭自建worker/Redis，未停止用户现有6381服务。

实际产物 `/tmp/shiguang-worker-lifecycle-wcONie/result.json`。可复用入口 `node scripts/check-worker-lifecycle.mjs`（仅必要时运行）；本次未为保存入口再重复执行。此项证明正式worker连接状态与恢复，未覆盖设置面板渲染、失败业务任务回源或所有AI日志入口。

## 2026-10-08 设置面板与开发服务器实测

`tests/e2e/settings-runtime.spec.ts --project=desktop` 单场景通过（21.9秒，用例8.7秒）。隔离临时数据库，实际API、磁盘状态、正式worker与Redis连接：存储面板显示真实DATA_DIR和磁盘空间；模拟单次503后保留旧结果并明确标记，刷新恢复清除错误；worker实际达到ready，经面板刷新显示，单次503和恢复同样正确。没有调用模型或重复ASR测试。报告 `/tmp/shiguang-settings-report`，结果 `/tmp/shiguang-settings-results`。

当前vite.config.ts启动临时回环开发服务，HTTP访问 `/.data/shiguang.sqlite`、`/server/provider.local.mjs`、`/.local-runtime/redis/etc/redis/redis.conf`、`/@fs/mnt/d/OpenResource/PersonalAgent/.data/shiguang.sqlite` 均403，首页200；没有打印或导出私有正文。结果 `/tmp/shiguang-vite-private-paths.json`。初次沙箱禁止大写路径下Vite配置临时文件写入，经工具批准后执行成功；测试服务已关闭，没有公网绑定。

此证据关闭新增存储/worker面板及上述开发私有路径的缺证；各业务AI日志完整度、真实外部服务及其他模块关卡继续按各自范围验收。

## 2026-10-08 复用实际HTTP日志证据

读取已通过SUP网页场景生成的 `/tmp/shiguang-e2e-hwVN2y/logs/ai-interactions.jsonl`，两组模型request/response各自保持相同callId和requestId，endpoint分别为具体work-runs/:id/action与supervision/recap，method均POST。只提取关联元数据，未打印输入正文或凭据；未重新调用模型。

因此HTTP中间件→模型调用→响应日志的关联已由实际服务器配HTTP模型桩证明。后台BullMQ模型调用上下文仍只有核心定向证据，不能用这份HTTP日志替代；逐入口业务语义也不据此全部关单。

2026-10-08：真实录音联验同时核实ASR、分类队列和HTTP归纳日志关联，详见20号“网页录音到真实归纳及队列日志”，元数据见 `artifacts/audio-live-flow-20261008.json`。未为日志重复调用模型。

2026-10-08：真实账单分类模型两次调用的HTTP业务关联已核实，元数据见 `artifacts/accounting-classification-live-20261008.json`，不为日志重复请求模型。

2026-10-08：网页randomUUID已统一加非安全上下文兼容，实际私网HTTP的登录/录音限制提示/音频导入/编辑保存通过，详见REC对照文末。AI日志继续核对：API中间件包裹认证后的业务路由，background-jobs在运行handler前附任务上下文；普通及调研模型均进requestCompletion，ASR/embedding/web-search另有具名请求/响应/失败日志。此为代码调用链核对，与已保留的真实HTTP/worker日志共同使用，不声称每个业务入口都新跑了真实模型。

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

## 2026-10-08 SET-A02/P05语音诊断页面补证

`tests/e2e/capabilities.spec.ts` 中仅运行 audio diagnostics 场景，desktop 1项通过，14.0秒（用例2.0秒）。模拟诊断接口返回转写成功、分离失败：两者及文本能力分别显示；刷新仍显示分离错误；显式重试分离成功，不重新请求转写（ASR一次、分离两次）。实际浏览器和隔离应用，诊断结果为接口桩，不调用本地语音或外部模型；真实语音能力继续复用 audio-capability-check-20261008.json。

首次失败是定位器同时选中结果段落与加载图标的status，限定结果段落后只重跑此场景，没有改产品或放宽结果断言。报告 `/tmp/shiguang-audio-diagnostics-report-v2`，结果 `/tmp/shiguang-audio-diagnostics-results-v2`。产品源码未变，不需重建/重启；不因此关闭中文识别质量或其他模块剩余关卡。

## 2026-10-08 SET原始编号收口

SET-01–07、P01–P04、A01–A05按上表与23号映射到20号；网页设置运行状态及语音诊断产物仍为passed，备份测试分别覆盖账单原件/半核对状态/回执，以及调研检查点在恢复后仍等待同一人工确认、明确确认后继续执行。后者的“等待确认”是已验证的业务状态，不是恢复测试尚未完成。P05中的真实搜索价格与账户费用尚未关闭，继续由RES/G04追踪。本次仅核对现有证据，无测试、模型调用或线上恢复。
