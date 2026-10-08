# 9.3 接口迁移清单

由 `npm run contracts:inventory` 从协议和实际路由生成，不把路径接通当作字段抽取完成。

协议版本：0.1.0；共 152 个操作。已抽取形状 57；业务模块继续负责、待抽取 92；已退役 3。

新旧路径均调用同一处理函数；鉴权、事务、revision、opId、游标和附件存储不切换。错误仍为原 HTTP 状态与 `{error,current?}`。

- `reviewed`：已抽取公共形状。新 JSON 请求使用共享形状校验，原业务校验继续执行；multipart 由原上传/业务处理器校验和清理文件。响应暂不在写入完成后阻断返回，代表路径在集成测试中校验。
- `legacy-owned`：路径与传输已盘点，具体字段尚未全部抽取；前端该部分仍使用既有局部类型，不能计为完整强类型接入。
- `retired`：已有 410 接口，迁移不重新开放。
- 当前 /ask 为 JSON；ZIP 下载是流式字节输出，不代表聊天支持 SSE。未来新增流式事件需先补协议。
- 资料库、调研、监督、记账复杂动作等剩余字段以此表为继续迁移清单。Android单独接入，未做手机测试或打包。

| 方法 | 旧路径 | v1路径 | 请求 | 响应 | 消费者 | 字段状态 | 当前处理器 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/research-search-settings` | `/api/v1/research-search-settings` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/research/research-tasks.mjs:137 |
| POST | `/api/research-search-settings` | `/api/v1/research-search-settings` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/research/research-tasks.mjs:138 |
| POST | `/api/research-tasks` | `/api/v1/research-tasks` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/research/research-tasks.mjs:139 |
| GET | `/api/research-tasks/:id/external/:sourceId` | `/api/v1/research-tasks/:id/external/:sourceId` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/research/research-tasks.mjs:140 |
| GET | `/api/research-tasks/:id` | `/api/v1/research-tasks/:id` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/research/research-tasks.mjs:141 |
| POST | `/api/research-tasks/:id/action` | `/api/v1/research-tasks/:id/action` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/research/research-tasks.mjs:142 |
| GET | `/api/research-sources` | `/api/v1/research-sources` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/research/research-tasks.mjs:143 |
| POST | `/api/source-threads` | `/api/v1/source-threads` | application/json: SourceThreadRequest | 200 application/json: SourceThread | Web；桌面后续复用 | reviewed | server/agent/source-threads.mjs:41 |
| GET | `/api/threads` | `/api/v1/threads` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/source-threads.mjs:42 |
| GET | `/api/threads/:id/turns` | `/api/v1/threads/:id/turns` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/agent/source-threads.mjs:43 |
| GET | `/api/settings/storage` | `/api/v1/settings/storage` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/core/backups/backup-routes.mjs:12 |
| POST | `/api/backups` | `/api/v1/backups` | application/json: EmptyRequest | 201 application/json: BackupReceipt | Web；桌面后续复用 | reviewed | server/core/backups/backup-routes.mjs:16 |
| GET | `/api/backups/:id/download` | `/api/v1/backups/:id/download` | 无 | 200 application/zip: string | Web；桌面后续复用 | reviewed | server/core/backups/backup-routes.mjs:25 |
| POST | `/api/backups/:id/verify-restore` | `/api/v1/backups/:id/verify-restore` | application/json: EmptyRequest | 200 application/json: RestoreReceipt | Web；桌面后续复用 | reviewed | server/core/backups/backup-routes.mjs:34 |
| GET | `/api/settings/capabilities` | `/api/v1/settings/capabilities` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/core/capabilities.mjs:51 |
| POST | `/api/settings/capabilities/:id/test` | `/api/v1/settings/capabilities/:id/test` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/core/capabilities.mjs:52 |
| GET | `/api/mobile/v1/capabilities` | `/api/v1/devices/capabilities` | 无 | 200 application/json: DeviceCapabilities | 设备客户端（Android未接入v1） | reviewed | server/core/device-auth.mjs:20 |
| POST | `/api/mobile/v1/session` | `/api/v1/devices/session` | application/json: DeviceLoginRequest | 200 application/json: DeviceSession | 设备客户端（Android未接入v1） | reviewed | server/core/device-auth.mjs:30 |
| DELETE | `/api/mobile/v1/session` | `/api/v1/devices/session` | 无 | 200 application/json: Ok | 设备客户端（Android未接入v1） | reviewed | server/core/device-auth.mjs:63 |
| GET | `/api/accounting/imports/:id/classifications` | `/api/v1/accounting/imports/:id/classifications` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-classification.mjs:42 |
| POST | `/api/accounting/imports/:id/classify` | `/api/v1/accounting/imports/:id/classify` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-classification.mjs:43 |
| POST | `/api/accounting/imports/:id/review` | `/api/v1/accounting/imports/:id/review` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-import-review.mjs:85 |
| POST | `/api/accounting/imports/:id/commit` | `/api/v1/accounting/imports/:id/commit` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-import-review.mjs:86 |
| GET | `/api/accounting/imports/:id/reviews` | `/api/v1/accounting/imports/:id/reviews` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-import-review.mjs:87 |
| GET | `/api/accounting/imports` | `/api/v1/accounting/imports` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-imports.mjs:95 |
| POST | `/api/accounting/imports` | `/api/v1/accounting/imports` | multipart/form-data: 内联对象 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-imports.mjs:96 |
| GET | `/api/accounting/imports/:id` | `/api/v1/accounting/imports/:id` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-imports.mjs:97 |
| POST | `/api/accounting/imports/:id/reparse` | `/api/v1/accounting/imports/:id/reparse` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-imports.mjs:98 |
| GET | `/api/accounting/imports/:id/original` | `/api/v1/accounting/imports/:id/original` | 无 | 200 */*: string | Web；桌面后续复用 | reviewed | server/domain/accounting/accounting-imports.mjs:99 |
| PATCH | `/api/accounting/budget` | `/api/v1/accounting/budget` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-settings.mjs:21 |
| GET | `/api/accounting/checks` | `/api/v1/accounting/checks` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-settings.mjs:22 |
| POST | `/api/accounting/checks/confirm` | `/api/v1/accounting/checks/confirm` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-settings.mjs:23 |
| GET | `/api/accounting/view` | `/api/v1/accounting/view` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/accounting/accounting-statistics.mjs:25 |
| GET | `/api/event-references` | `/api/v1/event-references` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/events/event-relations.mjs:16 |
| POST | `/api/event-references/resolve` | `/api/v1/event-references/resolve` | application/json: ReferenceResolveRequest | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/events/event-relations.mjs:21 |
| GET | `/api/library/:id/tasks` | `/api/v1/library/:id/tasks` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library-task-links.mjs:46 |
| POST | `/api/library/:id/tasks` | `/api/v1/library/:id/tasks` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library-task-links.mjs:52 |
| GET | `/api/work-tasks/:id/library` | `/api/v1/work-tasks/:id/library` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library-task-links.mjs:53 |
| DELETE | `/api/work-tasks/:id/library/:sourceId` | `/api/v1/work-tasks/:id/library/:sourceId` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library-task-links.mjs:54 |
| GET | `/api/library` | `/api/v1/library` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| GET | `/api/library/files` | `/api/v1/library/files` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| POST | `/api/library/scan` | `/api/v1/library/scan` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| POST | `/api/library/control` | `/api/v1/library/control` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| POST | `/api/library/decisions` | `/api/v1/library/decisions` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| POST | `/api/library/:id/decision` | `/api/v1/library/:id/decision` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| GET | `/api/library/search` | `/api/v1/library/search` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| PATCH | `/api/library/:id/metadata` | `/api/v1/library/:id/metadata` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| GET | `/api/library/:id/index` | `/api/v1/library/:id/index` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| POST | `/api/library/:id/index` | `/api/v1/library/:id/index` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| GET | `/api/library/:id` | `/api/v1/library/:id` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| POST | `/api/library/:id/analyze` | `/api/v1/library/:id/analyze` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/library/library.mjs:98 |
| GET | `/api/library/:id/file` | `/api/v1/library/:id/file` | 无 | 200 */*: string | Web；桌面后续复用 | reviewed | server/domain/library/library.mjs:98 |
| GET | `/api/categories` | `/api/v1/categories` | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:49 |
| POST | `/api/categories` | `/api/v1/categories` | application/json: CategoryCreate | 201 application/json: Category | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:50 |
| PATCH | `/api/categories/:id` | `/api/v1/categories/:id` | application/json: NameUpdate | 200 application/json: Category | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:54 |
| POST | `/api/notes/categories` | `/api/v1/notes/categories` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/categories.mjs:58 |
| GET | `/api/classification-corrections` | `/api/v1/classification-corrections` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/categories.mjs:59 |
| PATCH | `/api/classification-corrections/:id` | `/api/v1/classification-corrections/:id` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/categories.mjs:63 |
| GET | `/api/projects` | `/api/v1/projects` | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:67 |
| POST | `/api/projects` | `/api/v1/projects` | application/json: NameRequest | 201 application/json: Project | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:68 |
| PATCH | `/api/projects/:id` | `/api/v1/projects/:id` | application/json: NameUpdate | 200 application/json: Project | Web；桌面后续复用 | reviewed | server/domain/notes/categories.mjs:77 |
| POST | `/api/projects/:id/links` | `/api/v1/projects/:id/links` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/categories.mjs:78 |
| GET | `/api/projects/:id/candidates` | `/api/v1/projects/:id/candidates` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/categories.mjs:82 |
| GET | `/api/projects/:id/items` | `/api/v1/projects/:id/items` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/categories.mjs:87 |
| GET | `/api/notes/:id/classification` | `/api/v1/notes/:id/classification` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/classification.mjs:35 |
| POST | `/api/notes/:id/classification` | `/api/v1/notes/:id/classification` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/domain/notes/classification.mjs:40 |
| POST | `/api/todos/:id/carry` | `/api/v1/todos/:id/carry` | application/json: CarryTodoRequest | 200 application/json: Todo | Web；桌面后续复用 | reviewed | server/domain/notes/todo-days.mjs:25 |
| GET | `/api/health` | `/api/v1/health` | 无 | 200 application/json: Health | Web；桌面后续复用 | reviewed | server/index.mjs:81 |
| GET | `/api/session` | `/api/v1/session` | 无 | 200 application/json: Session | Web；桌面后续复用 | reviewed | server/index.mjs:82 |
| POST | `/api/login` | `/api/v1/login` | application/json: LoginRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:85 |
| GET | `/api/settings/worker` | `/api/v1/settings/worker` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:96 |
| POST | `/api/logout` | `/api/v1/logout` | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:107 |
| GET | `/api/bootstrap` | `/api/v1/bootstrap` | 无 | 200 application/json: Bootstrap | Web；桌面后续复用 | reviewed | server/index.mjs:108 |
| GET | `/api/changes` | `/api/v1/changes` | 无 | 200 application/json: Changes | Web；桌面后续复用 | reviewed | server/index.mjs:112 |
| GET | `/api/search` | `/api/v1/search` | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:113 |
| POST | `/api/todos/:id/upgrade` | `/api/v1/todos/:id/upgrade` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:133 |
| POST | `/api/todos` | `/api/v1/todos` | application/json: TodoCreate | 201 application/json: Todo | Web；桌面后续复用 | reviewed | server/index.mjs:134 |
| PATCH | `/api/todos/:id` | `/api/v1/todos/:id` | application/json: TodoPatch | 200 application/json: Todo | Web；桌面后续复用 | reviewed | server/index.mjs:135 |
| DELETE | `/api/todos/:id` | `/api/v1/todos/:id` | application/json: RevisionRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:136 |
| GET | `/api/transactions` | `/api/v1/transactions` | 无 | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:137 |
| POST | `/api/transactions` | `/api/v1/transactions` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:138 |
| PATCH | `/api/transactions/:id` | `/api/v1/transactions/:id` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:139 |
| DELETE | `/api/transactions/:id` | `/api/v1/transactions/:id` | application/json: RevisionRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:140 |
| POST | `/api/transactions/import/preview` | `/api/v1/transactions/import/preview` | 无 | 410 application/json: Error | Web；桌面后续复用 | retired | server/index.mjs:147 |
| POST | `/api/transactions/import/commit` | `/api/v1/transactions/import/commit` | 无 | 410 application/json: Error | Web；桌面后续复用 | retired | server/index.mjs:147 |
| POST | `/api/transactions/ocr` | `/api/v1/transactions/ocr` | 无 | 410 application/json: Error | Web；桌面后续复用 | retired | server/index.mjs:148 |
| POST | `/api/pet/chat` | `/api/v1/pet/chat` | application/json: PetChatRequest | 200 application/json: PetChatReply | Web；桌面后续复用 | reviewed | server/index.mjs:149 |
| POST | `/api/notes` | `/api/v1/notes` | application/json: NoteCreate | 200 application/json: Note<br>201 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:150 |
| PATCH | `/api/notes/:id` | `/api/v1/notes/:id` | application/json: NotePatch | 200 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:155 |
| DELETE | `/api/notes/:id` | `/api/v1/notes/:id` | application/json: RevisionRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:156 |
| POST | `/api/notes/:id/summarize` | `/api/v1/notes/:id/summarize` | 无 | 200 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:160 |
| POST | `/api/events/suggest` | `/api/v1/events/suggest` | application/json: EventSuggestRequest | 200 application/json: 内联对象 | Web；桌面后续复用 | reviewed | server/index.mjs:178 |
| POST | `/api/events` | `/api/v1/events` | application/json: EventCreate | 201 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:204 |
| PATCH | `/api/events/:id` | `/api/v1/events/:id` | application/json: EventPatch | 200 application/json: EventRecord | Web；桌面后续复用 | reviewed | server/index.mjs:205 |
| DELETE | `/api/events/:id` | `/api/v1/events/:id` | application/json: RevisionRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:212 |
| POST | `/api/events/:id/check` | `/api/v1/events/:id/check` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:206 |
| GET | `/api/events/:id/checks` | `/api/v1/events/:id/checks` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:207 |
| POST | `/api/events/:id/schedule` | `/api/v1/events/:id/schedule` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:208 |
| POST | `/api/events/:id/snooze` | `/api/v1/events/:id/snooze` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:209 |
| POST | `/api/events/:id/end` | `/api/v1/events/:id/end` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:210 |
| POST | `/api/events/:id/confirm` | `/api/v1/events/:id/confirm` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:211 |
| GET | `/api/events/:id/image/:imageId` | `/api/v1/events/:id/image/:imageId` | 无 | 200 image/*: string | Web；桌面后续复用 | reviewed | server/index.mjs:213 |
| GET | `/api/computer-files` | `/api/v1/computer-files` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:243 |
| POST | `/api/computer-files/import` | `/api/v1/computer-files/import` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:248 |
| POST | `/api/import` | `/api/v1/import` | multipart/form-data: 内联对象 | 200 application/json: Note<br>201 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:258 |
| POST | `/api/notes/:id/images` | `/api/v1/notes/:id/images` | multipart/form-data: 内联对象 | 200 application/json: Note<br>201 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:264 |
| DELETE | `/api/notes/:id/images/:attachment` | `/api/v1/notes/:id/images/:attachment` | application/json: RevisionRequest | 200 application/json: Note | Web；桌面后续复用 | reviewed | server/index.mjs:276 |
| GET | `/api/notes/:id/file/:attachment` | `/api/v1/notes/:id/file/:attachment` | 无 | 200 */*: string | Web；桌面后续复用 | reviewed | server/index.mjs:285 |
| POST | `/api/search-brief` | `/api/v1/search-brief` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:295 |
| GET | `/api/threads/:id/context` | `/api/v1/threads/:id/context` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:303 |
| POST | `/api/threads/:id/context` | `/api/v1/threads/:id/context` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:304 |
| POST | `/api/ask` | `/api/v1/ask` | application/json: AskRequest | 200 application/json: Conversation | Web；桌面后续复用 | reviewed | server/index.mjs:305 |
| GET | `/api/conversations/:id` | `/api/v1/conversations/:id` | 无 | 200 application/json: Conversation | Web；桌面后续复用 | reviewed | server/index.mjs:326 |
| DELETE | `/api/conversations/:id` | `/api/v1/conversations/:id` | application/json: RevisionRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:329 |
| PATCH | `/api/conversations/:id/memory-proposals/:index` | `/api/v1/conversations/:id/memory-proposals/:index` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:327 |
| POST | `/api/conversations/:id/memory-review` | `/api/v1/conversations/:id/memory-review` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:328 |
| DELETE | `/api/threads/:id` | `/api/v1/threads/:id` | 无 | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:330 |
| POST | `/api/tasks` | `/api/v1/tasks` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:331 |
| GET | `/api/artifacts/:id` | `/api/v1/artifacts/:id` | 无 | 200 application/json: Artifact | Web；桌面后续复用 | reviewed | server/index.mjs:339 |
| PATCH | `/api/artifacts/:id` | `/api/v1/artifacts/:id` | application/json: ArtifactUpdate | 200 application/json: Artifact | Web；桌面后续复用 | reviewed | server/index.mjs:341 |
| DELETE | `/api/artifacts/:id` | `/api/v1/artifacts/:id` | application/json: RevisionRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:342 |
| GET | `/api/artifacts/:id/download` | `/api/v1/artifacts/:id/download` | 无 | 200 text/markdown: string | Web；桌面后续复用 | reviewed | server/index.mjs:340 |
| POST | `/api/memories` | `/api/v1/memories` | application/json: MemoryCreate | 201 application/json: Memory | Web；桌面后续复用 | reviewed | server/index.mjs:343 |
| GET | `/api/memories/:id/source-review` | `/api/v1/memories/:id/source-review` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:344 |
| PATCH | `/api/memories/:id` | `/api/v1/memories/:id` | application/json: MemoryPatch | 200 application/json: Memory | Web；桌面后续复用 | reviewed | server/index.mjs:345 |
| DELETE | `/api/memories/:id` | `/api/v1/memories/:id` | application/json: RevisionRequest | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:346 |
| GET | `/api/settings` | `/api/v1/settings` | 无 | 200 application/json: Settings | Web；桌面后续复用 | reviewed | server/index.mjs:347 |
| PATCH | `/api/settings` | `/api/v1/settings` | application/json: SettingsPatch | 200 application/json: Ok | Web；桌面后续复用 | reviewed | server/index.mjs:348 |
| POST | `/api/settings/test` | `/api/v1/settings/test` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:361 |
| GET | `/api/ai/logs` | `/api/v1/ai/logs` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:368 |
| GET | `/api/export` | `/api/v1/export` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/index.mjs:369 |
| GET | `/api/notes/:id/transcript-history` | `/api/v1/notes/:id/transcript-history` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/jobs/audio-jobs.mjs:50 |
| GET | `/api/notes/:id/transcription` | `/api/v1/notes/:id/transcription` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/jobs/audio-jobs.mjs:57 |
| POST | `/api/notes/:id/transcription` | `/api/v1/notes/:id/transcription` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/jobs/audio-jobs.mjs:63 |
| PATCH | `/api/notes/:id/transcript` | `/api/v1/notes/:id/transcript` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/jobs/audio-jobs.mjs:73 |
| GET | `/api/notes/:id/processing` | `/api/v1/notes/:id/processing` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/jobs/file-jobs.mjs:43 |
| POST | `/api/notes/:id/processing` | `/api/v1/notes/:id/processing` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/jobs/file-jobs.mjs:49 |
| GET | `/api/pet/reminders` | `/api/v1/pet/reminders` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/pet-reminders.mjs:82 |
| GET | `/api/supervision/recap` | `/api/v1/supervision/recap` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:51 |
| POST | `/api/supervision/recap` | `/api/v1/supervision/recap` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:52 |
| GET | `/api/work-tasks/settings` | `/api/v1/work-tasks/settings` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:53 |
| POST | `/api/work-tasks/settings` | `/api/v1/work-tasks/settings` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:54 |
| GET | `/api/work-runs/:id/evidence-history` | `/api/v1/work-runs/:id/evidence-history` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:55 |
| GET | `/api/work-runs/:id/evidence-history/:checkId` | `/api/v1/work-runs/:id/evidence-history/:checkId` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:56 |
| GET | `/api/work-runs/:id/evidence-options` | `/api/v1/work-runs/:id/evidence-options` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:57 |
| GET | `/api/work-runs/:id/evidence-sources` | `/api/v1/work-runs/:id/evidence-sources` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:58 |
| GET | `/api/work-tasks` | `/api/v1/work-tasks` | 无 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:59 |
| POST | `/api/work-tasks` | `/api/v1/work-tasks` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:62 |
| GET | `/api/work-tasks/:id/artifacts/:artifactId` | `/api/v1/work-tasks/:id/artifacts/:artifactId` | 无 | 200 text/markdown: string | Web；桌面后续复用 | reviewed | server/pet/supervision/work-tasks.mjs:60 |
| POST | `/api/work-tasks/:id/conditions` | `/api/v1/work-tasks/:id/conditions` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:61 |
| POST | `/api/work-tasks/:id/action` | `/api/v1/work-tasks/:id/action` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:63 |
| POST | `/api/work-runs/:id/action` | `/api/v1/work-runs/:id/action` | application/json: 待抽取 | 200 application/json: 待抽取 | Web；桌面后续复用 | legacy-owned | server/pet/supervision/work-tasks.mjs:64 |
