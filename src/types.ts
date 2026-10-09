import type { Session } from "koishi";
export type { QqSender,QqSendOptions } from "./contracts";

export interface RawQqMessage {
  group_openid?: string; group_id?: string; user_openid?: string; member_openid?: string;
  author?: { id?: string; member_openid?: string };
}
export type QqSession = Session & { qq?: { id?: string; d?: RawQqMessage } };
