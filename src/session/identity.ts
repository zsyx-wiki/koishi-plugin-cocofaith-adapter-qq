import type { Session } from "koishi";
import type { IdentityInput } from "@mueo/koishi-plugin-cocofaith-core";
import type { QqSession, RawQqMessage } from "../types";

function first(...values: unknown[]) { return values.find((value): value is string => typeof value === "string" && !!value.trim())?.trim(); }
export function rawQqMessage(session: Session): RawQqMessage | undefined { return (session as QqSession).qq?.d; }
export function qqbotIdentity(session: Session): IdentityInput | null {
  if (session.platform !== "qq") return null;
  const raw = rawQqMessage(session);
  if (session.isDirect) {
    const value = first(raw?.user_openid, raw?.author?.id, session.userId);
    return value ? { adapter: "qqbot", type: "qqbot_user_openid", value, scope: "private_chat" } : null;
  }
  const group = first(raw?.group_openid, raw?.group_id, session.guildId, session.channelId);
  const member = first(raw?.member_openid, raw?.author?.member_openid, raw?.author?.id, session.userId);
  return group && member ? { adapter: "qqbot", type: "qqbot_member_openid", value: member, scope: "group_chat", scopeValue: group } : null;
}
