# 服务端一致性规则

本文记录现有实现的责任位置，供目录重组与后续路由拆分使用。这里不新增运行时封装；现有回归仍放在 `tests/*.test.mjs`，由 `npm test` 发现。不能把“有这些机制”理解成“所有路由都已自动获得全部保护”。

## 1. 权威状态与事务

- [store.mjs](../store.mjs) 中的SQLite是业务权威层。`save` 对已有对象核对 `expectedRevision` 与kind，冲突返回409，不能复活已删除对象；`remove` 核对revision后写删除标记。
- `save/remove` 同时维护changes以及需要索引的对象的search_outbox。跨多个写操作的业务单元由调用方使用同步事务包裹，不能仅因调用了 `save` 就假设所有关联写入已原子化。
- `transaction` 使用 `BEGIN IMMEDIATE`，回调必须同步；远程模型调用放在事务外，返回后重新核对状态，再在事务内提交。
- [background-jobs.mjs](../core/background-jobs.mjs) 的作业写入使用SAVEPOINT以便组合业务事务。Redis/BullMQ负责调度，SQLite保留作业状态；Qdrant是派生索引。

## 2. 重试与操作回执

| 责任位置 | 当前约定 | 已有回归 |
| --- | --- | --- |
| [event-operation.mjs](../domain/events/event-operation.mjs) | 有opId时核对action/body哈希，同内容重放原结果，不同内容409；已删除要事410 | [event-operation.test.mjs](../../tests/event-operation.test.mjs) |
| [memory-operation.mjs](../domain/memory/memory-operation.mjs) | 持久化操作回执，冲突结果也可重放；记忆删除后不重复创建 | [memory-operation.test.mjs](../../tests/memory-operation.test.mjs) |
| [conversation-requests.mjs](../agent/conversation-requests.mjs) | 按会话请求身份去重并保存结果引用；已有在途请求复用 | [conversation-requests.test.mjs](../../tests/conversation-requests.test.mjs) |
| [background-jobs.mjs](../core/background-jobs.mjs) | operation_key决定作业身份，相同key不同输入拒绝；租约token控制提交权 | [background-jobs.test.mjs](../../tests/background-jobs.test.mjs) |

opId在部分入口仍为可选；省略时不能宣称具备同样的跨进程重放能力。重试必须沿用原操作身份；改变输入应发起新操作。各业务的错误回执不同，不统一吞掉409/410重新创建。

## 3. 异步结果不能覆盖新状态

- 作业仓库的 `finish` 先确认状态、租约token和有效期，再在同一事务中执行业务commit及完成标记；它不替业务自动检查所有来源。
- 业务handler提交前必须核对来源revision、删除状态及对应任务状态。来源、用户确认或配置已变化时，旧结果不可直接落库。
- 要事检查实例、记忆冲突确认、分类人工修改、调研计划确认各自有状态规则，迁移时保留在原责任模块；不能用统一“校验失败就过滤掉”的兜底替换它们。
- 回归入口包括 [event-jobs.test.mjs](../../tests/event-jobs.test.mjs)、[memory-source-review.test.mjs](../../tests/memory-source-review.test.mjs)、[classification.test.mjs](../../tests/classification.test.mjs) 和 [research-backup-resume.test.mjs](../../tests/research-backup-resume.test.mjs)。列出测试不代表本轮全部执行，实际运行结果见迁移文档。

## 4. 来源、会话与游标

- [source-threads.mjs](../agent/source-threads.mjs) 按来源kind+id保存固定会话映射；项目聚合不合并各来源的聊天。已有映射不可用时返回明确错误，不悄悄新建上下文。
- 同文件中的列表分页游标绑定scope与内容签名，列表变化后要求刷新；不要与SQLite `changes.seq` 增量同步游标混用。
- 引用进入模型前仍需业务回查当前对象和可读正文；Qdrant候选或旧引用标题不代表当前可用来源。
- 回归入口：[thread-pages.test.mjs](../../tests/thread-pages.test.mjs)、[conversation-source-state.test.mjs](../../tests/conversation-source-state.test.mjs)、[retrieval.test.mjs](../../tests/retrieval.test.mjs)。

## 5. 恢复与迁移边界

完整备份与校验位于 [core/backups](../core/backups/)；JSON业务导出不等于完整备份。恢复至隔离目录进行验证，不能以搬迁模块为由重建真实数据库、移动原件或重置操作回执/检查点。

后续拆路由时，保留认证、中间件顺序、事务边界、错误响应与异步提交校验；新增共享协议或模型接入层也不能接管用户确认状态。目录本身不提供这些保证。
