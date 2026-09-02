import { Schema } from "koishi";

export const AUTHOR_USER_OPENID = "3F0DEF52BA72AAA03F724C0561421242";
export const AUTHOR_GROUP_OPENID = "730DC6DE5344BEABAAB46D74A20231FD";

export interface Config {
  creatorUserOpenids: string[];
  creatorGroupIdentities: Array<{ groupOpenid: string; memberOpenid: string }>;
  commandPanel: { enabled: boolean; groupId: string };
  allowProactiveMessages: boolean;
}

export const Config: Schema<Config> = Schema.object({
  creatorUserOpenids: Schema.array(Schema.string()).default([AUTHOR_USER_OPENID]).description("必须修改：创造者私聊 user_openid。内置值是插件作者的 ID。"),
  creatorGroupIdentities: Schema.array(Schema.object({
    groupOpenid: Schema.string().required(),
    memberOpenid: Schema.string().required(),
  })).default([{ groupOpenid: AUTHOR_GROUP_OPENID, memberOpenid: AUTHOR_USER_OPENID }]).description("必须修改：创造者所在群的 group_openid 与 member_openid。内置值属于插件作者。"),
  commandPanel: Schema.object({
    enabled: Schema.boolean().default(true),
    groupId: Schema.string().default(AUTHOR_GROUP_OPENID).description("展示指令面板的 group_openid。默认值是作者的测试群，使用前必须修改。"),
  }).default({ enabled: true, groupId: AUTHOR_GROUP_OPENID }).description("QQ 群指令面板。"),
  allowProactiveMessages: Schema.boolean().default(false).description("是否允许 Business 明确要求的主动消息。普通回复过期后仍会丢弃。"),
});
