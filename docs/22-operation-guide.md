# 当前网页版本：运行、诊断与数据恢复

适用：当前 PersonalAgent 网页端与服务端。功能覆盖和未完成项见 [开发记录](20-development-progress.md)，本说明不表示全部验收完成。

## 运行网页与实时修改

在 `/mnt/d/OpenResource/PersonalAgent` 执行命令。

- 日常构建版本：`bash scripts/start.sh`，打开 `http://localhost:4317`。脚本只在缺少dist时自动构建；修改网页代码后需要先 `npm run build` 才会更新构建版本。
- 开发预览：`npm run dev`，打开 `http://localhost:5173`，修改React/CSS可实时看到变化，不需要APK。服务端由watch模式重启，浏览器前台开发与构建版是不同入口。
- `scripts/start.sh`发现4317健康时会直接复用现有服务，不会替换已运行的后端；服务端源码改动后不能只运行该脚本就认为更新生效。
- 启动dev前先确认4317没有另一份API占用；不要同时启动两份服务端。保留现有局域网范围，本说明不增加公网映射。
- Vite限制直接读取`.data`、`.local-runtime`、私有模型配置等路径。业务API仍需登录；演示口令可继续使用。

## 看日志与能力状态

“设置与数据 → 后端AI调用日志”展示请求、结果、错误及关联编号；完整输出也在启动终端。

```bash
bash scripts/watch-server-log.sh
```

默认日志：`.data/logs/server.log`和`.data/logs/ai-interactions.jsonl`。自定义DATA_DIR时数据与日志跟随该目录。日志可能包含用户正文和模型输出，接口密钥与内联图片二进制会脱敏。

“分别检查每项能力”将文本、图片、embedding、向量库、搜索、语音转写、说话人分离、Redis分开。测试使用已保存配置，连接成功不是内容质量保证。语音探测只使用项目内公开英语样本前15秒，不读用户录音，最多90秒；准备方法见 [本地语音说明](../scripts/asr/README.md)。

“后台进程与任务状态”在展开时每10秒刷新。进程心跳和Redis连接分开于数据库任务状态；心跳超时是未确认，不等于任务数据丢失。队列异常时已保存任务仍在SQLite，具体错误与重试入口在对应记录/要事/调研页。`/api/health`只证明API存活。

## 数据在哪

“你的数据，随时带走 → 查看数据位置与磁盘空间”显示实际DATA_DIR和磁盘可用空间。这里的容量属于所在文件系统，不是应用独占用量。

| 位置 | 用途 |
| --- | --- |
| shiguang.sqlite | 记录、记忆原文、要事、会话、账目、任务、调研图及预算等权威数据 |
| uploads | 上传原件、音频、要事图片副本、账单原件 |
| library | 接入项目的资料副本；不修改E盘原件 |
| task-artifacts | 任务生成的独立文件 |
| backups | 完整备份；默认不带密钥/登录凭据 |
| logs | 服务与AI日志 |

Qdrant是可重建的检索索引，服务数据目录由检索启动配置管理。没有索引不能据此判断原文丢失；重建从SQLite和资料副本进行。

## 导出、完整备份与隔离恢复

JSON导出包含现存业务结构与资料解析正文，不含原件二进制、密钥、已删除数据或可直接续跑的后台检查点，不能作为完整恢复包。

网页可创建完整备份、下载ZIP、验证能否恢复。验证在新临时目录进行，结束后清理，不替换在线数据。完整备份包含SQLite一致性快照和附件/副本/成果清单与哈希；默认排除密钥和会话。Qdrant索引需重建，模型文件和依赖不随业务备份打包。

命令行示例（目标目录必须尚不存在）：

```bash
node scripts/backup-data.mjs create .data .data/backups/my-backup
node scripts/backup-data.mjs verify .data/backups/my-backup
node scripts/backup-data.mjs restore .data/backups/my-backup .data/isolated-restore
```

ZIP先解压到独立目录，再verify/restore；不要直接覆盖在线目录。完整性、清单、路径、哈希或附件引用不通过会中止。需要保留凭据的内部迁移备份才显式追加`--include-secrets`，该类备份不能通过网页下载。

隔离恢复成功不会切换线上数据。正式切换是单独的明确操作：停止旧服务并确认无写入、保留原目录、核对恢复结果和配置后再以新的DATA_DIR启动。当前goal不自动替换用户在线库。

## 当前验收边界

存储和worker面板真实网页、IPC及隔离Redis断线恢复已通过定向联验；先前本地listen EPERM已解除。2026-10-08正式4317后端更新后，worker与存储接口均200，worker及队列就绪；证据见 artifacts/backend-refresh-20261008.json。语音能力真实公开样本两项通过，不代表中文准确率或说话人数质量通过。具体证据见开发记录，不能用本文或旧服务PID代替实时验收。

2026-10-08：最近要事/调研提示词、调研字段错误与embedding失败日志已加载到正式4317，健康及worker就绪确认见 artifacts/backend-reload-verified-20261008.json。使用原数据目录与模型配置，前端构建无需变化。

## 记账静态检查

`npm run lint`（同`npm run lint:accounting`）仅检查记账前端、服务端与相关测试，使用ESLint/TypeScript推荐错误规则，不自动格式化或修复。当前不是全项目lint。`npm run check`继续负责网页TypeScript检查，`npm run build`包含类型检查与网页构建；只在相应代码变更后运行必要项。
