# 9.3 协议治理实施记录

2026-10-08。当前为**首批迁移已落地，9.3 尚未全部完成**。本轮只实施协议治理，不包含 Pi、Electron、skill 或 Android 接入。

## 已完成

1. 本地独立仓库：`/mnt/d/OpenResource/xiaojiu-contracts.git`（bare Git 仓库），消费位置 `contracts/` 为真实 Git Submodule；固定提交 `df04648d9953fdc712d20975bacf70f3a3034047`，标签 `v0.1.0`。`.gitmodules` 和 Submodule 指针随本次主项目发布提交，协议已发布至 `TU-U/xiaojiu-contracts`。
2. `contracts/openapi.json` 为唯一协议编辑源；格式 OpenAPI 3.1.1，协议版本 0.1.0，API 主版本路径 `/api/v1`。字段仍在逐步抽取，因此暂不发布声称全量稳定的 1.0.0。
3. 152 个既有 HTTP 操作逐项映射到新入口。设备认证明确映射到 `/api/v1/devices/*`，保留 `/api/mobile/v1/*`。旧接口继续服务旧客户端。
4. 后端从协议派生请求形状校验，使用 Ajv 8.20.0 / JSON Schema 2020-12。禁止强制类型转换、删除字段或填默认值。校验不改变请求指纹；业务事务、权限、opId、revision、自关联检查和记忆人工确认仍归原业务模块。
5. openapi-typescript 7.13.0 生成共享 TypeScript 类型及路由清单。Web 的 `src/types.ts` 改为引用生成类型；统一请求、图片和下载入口使用协议的 API 前缀。页面专有类型仍留在 Web。
6. 57 个操作已抽取本轮公共形状；92 个复杂操作仍标记 `legacy-owned`，3 个操作保留既有 410 退役行为。具体请求、响应、消费者与处理位置见 [逐接口清单](25-contract-migration-inventory.md)。不把空 Schema 算作完成。

## 新旧入口如何共存

`server/core/contracts.mjs` 在每个旧路由原来的注册位置增设对应 v1 路由，两者直接调用同一处理函数。没有通用前缀改写或写请求重定向。

- 保留公开登录/健康检查与后续鉴权中间件的原顺序，Cookie、Bearer、Origin 检查继续生效。
- 旧入口保留原校验及报错；v1 对已抽取的 JSON 请求先做共享形状检查，再做原业务检查。multipart 仍由上传处理器及业务代码解析、校验和清理文件。
- 路由登记与协议不一致时，启动/检查会报错，避免新增接口漏进协议清单。
- 图片、原文件、Markdown 及 ZIP 流保持原传输方式。当前搭子回答是一次 JSON 响应，没有虚构 SSE 支持。
- 不在写入已提交后通过响应校验阻断成功回执。代表性响应在定向测试中验证；其余字段继续按迁移清单抽取。

## 日常开发命令

修改 `contracts/openapi.json` 后执行：

```bash
npm run contracts:generate
npm run contracts:check
npm run contracts:inventory
```

生成文件不能手工改；`contracts:check` 检查生成物、路由覆盖及 Schema 编译。独立仓库也能通过自己的 `npm ci`、`npm run generate`、`npm run check` 工作。

变更发布顺序：先提交独立仓库并打新版本标签，再显式更新消费仓库指针。新旧路径共享业务版本号与游标，不能把协议升级当成数据重置。

## 远端状态与取回方式

独立协议仓库已发布到 [TU-U/xiaojiu-contracts](https://github.com/TU-U/xiaojiu-contracts)，`main` 和 `v0.1.0` 均指向上述固定提交。主项目仍发布到 [TU-U/personal-agent-xiaojiu](https://github.com/TU-U/personal-agent-xiaojiu)，两者用途不变。

`.gitmodules` 使用相对地址 `../xiaojiu-contracts.git`；本机消费仓库已取消本地路径覆写并同步为GitHub远端。本地 bare 仓库可作为备份，不再是正常拉取所必需的来源。

首次拉取项目：

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

若仓库权限有要求，使用有读取权限的GitHub身份。Submodule更新仍以主项目固定提交为准，不使用 `--remote` 自动追踪最新分支。以后发布新协议时，仍先推送协议提交与标签，再推送主项目引用。

## 验证与运行

- `node --test tests/contracts.test.mjs`：6 项通过。覆盖旧/新鉴权边界、设备令牌与 Cookie、跨路径幂等、版本冲突、游标一致、设置拒绝错误类型、带图要事及自关联校验、原文件与 ZIP 流、记忆候选保留。
- `npm run build`：通过。存在既有风格的包体积提示，不是构建失败。
- `bash scripts/test-browser.sh tests/e2e/contracts-web.spec.ts --project=desktop`：1 项通过，实测 v1 登录、记录保存、刷新及旧入口读取相同记录。
- 浏览器用例的路径匹配随网页入口更新；没有运行全量浏览器套件，没有做手机测试或打包，也没有调用真实付费模型。
- 当前 4317 服务已使用原环境和 `/mnt/d/OpenResource/PersonalAgent/.data` 重启，新旧健康检查均返回成功。后端日志仍在 `.data/logs/server.log`。

## 剩余迁移与后续发布约束

1. 92 个 `legacy-owned` 操作的完整请求 / 响应 / 查询参数抽取及对应局部前端类型迁移，主要分布在资料库、调研、监督、记账导入、上下文和诊断等业务。
2. 首批已抽取接口的更细查询参数、嵌套动态字段和全量响应契约覆盖仍要按业务继续补齐，不能把当前代表性验证当作全量接口验收。
3. 当前远端发布已完成；新版本仍须先发布协议再更新主项目指针，并验证全新目录可以拉取该提交。
4. Android 独立消费、Kotlin 工具兼容性与客户端升级证据；桌面阶段复用 Web。本轮不启动这两端。

这些范围未完成前，架构第 9.3 节保持“部分实施”，不标记多端治理完成。
