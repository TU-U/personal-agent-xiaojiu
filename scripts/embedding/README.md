# Qwen 本地 Embedding 候选服务

本机已完成独立回填和53来源的检索验收，在线使用Qwen；BGE服务及旧集合保留回退。后续迁移仍须显式通过门槛后切换。

```bash
python3 scripts/embedding/prepare.py
python3 scripts/embedding/start.py
node scripts/embedding/check.mjs
```

从项目根目录运行。模型位于 `.local-model/`，运行服务绑定 `127.0.0.1:4320`，OpenAI 兼容接口为 `/v1/embeddings`，模型别名 `qwen3-embedding-0.6b`。日志在 `.data/logs/qwen-embedding.log`，PID 在 `.data/qwen-embedding.pid`。启动器核对 runtime commit；已有服务不重复启动，端口占用但尚未就绪时要求检查原进程，不擅自重启。

`model.json` 固定官方 GGUF 仓库 revision、Q8_0 文件 SHA-256、大小、1024 维、last pooling、L2 normalization、查询指令和分段版本。下载保留 `.partial` 可续传，校验成功后才替换目标文件。运行库沿用项目已有 llama.cpp b10964（b29c606e2）。本机该二进制没有可用 GPU 设备，采用4线程CPU，服务上下文上限8192 token；超过上限拒绝，不代表采用模型的全部32K能力。

查询使用 `Instruct: …\nQuery:…`，文档保持原文；不要在调用方和服务端重复添加指令。协议实现位于 `server/embedding-contract.mjs`。显式 `indexProfile: qwen3-local-v1` 才启用Qwen预处理及版本化集合；未配置profile的BGE继续兼容旧集合。集合身份包含权重校验值、量化、维度、预处理、分段、运行库和范围payload版本，不只取模型名称。任何已有集合维度或向量配置不匹配时拒绝混写。

`check.mjs` 仅用公开合成句子，输出 `artifacts/qwen-embedding-check.json`：维度、原始向量范数、短文/长段耗时、CPU进程内存、两道中英文语义样题和超限拒绝。它不是RET-A05的50–200份代表资料/20题验收，不据此自动切换生产索引。

迁移现已使用独立 `index_migrations/index_migration_items` 清单，通过已有 Redis/BullMQ worker 执行；不消费在线BGE的 `search_outbox`。每个来源版本对应独立任务，模型配置留在SQLite，队列只传ID。持续读取changes日志追上回填期间的修改/删除，已完成分段可恢复；重建丢失的远端集合时换epoch重新回填，旧完成任务保留审计。

```bash
node scripts/embedding/migrate.mjs create
node scripts/embedding/migrate.mjs status <返回的迁移ID>
node scripts/embedding/migrate.mjs retry <迁移ID>
node scripts/embedding/migrate.mjs verify <迁移ID>
```

运行中的服务端会管理worker；不要为同一工作目录另开重复worker。`retry`仅重试失败任务，不重做已完成任务。状态ready仅表示当前清单回填完毕，并不代表已切换或语义质量通过。`verify`逐页比对当前有效来源的所有分段正文、版本、位置、状态和范围，源版本在检查期间变化则拒绝；缺失或多余点会明确列出计数。验证结果保存在SQLite设置 `index-verification:<迁移ID>`，`qualityVerified`仍为false。

需要通过覆盖与真实资料质量验证后另行切换，保存原配置及旧集合供回退。当前已切换Qwen，主启动脚本按持久配置检查并启动该服务。

依据：[Qwen官方GGUF模型卡](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF)的last pooling示例和[原始模型卡](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)的查询指令/文档输入约定。


检索质量基线：先运行 `python3 scripts/embedding/freeze-questions.py` 固定题目（已有文件会拒绝覆盖），再运行 `node scripts/embedding/evaluate.mjs <迁移ID>`。结果在 `artifacts/retrieval-baseline-v1.json`，评测不会切换配置。当前语料含演示样本，基线未达到正式代表性资料数量及无答案检查门槛，不能仅凭top5命中率宣布迁移验收。

Qwen新点采用来源版本参与的ID，保护新版点不被旧worker迟到写覆盖；已有同版本旧ID仍可读取，下次来源修订时清理。该变化不改变模型向量空间，不需要重算未变化的全文向量。


Qwen相关性门槛：`server/retrieval-relevance.mjs` 中的0.45余弦值为当前本地基线校准值。检索从Qdrant取回dense向量，核对维度/有限非零值并独立计算余弦；融合高分不能绕过门槛。低相关候选剔除后继续有界补查，耗尽时返回`evidenceStatus: insufficient`及资料不足提示。向量缺失或异常报错，不冒充确定无资料。该值不是事实可信度，相关候选仍不保证能回答问题；新独立样本未通过前不切换模型。

对照报告分别保留在`retrieval-baseline-v1.json`和`retrieval-calibration-v1.json`，新的评测需显式传第三个输出路径参数，脚本拒绝覆盖已有结果。分路诊断为`node scripts/embedding/diagnose.mjs <迁移ID>`；记录dense/sparse排名供定位，不输出文档正文中的口令。


独立验收脚本为 `freeze-heldout.py` / `heldout.mjs`，原始题目和结果已保留，不要覆盖。53来源的本机问题留出评测为18/20，2道无答案题通过；未命中仍保留。此前“未达门槛”描述对应v1基线，不代表此次独立v2验收结果。

切换与回退：

```bash
node scripts/embedding/migrate.mjs activate <已验收迁移ID>
node scripts/embedding/migrate.mjs rollback <切换返回的switchId>
```

最终活动迁移ID：`a103fa84-5b0c-4ecf-9edd-f10aaa432d44`，当前switchId：`7d2a6a11-d038-46ad-a3a5-3c42d879c1cf`。只使用与当前活动设置对应的切换记录；后续自行修改配置时回退会拒绝覆盖。回退后旧索引补齐期间可能暂少结果，界面显示索引状态，不能把恢复配置等同于完成重建。
