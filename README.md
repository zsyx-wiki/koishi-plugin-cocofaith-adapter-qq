<div align="center">
  <h1>CoCoFaith Adapter QQ</h1>

  <p><strong>CoCoFaith v3 的 QQ 官方机器人接入</strong></p>

  <p>
    <img alt="Koishi" src="https://img.shields.io/badge/Koishi-4.16%2B-60a5fa?style=flat-square">
    <img alt="Version" src="https://img.shields.io/badge/version-3.0.0--alpha.2-a78bfa?style=flat-square">
    <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-52b788?style=flat-square">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white">
  </p>
</div>

---

CoCoFaith Adapter QQ 负责接收 QQ 官方机器人事件、解析平台身份、调用 CoCoFaith Business，并将统一业务结果渲染为 QQ 支持的消息。

插件用于 `koishi-plugin-adapter-qq`，不包含具体玩法。新增普通玩法不需要修改本插件。

## 基础能力

- 解析 QQ 私聊和群聊身份
- 处理艾特、斜杠命令及平台附加前缀
- 将平台事件转换为统一 Business 请求
- 使用紧凑 Markdown 渲染回复
- Markdown 发送失败时降级为纯文本
- 管理被动回复凭证、回复次数和发送时限
- 同步 QQ 群指令面板
- 将 Business 错误码转换为用户提示

## 安装

```bash
npm install @mueo/koishi-plugin-cocofaith-core
npm install @mueo/koishi-plugin-cocofaith-business
npm install @mueo/koishi-plugin-cocofaith-adapter-qq
```

同时安装并配置 `koishi-plugin-adapter-qq`，然后按以下顺序加载：

```text
CoCoFaith Core
→ CoCoFaith Business
→ CoCoFaith Adapter QQ
```

## 使用前配置

> `creatorUserOpenids`、`creatorGroupIdentities` 和 `commandPanel.groupId` 内置的是作者测试账号与群组。部署前必须修改。

配置定义位于根目录 [`config.ts`](./config.ts)。

| 配置 | 默认值 | 说明 |
| --- | ---: | --- |
| `receiveMode` | `mention` | 群聊消息接收模式，可选 `mention` 或 `all` |
| `creatorUserOpenids` | 作者 ID | 创造者私聊 `user_openid` 列表 |
| `creatorGroupIdentities` | 作者 ID | 创造者的 `group_openid` 与 `member_openid` 配对 |
| `commandPanel.enabled` | `true` | 是否同步 QQ 群指令面板 |
| `commandPanel.groupId` | 作者测试群 | 指令面板所在群的 `group_openid` |
| `allowProactiveMessages` | `false` | 是否允许 Business 明确要求的主动消息 |

`receiveMode: mention` 只处理艾特机器人的群消息。设置为 `all` 后可以处理未艾特命令，但 QQ 开放平台仍需向机器人下发全量群消息事件。

创造者群聊身份必须同时填写 `group_openid` 和该群内的 `member_openid`。只填写其中一项不能正确识别权限。

## 身份映射

私聊身份写入：

```text
adapter: qqbot
type: qqbot_user_openid
scope: private_chat
```

群聊身份写入：

```text
adapter: qqbot
type: qqbot_member_openid
scope: group_chat
scope_value: group_openid
```

同一个 `member_openid` 在不同群聊中按不同作用域处理。Adapter 只能通过 Core 提供的身份接口解析或绑定 UID，不直接读写身份表。

## 消息行为

- 普通回复会先艾特发起用户，再换行显示正文
- 默认发送一条紧凑 Markdown，超长内容会截断
- Markdown 发送失败时自动改用纯文本
- 普通结果超过被动回复时限后直接丢弃，不转为主动消息
- 房间消息复用对应玩家的消息凭证；额度用完或凭证失效后不再发送
- 平台发送失败不会暂停 Business 中已经完成的操作
- 全服公告不会自动转换为 QQ 主动广播

只有 Business 明确将结果标记为必须主动发送，并且 `allowProactiveMessages` 已启用时，Adapter 才会尝试主动消息。是否能够发送仍受 QQ 开放平台权限和额度限制。

## 指令面板

启用后，插件会在指定群同步 CoCoFaith 的 QQ 指令面板。面板内容来自 Business 提供的稳定命令清单，不在 Adapter 中维护具体玩法逻辑。

同步前会检查命令数量以及名称、描述长度。QQ 接口拒绝请求时，错误会写入日志，不影响普通命令处理。

插件使用 `faith-v3-command-panel`，并接管旧版 `faith-qq-command-panel`，避免两个插件重复维护同一面板。

## 开发

```text
src/
├── session/      # 事件内容与身份解析
├── messaging/    # 消息渲染、降级与发送控制
├── panel/        # QQ 指令面板同步
├── errors.ts     # Business 错误提示映射
├── types.ts      # 公共类型
└── index.ts      # Koishi 插件入口
```

平台事件只在 `session` 中转换，Business 结果只在 `messaging` 中渲染。平台差异应留在 Adapter，玩法规则应留在 Business。

```bash
npm run build
npm test
```

版本记录见 [CHANGELOG.md](./CHANGELOG.md)。项目采用 GPL-3.0-or-later 许可证。
