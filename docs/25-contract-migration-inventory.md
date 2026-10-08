# 9.3 接口迁移清单

由 `npm run contracts:inventory` 从协议和实际路由生成，不把路径接通当作字段抽取完成。

协议版本：0.3.0；共 156 个操作。已抽取形状 153；待抽取 0；已退役 3。

新旧路径均调用同一处理函数；鉴权、事务、revision、opId、游标和附件存储不切换。错误仍为原 HTTP 状态与 `{error,current?}`。

- `reviewed`：已抽取公共形状。新 JSON 请求使用共享形状校验，原业务校验继续执行；multipart 由原上传/业务处理器校验和清理文件。响应不在写入完成后阻断返回；可开启无正文诊断，代表路径在集成测试中校验。
- `legacy-owned`：路径与传输已盘点，具体字段尚未全部抽取；前端该部分仍使用既有局部类型，不能计为完整强类型接入。
- `retired`：已有 410 接口，迁移不重新开放。
- 当前 /ask 为 JSON；ZIP 下载是流式字节输出，不代表聊天支持 SSE。未来新增流式事件需先补协议。
- 资料库、调研、监督、记账复杂动作等字段均已迁移；此表继续约束新增与变更接口。Android单独接入，未做手机测试或打包。

| 方法 | 旧路径 | v1路径 | 请求 | 查询参数 | 响应 | 消费者 | 字段状态 | 当前处理器 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/research-search-settings` | `/api/v1/research-search-settings` | 无 | 无 | 200 application/json: ResearchSearchPricing | Web；桌面后续复用 | reviewed | server/agent/research/research-tasks.mjs:137 |
| POST | `/api/research-search-settings` | `/api/v1/research-search-settings` | application/json: ResearchSearchPricingInput | 无 | 200 application/json: ResearchSearchPricing | Web；桌面后续复用 | reviewed | server/agent/research/research-tasks.mjs:138 |
| POST | `/api/research-tasks` | `/api/v1/research-tasks` | application/json: ResearchCreate | 无 | 200 application/json: ResearchTask | Web；桌面后续复用 | reviewed | server/agent/research/research-tasks.mjs:139 |
| GET | `/api/research-tasks/:id/external/:sourceId` | `/api/v1/research-tasks/:id/external/:sourceId` | 无 | 无 | 200 application/json: ResearchExternal | Web；桌面后续复用 | reviewed | server/agent/research/research-tasks.mjs:140 |
| GET | `/api/research-tasks/:id` | `/api/v1/research-tasks/:id` | 无 | 无 | 200 application/json: ResearchDetail | Web；桌面后续复用 | reviewed | server/agent/research/research-tasks.mjs:141 |
| POST | `/api/research-tasks/:id/action` | `/api/v1/research-tasks/:id/action` | application/json: ResearchAction | 无 | 200 application/json: ResearchTask | Web；桌面后续复用 | reviewed | server/agent/research/research-tasks.mjs:142 |
| GET | `/api/research-sources` | `/api/v1/research-sources` | 无 | `cursor`、`limit`、`q`、`kind` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/agent/research/research-tasks.mjs:143 |
| POST | `/api/source-threads` | `/api/v1/source-threads` | application/json: SourceThreadRequest | 无 | 200 application/json: SourceThread | Web；桌面后续复用 | reviewed | server/agent/source-threads.mjs:43 |
| GET | `/api/threads` | `/api/v1/threads` | 无 | `cursor`、`limit` | 200 application/json: ThreadDirectoryPage | Web；桌面后续复用 | reviewed | server/agent/source-threads.mjs:44 |
| POST | `/api/threads` | `/api/v1/threads` | application/json: ChatThreadRequest | 无 | 200 application/json: ChatThreadCreated | Web；桌面后续复用 | reviewed | server/agent/chat-policy.mjs:17 |
| GET | `/api/threads/:id/turns` | `/api/v1/threads/:id/turns` | 无 | `cursor`、`limit` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/agent/source-threads.mjs:45 |
| GET | `/api/settings/storage` | `/api/v1/settings/storage` | 无 | 无 | 200 application/json: StorageStatus | Web；桌面后续复用 | reviewed | server/core/backups/backup-routes.mjs:12 |
| POST | `/api/backups` | `/api/v1/backups` | application/json: EmptyRequest | 无 | 201 application/json: BackupReceipt | Web；桌面后续复用 | reviewed | server/core/backups/backup-routes.mjs:16 |
| GET | `/api/backups/:id/download` | `/api/v1/backups/:id/download` | 无 | 无 | 200 application/zip: string | Web；桌面后续复用 | reviewed | server/core/backups/backup-routes.mjs:25 |
| POST | `/api/backups/:id/verify-restore` | `/api/v1/backups/:id/verify-restore` | application/json: EmptyRequest | 无 | 200 application/json: RestoreReceipt | Web；桌面后续复用 | reviewed | server/core/backups/backup-routes.mjs:34 |
| GET | `/api/settings/capabilities` | `/api/v1/settings/capabilities` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/core/capabilities.mjs:51 |
| POST | `/api/settings/capabilities/:id/test` | `/api/v1/settings/capabilities/:id/test` | application/json: EmptyRequest | 无 | 200 application/json: CapabilityTest | Web；桌面后续复用 | reviewed | server/core/capabilities.mjs:52 |
| GET | `/api/mobile/v1/capabilities` | `/api/v1/devices/capabilities` | 无 | 无 | 200 application/json: DeviceCapabilities | 设备客户端（Android未接入v1） | reviewed | server/core/device-auth.mjs:20 |
| POST | `/api/mobile/v1/session` | `/api/v1/devices/session` | application/json: DeviceLoginRequest | 无 | 200 application/json: DeviceSession | 设备客户端（Android未接入v1） | reviewed | server/core/device-auth.mjs:30 |
| DELETE | `/api/mobile/v1/session` | `/api/v1/devices/session` | 无 | 无 | 200 application/json: Ok | 设备客户端（Android未接入v1） | reviewed | server/core/device-auth.mjs:63 |
| GET | `/api/accounting/imports/:id/classifications` | `/api/v1/accounting/imports/:id/classifications` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-classification.mjs:42 |
| POST | `/api/accounting/imports/:id/classify` | `/api/v1/accounting/imports/:id/classify` | application/json: AccountingClassifyRequest | 无 | 200 application/json: AccountingClassification | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-classification.mjs:43 |
| POST | `/api/accounting/imports/:id/review` | `/api/v1/accounting/imports/:id/review` | application/json: AccountingReviewInput | 无 | 200 application/json: AccountingReviewPreview | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-import-review.mjs:85 |
| POST | `/api/accounting/imports/:id/commit` | `/api/v1/accounting/imports/:id/commit` | application/json: AccountingCommitInput | 无 | 200 application/json: AccountingCommitReceipt | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-import-review.mjs:86 |
| GET | `/api/accounting/imports/:id/reviews` | `/api/v1/accounting/imports/:id/reviews` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-import-review.mjs:87 |
| GET | `/api/accounting/imports` | `/api/v1/accounting/imports` | 无 | `offset`、`limit` | 200 application/json: AccountingImportList | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-imports.mjs:95 |
| POST | `/api/accounting/imports` | `/api/v1/accounting/imports` | multipart/form-data: 内联对象 | 无 | 201 application/json: AccountingImportPage | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-imports.mjs:96 |
| GET | `/api/accounting/imports/:id` | `/api/v1/accounting/imports/:id` | 无 | `offset`、`limit` | 200 application/json: AccountingImportPage | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-imports.mjs:97 |
| POST | `/api/accounting/imports/:id/reparse` | `/api/v1/accounting/imports/:id/reparse` | application/json: 内联对象 | 无 | 200 application/json: AccountingImportPage | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-imports.mjs:98 |
| GET | `/api/accounting/imports/:id/original` | `/api/v1/accounting/imports/:id/original` | 无 | 无 | 200 */*: string | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-imports.mjs:99 |
| PATCH | `/api/accounting/budget` | `/api/v1/accounting/budget` | application/json: 内联对象 | 无 | 200 application/json: AccountingBudget | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-settings.mjs:21 |
| GET | `/api/accounting/checks` | `/api/v1/accounting/checks` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-settings.mjs:22 |
| POST | `/api/accounting/checks/confirm` | `/api/v1/accounting/checks/confirm` | application/json: 内联对象 | 无 | 200 application/json: AccountingCheck | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-settings.mjs:23 |
| GET | `/api/accounting/view` | `/api/v1/accounting/view` | 无 | `period`、`kind`、`category`、`start`、`end`、`search`、`rankMonth`（必填）、`chartYear`（必填） | 200 application/json: AccountingView | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-statistics.mjs:25 |
| GET | `/api/event-references` | `/api/v1/event-references` | 无 | `kind`（必填）、`q`、`excludeId`、`offset`、`limit` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/events/event-relations.mjs:16 |
| POST | `/api/event-references/resolve` | `/api/v1/event-references/resolve` | application/json: ReferenceResolveRequest | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/events/event-relations.mjs:21 |
| GET | `/api/library/:id/tasks` | `/api/v1/library/:id/tasks` | 无 | `cursor`、`limit`、`q` | 200 application/json: LibraryTaskPage | Web；桌面后续复用 | reviewed | server/domain/library/library-task-links.mjs:46 |
| POST | `/api/library/:id/tasks` | `/api/v1/library/:id/tasks` | application/json: 内联对象 | 无 | 200 application/json: WorkTask | Web；桌面后续复用 | reviewed | server/domain/library/library-task-links.mjs:52 |
| GET | `/api/work-tasks/:id/library` | `/api/v1/work-tasks/:id/library` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/library/library-task-links.mjs:53 |
| DELETE | `/api/work-tasks/:id/library/:sourceId` | `/api/v1/work-tasks/:id/library/:sourceId` | application/json: 内联对象 | 无 | 200 application/json: WorkTask | Web；桌面后续复用 | reviewed | server/domain/library/library-task-links.mjs:54 |
| GET | `/api/library` | `/api/v1/library` | 无 | `summary` | 200 application/json: LibraryStatus | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| GET | `/api/library/files` | `/api/v1/library/files` | 无 | `status`、`projectId`、`project`、`directory`、`extension`、`dateFrom`、`dateTo`、`cursor`、`limit` | 200 application/json: LibraryFilePage | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| POST | `/api/library/scan` | `/api/v1/library/scan` | application/json: 内联对象 | 无 | 200 application/json: LibraryStatus | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| POST | `/api/library/control` | `/api/v1/library/control` | application/json: 内联对象 | 无 | 200 application/json: LibraryStatus | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| POST | `/api/library/decisions` | `/api/v1/library/decisions` | application/json: 内联对象 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| POST | `/api/library/:id/decision` | `/api/v1/library/:id/decision` | application/json: 内联对象 | 无 | 200 application/json: LibraryStatus | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| GET | `/api/library/search` | `/api/v1/library/search` | 无 | `status`、`projectId`、`project`、`directory`、`extension`、`dateFrom`、`dateTo`、`q` | 200 application/json: LibrarySearch | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| PATCH | `/api/library/:id/metadata` | `/api/v1/library/:id/metadata` | application/json: 内联对象 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| GET | `/api/library/:id/index` | `/api/v1/library/:id/index` | 无 | 无 | 200 application/json: LibraryIndexState | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| POST | `/api/library/:id/index` | `/api/v1/library/:id/index` | application/json: 内联对象 | 无 | 200 application/json: LibraryIndexState | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| GET | `/api/library/:id` | `/api/v1/library/:id` | 无 | 无 | 200 application/json: LibraryFile | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| POST | `/api/library/:id/analyze` | `/api/v1/library/:id/analyze` | application/json: 内联对象 | 无 | 200 application/json: LibraryStatus | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| GET | `/api/library/:id/file` | `/api/v1/library/:id/file` | 无 | `download` | 200 */*: string | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| GET | `/api/categories` | `/api/v1/categories` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:49 |
| POST | `/api/categories` | `/api/v1/categories` | application/json: CategoryCreate | 无 | 201 application/json: Category | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:50 |
| PATCH | `/api/categories/:id` | `/api/v1/categories/:id` | application/json: NameUpdate | 无 | 200 application/json: Category | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:54 |
| POST | `/api/notes/categories` | `/api/v1/notes/categories` | application/json: SetCategoriesRequest | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:58 |
| GET | `/api/classification-corrections` | `/api/v1/classification-corrections` | 无 | `status`、`offset`、`limit` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:59 |
| PATCH | `/api/classification-corrections/:id` | `/api/v1/classification-corrections/:id` | application/json: 内联对象 | 无 | 200 application/json: ClassificationCorrectionRecord | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:63 |
| GET | `/api/projects` | `/api/v1/projects` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:67 |
| POST | `/api/projects` | `/api/v1/projects` | application/json: NameRequest | 无 | 201 application/json: Project | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:68 |
| PATCH | `/api/projects/:id` | `/api/v1/projects/:id` | application/json: NameUpdate | 无 | 200 application/json: Project | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:77 |
| POST | `/api/projects/:id/links` | `/api/v1/projects/:id/links` | application/json: ProjectLink | 无 | 200 application/json: Note ∪ EventRecord ∪ LibraryFile ∪ Artifact | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:78 |
| GET | `/api/projects/:id/candidates` | `/api/v1/projects/:id/candidates` | 无 | `kind`（必填）、`q`、`offset`、`limit` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:82 |
| GET | `/api/projects/:id/items` | `/api/v1/projects/:id/items` | 无 | `kind`（必填）、`offset`、`limit` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:87 |
| GET | `/api/notes/:id/classification` | `/api/v1/notes/:id/classification` | 无 | 无 | 200 application/json: ClassificationState | Web；桌面后续复用 | reviewed | server/domain/notes/classification.mjs:35 |
| POST | `/api/notes/:id/classification` | `/api/v1/notes/:id/classification` | application/json: 内联对象 | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/domain/notes/classification.mjs:40 |
| POST | `/api/todos/:id/carry` | `/api/v1/todos/:id/carry` | application/json: CarryTodoRequest | 无 | 200 application/json: Todo | Web；桌面后续复用 | reviewed | server/domain/notes/todo-days.mjs:25 |
| GET | `/api/health` | `/api/v1/health` | 无 | 无 | 200 application/json: Health | Web；桌面后续复用 | reviewed | server/index.mjs:84 |
| GET | `/api/session` | `/api/v1/session` | 无 | 无 | 200 application/json: Session | Web；桌面后续复用 | reviewed | server/index.mjs:85 |
| POST | `/api/login` | `/api/v1/login` | application/json: LoginRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:88 |
| GET | `/api/settings/worker` | `/api/v1/settings/worker` | 无 | 无 | 200 application/json: WorkerStatus | Web；桌面后续复用 | reviewed | server/index.mjs:99 |
| POST | `/api/logout` | `/api/v1/logout` | 无 | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:110 |
| GET | `/api/bootstrap` | `/api/v1/bootstrap` | 无 | 无 | 200 application/json: Bootstrap | Web；桌面后续复用 | reviewed | server/index.mjs:111 |
| GET | `/api/changes` | `/api/v1/changes` | 无 | `since` | 200 application/json: Changes | Web；桌面后续复用 | reviewed | server/index.mjs:115 |
| GET | `/api/search` | `/api/v1/search` | 无 | `q`、`project`、`tag`、`type` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:116 |
| POST | `/api/todos/:id/upgrade` | `/api/v1/todos/:id/upgrade` | application/json: TodoUpgradeRequest | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:136 |
| POST | `/api/todos` | `/api/v1/todos` | application/json: TodoCreate | 无 | 201 application/json: Todo | Web；桌面后续复用 | reviewed | server/index.mjs:137 |
| PATCH | `/api/todos/:id` | `/api/v1/todos/:id` | application/json: TodoPatch | 无 | 200 application/json: Todo | Web；桌面后续复用 | reviewed | server/index.mjs:138 |
| DELETE | `/api/todos/:id` | `/api/v1/todos/:id` | application/json: RevisionRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:139 |
| GET | `/api/transactions` | `/api/v1/transactions` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:140 |
| POST | `/api/transactions` | `/api/v1/transactions` | application/json: TransactionInput | 无 | 201 application/json: LedgerTransaction | Web；桌面后续复用 | reviewed | server/index.mjs:141 |
| PATCH | `/api/transactions/:id` | `/api/v1/transactions/:id` | application/json: TransactionPatch | 无 | 200 application/json: LedgerTransaction | Web；桌面后续复用 | reviewed | server/index.mjs:142 |
| DELETE | `/api/transactions/:id` | `/api/v1/transactions/:id` | application/json: RevisionRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:143 |
| POST | `/api/transactions/import/preview` | `/api/v1/transactions/import/preview` | 无 | 无 | 410 application/json: Error | Web；桌面后续复用 | retired | server/index.mjs:150 |
| POST | `/api/transactions/import/commit` | `/api/v1/transactions/import/commit` | 无 | 无 | 410 application/json: Error | Web；桌面后续复用 | retired | server/index.mjs:150 |
| POST | `/api/transactions/ocr` | `/api/v1/transactions/ocr` | 无 | 无 | 410 application/json: Error | Web；桌面后续复用 | retired | server/index.mjs:151 |
| POST | `/api/pet/chat` | `/api/v1/pet/chat` | application/json: PetChatRequest | 无 | 200 application/json: PetChatReply | Web；桌面后续复用 | reviewed | server/index.mjs:152 |
| POST | `/api/notes` | `/api/v1/notes` | application/json: NoteCreate | 无 | 200 application/json: Note<br>201 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:153 |
| PATCH | `/api/notes/:id` | `/api/v1/notes/:id` | application/json: NotePatch | 无 | 200 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:158 |
| DELETE | `/api/notes/:id` | `/api/v1/notes/:id` | application/json: RevisionRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:159 |
| POST | `/api/notes/:id/summarize` | `/api/v1/notes/:id/summarize` | 无 | 无 | 200 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:163 |
| POST | `/api/events/suggest` | `/api/v1/events/suggest` | application/json: EventSuggestRequest | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:181 |
| POST | `/api/events` | `/api/v1/events` | application/json: EventCreate | 无 | 201 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:207 |
| PATCH | `/api/events/:id` | `/api/v1/events/:id` | application/json: EventPatch | 无 | 200 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:208 |
| DELETE | `/api/events/:id` | `/api/v1/events/:id` | application/json: RevisionRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:215 |
| POST | `/api/events/:id/check` | `/api/v1/events/:id/check` | application/json: EventCheckRequest | 无 | 202 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:209 |
| GET | `/api/events/:id/checks` | `/api/v1/events/:id/checks` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:210 |
| POST | `/api/events/:id/schedule` | `/api/v1/events/:id/schedule` | application/json: 内联对象 | 无 | 200 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:211 |
| POST | `/api/events/:id/snooze` | `/api/v1/events/:id/snooze` | application/json: 内联对象 | 无 | 200 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:212 |
| POST | `/api/events/:id/end` | `/api/v1/events/:id/end` | application/json: 内联对象 | 无 | 200 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:213 |
| POST | `/api/events/:id/confirm` | `/api/v1/events/:id/confirm` | application/json: 内联对象 | 无 | 200 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:214 |
| GET | `/api/events/:id/image/:imageId` | `/api/v1/events/:id/image/:imageId` | 无 | `download` | 200 image/*: string | Web；桌面后续复用 | reviewed | server/index.mjs:216 |
| GET | `/api/computer-files` | `/api/v1/computer-files` | 无 | `path`、`q` | 200 application/json: ComputerFileListing | Web；桌面后续复用 | reviewed | server/index.mjs:246 |
| POST | `/api/computer-files/import` | `/api/v1/computer-files/import` | application/json: 内联对象 | 无 | 201 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:251 |
| POST | `/api/import` | `/api/v1/import` | multipart/form-data: 内联对象 | 无 | 200 application/json: Note<br>201 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:261 |
| POST | `/api/notes/:id/images` | `/api/v1/notes/:id/images` | multipart/form-data: 内联对象 | 无 | 200 application/json: Note<br>201 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:267 |
| DELETE | `/api/notes/:id/images/:attachment` | `/api/v1/notes/:id/images/:attachment` | application/json: RevisionRequest | 无 | 200 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:279 |
| GET | `/api/notes/:id/file/:attachment` | `/api/v1/notes/:id/file/:attachment` | 无 | `download` | 200 */*: string | Web；桌面后续复用 | reviewed | server/index.mjs:288 |
| POST | `/api/search-brief` | `/api/v1/search-brief` | application/json: SearchBriefRequest | 无 | 200 application/json: SearchBrief | Web；桌面后续复用 | reviewed | server/index.mjs:298 |
| GET | `/api/threads/:id/context` | `/api/v1/threads/:id/context` | 无 | 无 | 200 application/json: ThreadContext | Web；桌面后续复用 | reviewed | server/index.mjs:307 |
| POST | `/api/threads/:id/context` | `/api/v1/threads/:id/context` | 无 | 无 | 200 application/json: ThreadContext | Web；桌面后续复用 | reviewed | server/index.mjs:308 |
| POST | `/api/ask` | `/api/v1/ask` | application/json: AskRequest | 无 | 200 application/json: Conversation | Web；桌面后续复用 | reviewed | server/index.mjs:309 |
| GET | `/api/conversations/:id` | `/api/v1/conversations/:id` | 无 | 无 | 200 application/json: Conversation | Web；桌面后续复用 | reviewed | server/index.mjs:341 |
| DELETE | `/api/conversations/:id` | `/api/v1/conversations/:id` | application/json: RevisionRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:344 |
| PATCH | `/api/conversations/:id/memory-proposals/:index` | `/api/v1/conversations/:id/memory-proposals/:index` | application/json: EditMemoryProposal | 无 | 200 application/json: Conversation | Web；桌面后续复用 | reviewed | server/index.mjs:342 |
| POST | `/api/conversations/:id/memory-review` | `/api/v1/conversations/:id/memory-review` | application/json: ReviewMemoryBatch | 无 | 200 application/json: Conversation | Web；桌面后续复用 | reviewed | server/index.mjs:343 |
| DELETE | `/api/threads/:id` | `/api/v1/threads/:id` | 无 | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:345 |
| POST | `/api/tasks` | `/api/v1/tasks` | application/json: 内联对象 | 无 | 201 application/json: Artifact | Web；桌面后续复用 | reviewed | server/index.mjs:346 |
| GET | `/api/artifacts/:id` | `/api/v1/artifacts/:id` | 无 | `revision` | 200 application/json: Artifact | Web；桌面后续复用 | reviewed | server/index.mjs:354 |
| PATCH | `/api/artifacts/:id` | `/api/v1/artifacts/:id` | application/json: ArtifactUpdate | 无 | 200 application/json: Artifact | Web；桌面后续复用 | reviewed | server/index.mjs:356 |
| DELETE | `/api/artifacts/:id` | `/api/v1/artifacts/:id` | application/json: RevisionRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:357 |
| GET | `/api/artifacts/:id/download` | `/api/v1/artifacts/:id/download` | 无 | `revision` | 200 text/markdown: string | Web；桌面后续复用 | reviewed | server/index.mjs:355 |
| POST | `/api/memories` | `/api/v1/memories` | application/json: MemoryCreate | 无 | 201 application/json: Memory | Web；桌面后续复用 | reviewed | server/index.mjs:358 |
| GET | `/api/memories/:id/source-review` | `/api/v1/memories/:id/source-review` | 无 | 无 | 200 application/json: MemorySourcePreview | Web；桌面后续复用 | reviewed | server/index.mjs:359 |
| PATCH | `/api/memories/:id` | `/api/v1/memories/:id` | application/json: MemoryPatch | 无 | 200 application/json: Memory | Web；桌面后续复用 | reviewed | server/index.mjs:360 |
| DELETE | `/api/memories/:id` | `/api/v1/memories/:id` | application/json: RevisionRequest | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:361 |
| GET | `/api/settings` | `/api/v1/settings` | 无 | 无 | 200 application/json: Settings | Web；桌面后续复用 | reviewed | server/index.mjs:362 |
| PATCH | `/api/settings` | `/api/v1/settings` | application/json: SettingsPatch | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:363 |
| POST | `/api/settings/test` | `/api/v1/settings/test` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:376 |
| GET | `/api/ai/logs` | `/api/v1/ai/logs` | 无 | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:383 |
| GET | `/api/export` | `/api/v1/export` | 无 | 无 | 200 application/json: BusinessExport | Web；桌面后续复用 | reviewed | server/index.mjs:384 |
| GET | `/api/notes/:id/transcript-history` | `/api/v1/notes/:id/transcript-history` | 无 | `offset` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/jobs/audio-jobs.mjs:50 |
| GET | `/api/notes/:id/transcription` | `/api/v1/notes/:id/transcription` | 无 | 无 | 200 application/json: TranscriptionState | Web；桌面后续复用 | reviewed | server/jobs/audio-jobs.mjs:57 |
| POST | `/api/notes/:id/transcription` | `/api/v1/notes/:id/transcription` | application/json: 内联对象 | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/jobs/audio-jobs.mjs:63 |
| PATCH | `/api/notes/:id/transcript` | `/api/v1/notes/:id/transcript` | application/json: 内联对象 | 无 | 200 application/json: Note | Web；桌面后续复用 | reviewed | server/jobs/audio-jobs.mjs:73 |
| GET | `/api/notes/:id/processing` | `/api/v1/notes/:id/processing` | 无 | 无 | 200 application/json: ProcessingState | Web；桌面后续复用 | reviewed | server/jobs/file-jobs.mjs:43 |
| POST | `/api/notes/:id/processing` | `/api/v1/notes/:id/processing` | application/json: 内联对象 | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/jobs/file-jobs.mjs:49 |
| GET | `/api/pet/reminders` | `/api/v1/pet/reminders` | 无 | 无 | 200 application/json: PetReminderSnapshot | Web；桌面后续复用 | reviewed | server/pet/pet-reminders.mjs:82 |
| GET | `/api/supervision/recap` | `/api/v1/supervision/recap` | 无 | `day`（必填） | 200 application/json: SupervisionRecapSnapshot | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:51 |
| POST | `/api/supervision/recap` | `/api/v1/supervision/recap` | application/json: 内联对象 | 无 | 200 application/json: SupervisionRecap | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:52 |
| GET | `/api/work-tasks/settings` | `/api/v1/work-tasks/settings` | 无 | 无 | 200 application/json: QuietHours | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:53 |
| POST | `/api/work-tasks/settings` | `/api/v1/work-tasks/settings` | application/json: QuietHours | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:54 |
| GET | `/api/work-runs/:id/evidence-history` | `/api/v1/work-runs/:id/evidence-history` | 无 | `before` | 200 application/json: EvidenceHistoryPage | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:55 |
| GET | `/api/work-runs/:id/evidence-history/:checkId` | `/api/v1/work-runs/:id/evidence-history/:checkId` | 无 | 无 | 200 application/json: EvidenceHistoryDetail | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:56 |
| GET | `/api/work-runs/:id/evidence-options` | `/api/v1/work-runs/:id/evidence-options` | 无 | `kind`（必填）、`q`、`offset`、`limit` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:57 |
| GET | `/api/work-runs/:id/evidence-sources` | `/api/v1/work-runs/:id/evidence-sources` | 无 | `refs` | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:58 |
| GET | `/api/work-tasks` | `/api/v1/work-tasks` | 无 | 无 | 200 application/json: WorkTaskList | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:59 |
| POST | `/api/work-tasks` | `/api/v1/work-tasks` | application/json: WorkTaskCreate | 无 | 200 application/json: WorkTask ∪ ResearchTask | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:62 |
| GET | `/api/work-tasks/:id/artifacts/:artifactId` | `/api/v1/work-tasks/:id/artifacts/:artifactId` | 无 | 无 | 200 text/markdown: string | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:60 |
| POST | `/api/work-tasks/:id/conditions` | `/api/v1/work-tasks/:id/conditions` | application/json: 内联对象 | 无 | 200 application/json: WorkTask | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:61 |
| POST | `/api/work-tasks/:id/action` | `/api/v1/work-tasks/:id/action` | application/json: WorkTaskAction | 无 | 200 application/json: WorkTask ∪ ResearchTask | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:63 |
| POST | `/api/work-runs/:id/action` | `/api/v1/work-runs/:id/action` | application/json: WorkRunAction | 无 | 200 application/json: WorkRunActionResult | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:64 |
| GET | `/api/threads/:id/web-policy` | `/api/v1/threads/:id/web-policy` | 无 | 无 | 200 application/json: ChatWebPolicy | Web；桌面后续复用 | reviewed | server/agent/chat-policy.mjs:18 |
| PATCH | `/api/threads/:id/web-policy` | `/api/v1/threads/:id/web-policy` | application/json: ChatWebPolicy | 无 | 200 application/json: ChatWebPolicy | Web；桌面后续复用 | reviewed | server/agent/chat-policy.mjs:19 |
| GET | `/api/chat-runs/:id` | `/api/v1/chat-runs/:id` | 无 | 无 | 200 application/json: ChatRun | Web；桌面后续复用 | reviewed | server/agent/chat-policy.mjs:20 |
