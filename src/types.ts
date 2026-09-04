import type { Session } from "koishi";

export interface RawQqMessage {
  group_openid?: string; group_id?: string; user_openid?: string; member_openid?: string;
  author?: { id?: string; member_openid?: string };
}
export type QqSession = Session & { qq?: { id?: string; d?: RawQqMessage } };
export interface QqSendOptions { proactiveRequired?: boolean; }
export interface QqSender { sendText(session: Session, content: string, options?: QqSendOptions): Promise<unknown>; sendResult(session: Session, result: import("@mueo/koishi-plugin-cocofaith-business").BusinessResult): Promise<unknown>; }
