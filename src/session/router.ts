import type { Context, Session } from "koishi";
import type { Config } from "../../config";
import type { QqSender } from "../types";
import { friendlyBusinessError } from "../errors";
import { normalizeQqContent } from "./content";
import { qqbotIdentity } from "./identity";
import { COCOFAITH_QQ_ADAPTER_VERSION } from "../version";

export function isQqAddressed(session: Session, mode: Config["receiveMode"] = "mention") {
  return mode === "all" || session.isDirect || !!session.stripped?.appel;
}

export async function resolveQqBotUid(ctx: Context, session: Session) {
  const identity = qqbotIdentity(session);
  return identity ? ctx.faithCore.adapter.resolve(identity) : null;
}

export async function dispatchQqSession(ctx: Context, session: Session, sender: QqSender, normalizedContent = normalizeQqContent(session)) {
  const identity = qqbotIdentity(session);
  if (!identity) {
    await sender.sendText(session, "无法读取你的 QQ 身份，请稍后重试；若持续出现，请检查 QQ Bot 事件权限与适配器版本。");
    return true;
  }
  const response = await ctx.faithBusiness.dispatch({
    uid: await ctx.faithCore.adapter.resolve(identity),
    identity,
    scene: session.isDirect ? "private" : "group",
    content: normalizedContent,
    channelId: session.channelId,
    roomKey: JSON.stringify(["qq", session.selfId, session.channelId]),
    eventId: session.messageId,
    displayName: session.username,
    adapter: { name: "CoCoFaith Adapter QQ", version: COCOFAITH_QQ_ADAPTER_VERSION, allowRegistration: true },
    reply: (result) => sender.sendResult(session, result),
  });
  if (!response.matched) return false;
  if ("error" in response) await sender.sendText(session, friendlyBusinessError(response.error));
  else await sender.sendResult(session, response.result);
  return true;
}
