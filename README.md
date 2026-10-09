<div align="center">
  <h1>CoCoFaith Adapter QQ</h1>

  <p><strong>CoCoFaith v3 的 QQ 官方机器人接入</strong></p>

  <p>
    <img alt="Koishi" src="https://img.shields.io/badge/Koishi-4.16%2B-60a5fa?style=flat-square">
    <img alt="Version" src="https://img.shields.io/badge/version-3.0.0--alpha.4-a78bfa?style=flat-square">
    <img alt="License" src="https://img.shields.io/badge/License-GPL--3.0-52b788?style=flat-square">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white">
  </p>
</div>

---

把 QQ 官方机器人消息交给 CoCoFaith Business，支持 Markdown 回复、纯文本降级和群指令面板。

## 安装

```sh
npm install @mueo/koishi-plugin-cocofaith-core@alpha @mueo/koishi-plugin-cocofaith-business@alpha @mueo/koishi-plugin-cocofaith-adapter-qq@alpha
```

先配置 Koishi 的 `adapter-qq` 机器人连接，添加 Core、Business，
再添加 `@mueo/cocofaith-adapter-qq`。

## 配置

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `mode` | `binding` | `binding` 仅处理群聊“椰子水”命令；`normal` 处理完整玩法 |
| `receiveMode` | `mention` | `mention` 仅响应艾特；`all` 接收全部群消息 |
| `creatorUserOpenids` | 作者 ID | 创造者私聊 `user_openid` |
| `creatorGroupIdentities` | 作者 ID | 创造者的 `group_openid`、`member_openid` 配对 |
| `commandPanel.enabled` | `true` | 同步群指令面板 |
| `commandPanel.groupId` | 作者测试群 | 指令面板所在群 |
| `allowProactiveMessages` | `false` | 允许 Business 明确要求的主动消息 |

使用前替换内置的作者身份和测试群号；不用指令面板时关闭 `commandPanel.enabled`。
完整玩法设为 `normal`，绑定模式不接收私聊，也不创建完整指令面板。
`receiveMode: all` 需要 QQ 平台向机器人下发相应群消息事件。

## 回复

普通回复先艾特用户，再显示正文；Markdown 发送失败时改用纯文本。
被动回复凭证过期或额度用完后丢弃消息。主动发送需要同时满足 Business 的响应要求、
`allowProactiveMessages` 配置和 QQ 平台权限。

版本记录见 [CHANGELOG.md](./CHANGELOG.md)。许可证：GPL-3.0-or-later。
