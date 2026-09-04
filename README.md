# CoCoFaith Adapter QQ

CoCoFaith v3 的 QQ 官方机器人适配

用于对接 `koishi-plugin-adapter-qq`

## 源码结构

```text
src/
├── session/            # QQ 事件内容与身份解析
├── messaging/          # Markdown、纯文本降级与发送额度
├── panel/              # QQ 群指令面板同步
├── errors.ts           # Business 错误提示映射
├── types.ts            # QQ Adapter 公共类型
└── index.ts            # 固定接入流程与 Koishi 插件入口
```

平台事件只在 `session` 中转换，Business 结果只在 `messaging` 中渲染。新增玩法不应改动此插件。

## 使用前配置

> 创造者和群组的默认值属于@Mueo。部署自己的机器人前必须修改，否则你不会拥有创造者权限，指令面板也会同步到错误的群

配置定义位于根目录 [`config.ts`](./config.ts)：

- `creatorUserOpenids`：创造者私聊 `user_openid` 列表。
- `creatorGroupIdentities`：创造者的 `group_openid/member_openid` 配对。
- `commandPanel.groupId`：展示指令面板的群 `group_openid`。
- `allowProactiveMessages`：是否接受 Business 要求的主动消息，默认关闭。
- `receiveMode`：群聊接收模式，`mention`（只接受艾特，默认）或 `all`（全部接收）。

## 消息行为

- 群聊默认只处理艾特机器人的命令；切换为“全部接收”后，不艾特也可以使用命令。
- 全部接收需要 QQ 平台实际下发全量群消息，配置本身不会开通事件权限。
- 普通聊天先经过 Business 命令索引筛选，不查询 UID、不执行玩法。业务启停后索引随之更新。
- 私聊消息直接处理。
- 回复会艾特发起用户。
- 默认只发一条紧凑 Markdown；超长内容截断。
- Markdown 失败时降级为纯文本。
- 超过被动回复时限的普通结果直接丢弃。
- 房间后续文本回复复用对应玩家消息的凭证，五分钟内最多五次（降级尝试也计数）。额度用完直接跳过，不转主动消息、不暂停游戏。
- 轮盘升级提示合并在结算正文中；命令结束时使用该命令的凭证，超时结束时使用房间最近保存的参赛者凭证。全服公告字段不在 QQ 广播，也不会因此启用主动消息。

私聊使用 `qqbot_user_openid/private_chat`。群聊使用 `qqbot_member_openid/group_chat`，并将 `group_openid` 写入 `scope_value`。

插件会创建或更新 `faith-v3-command-panel`，并接管旧版 `faith-qq-command-panel`。面板同步前会检查数量、名称和描述长度。

版本变化见 [CHANGELOG.md](./CHANGELOG.md)。
