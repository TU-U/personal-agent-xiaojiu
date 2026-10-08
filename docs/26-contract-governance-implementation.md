# 9.3 协议治理实施记录

> 后续更新：Pi阶段新增4个操作，当前协议为 **0.3.0**（153现行+3退役、159个具名Schema），见[27](27-pi-agent-implementation.md)。下文0.2.0数量和验证保留为该批次历史。

2026-10-08。**服务端与 Web 的协议迁移已完成；Android 消费协议、Electron 桌面壳仍属于后续阶段。** 本轮没有接入 Pi、skill 或手机端。

## 本轮交付

- 独立仓库：[TU-U/xiaojiu-contracts](https://github.com/TU-U/xiaojiu-contracts)。主项目的 `contracts/` 是真实 Submodule，锁定协议提交；发布版本 **0.2.0**（标签 `v0.2.0`，提交 `991d0aa`，已推送 GitHub），API 主路径仍为 `/api/v1`，OpenAPI 格式为 3.1.1。
- 全部 **152 个 HTTP 操作**：149 个现行操作已有明确请求、响应及适用查询参数，3 个退役操作保持 410。原先 92 个 `legacy-owned` 已清零。155 个具名 Schema，见[逐接口清单](25-contract-migration-inventory.md)。这表示字段迁移完成，不表示所有业务场景都做过端到端验收。
- 覆盖资料库、调研、监督、记账导入、分类/项目、音频转写、记忆审核、话题上下文、设置与诊断。调研任务本体和详情、账单批次摘要和详情分别建模；复杂 `action` 请求按动作分支定义。
- `src/types.ts` 及页面公共传输类型引用生成类型。67 处具体读取请求、49 处具体写入请求按 operationId 推导输入/输出，避免任意手写响应泛型；上传和持久化重试队列继续使用公共传输函数，后端执行相同协议校验。UI 草稿、React 状态、导航类型留在页面。
- 首批协议补充了要事 AI 草稿的 `removedSuggestions`、输入来源回执、下载参数以及可空/历史状态字段；原有业务规则保留。

## 新旧入口与校验职责

`server/core/contracts.mjs` 在旧路由原注册位置添加 v1 路由，调用同一业务处理函数。没有重定向写请求，也没有更换数据库或重置游标。

- Cookie、设备 Bearer、Origin 与公开登录的鉴权顺序不变。旧 `/api/...` 和 `/api/mobile/v1/...` 保留；设备新入口是 `/api/v1/devices/*`。
- v1 JSON 请求先按协议检查形状，路径/查询参数检查原始 URL 值；原 Zod 继续处理默认值、规范化、数值范围、日期和状态规则。Ajv 不强转类型、不插入默认值、不删字段，不改 opId 指纹。
- 关联是否存在、是否关联自身、revision 是否过期、记忆冲突与人工确认仍在业务事务内检查。Schema 不代替这些检查。
- multipart 仍由 Multer 和原业务处理器校验、落盘及失败清理。图片、原文件、Markdown、ZIP 保持字节/流传输。当前 `/ask` 返回一次 JSON，不声称已实现 SSE。
- 响应不在数据库提交后阻断返回。可设置 `CONTRACT_RESPONSE_DIAGNOSTICS=true` 在后端终端输出 `[contract-response]` 诊断，只记录 operationId、状态与 Schema 路径，不记录正文或密钥。诊断不改变返回结果。
- 能力探测和 AI 日志中有明确标注的供应商诊断扩展字段；业务导出包含历史实体，不把历史未知字段自动删除。

## 开发与发布

唯一协议编辑源为 `contracts/openapi.json`，生成物禁止手改：

```bash
npm run contracts:generate
npm run contracts:check
npm run contracts:inventory
npm run build
```

检查包含：生成物是否过期、实际路由是否齐全、具名及内联 Schema 是否可编译、是否仍有 `legacy-owned` 或空成功响应。独立协议仓库也可以自行 `npm ci` / `npm run generate` / `npm run check`。

发布顺序：**先推送协议提交与新版本标签，再更新并推送主项目 Submodule 指针**。不重写已发布的 v0.1.0，不使用 `submodule update --remote` 偷换消费版本。0.x 期间仍须逐项审查破坏性变化；字段迁移完成不自动升级成稳定的 1.0.0。删除字段、增加必填输入、收紧合法值或改变鉴权必须另列兼容方案。

首次拉取：

```bash
git clone --recurse-submodules https://github.com/TU-U/personal-agent-xiaojiu.git
cd personal-agent-xiaojiu
npm ci
```

已有项目：

```bash
git pull --ff-only
git submodule sync -- contracts
git submodule update --init --recursive
```

## 验证范围

`node --test tests/contracts.test.mjs` 的 10 项定向 HTTP 测试通过。响应按对应 operation 的 Schema 校验，覆盖：鉴权、新旧幂等与版本冲突、原始请求不被改写、带图要事、自关联拒绝、上传下载与 ZIP、记忆候选、复杂模块读取、类别/项目关联、待办升级监督、调研创建/取消、真实 Excel 导入/核对/确认入账和业务导出。

网页仅运行协议冒烟：登录 → 保存记录 → 刷新 → 新旧接口读取一致。另运行类型/生产构建和协议一致性检查。没有跑全套浏览器测试，没有付费模型调用，没有操作真实用户数据进行测试。

本机 4317 服务已保留原环境和 `.data` 目录重启，新接口健康检查返回 `X-Contract-Version: 0.2.0`。网页刷新即可加载本次构建；日志仍为 `.data/logs/server.log`。

## 后续边界

- Android 在独立仓库接入固定协议版本并验证 Kotlin 消费方式；本轮不测试或打包手机。
- Electron 复用同源 Web 与后端，本轮未创建桌面壳。
- Pi 与 skill 属于独立架构阶段。不能用本次协议迁移声称已完成这些能力。
- 后续新增接口、状态或响应字段，先更新协议与版本，再更新消费者；本次代表性测试不能替代未来业务验收。
