import { Context, Session } from "koishi";
import { Config as ConfigSchema, type Config as QqConfig } from "../config";
import type {} from "@mueo/koishi-plugin-faith-core";
import type {} from "@mueo/koishi-plugin-faith-business";
import { QqMessageSender } from "./messaging/sender";
import { qqbotIdentity } from "./session/identity";
import { normalizeQqContent } from "./session/content";
import { friendlyBusinessError } from "./errors";
import { applyCommandPanel } from "./panel";
import type { QqSender } from "./types";

export const name = "faith-adapter-qq";
export const inject = ["faithCore", "faithBusiness"] as const;
export const Config = ConfigSchema;
export type Config = QqConfig;

export async function resolveQqBotUid(ctx: Context, session: Session) {
  const identity = qqbotIdentity(session);
  return identity ? ctx.faithCore.adapter.resolve(identity) : null;
}

export function apply(ctx: Context, config: Config) {
  assertDependencies(ctx);
  const logger = ctx.logger("faith-adapter-qq");
  const sender = new QqMessageSender(ctx, config.allowProactiveMessages);
  ctx.on("dispose", () => sender.dispose());
  const creatorPolicy = ctx.faithCore.permissions.register("faith.creator", async ({ uid }) => {
    const identities = [
      ...config.creatorUserOpenids.map((value) => ({ adapter: "qqbot", type: "qqbot_user_openid", value, scope: "private_chat" } as const)),
      ...config.creatorGroupIdentities.map((identity) => ({ adapter: "qqbot", type: "qqbot_member_openid", value: identity.memberOpenid, scope: "group_chat", scopeValue: identity.groupOpenid } as const)),
    ];
    const resolved = await Promise.all(identities.map((identity) => ctx.faithCore.adapter.resolve(identity)));
    return resolved.includes(uid);
  });
  ctx.on("dispose", () => creatorPolicy.dispose());
  applyCommandPanel(ctx, config.commandPanel);
  ctx.middleware(async (session, next) => {
    if (session.platform !== "qq") return next();
    if (!isQqAddressed(session, config.receiveMode)) return next();
    const content = normalizeQqContent(session);
    if (!ctx.faithBusiness.acceptsCommand(content)) return next();
    let handled: boolean;
    try { handled = await dispatchQqSession(ctx, session, sender, content); }
    catch (error) {
      logger.error(`命令处理失败 scene=${session.isDirect ? "private" : "group"} message=${session.messageId || "unknown"}`, error);
      await sender.sendText(session, "命令处理失败，请稍后重试。");
      return;
    }
    if (!handled) return next();
  });
  logger.info(`QQ Adapter 已加载（创造者私聊身份 ${config.creatorUserOpenids.length} 个，群身份 ${config.creatorGroupIdentities.length} 个，指令面板 ${config.commandPanel.enabled ? "开启" : "关闭"}）`);
}

export function isQqAddressed(session: Session, mode: Config["receiveMode"] = "mention") {
  return mode === "all" || session.isDirect || !!session.stripped?.appel;
}

export async function dispatchQqSession(ctx: Context, session: Session, sender: QqSender, normalizedContent?: string) {
  const identity = qqbotIdentity(session);
  if (!identity) {
    await sender.sendText(session, "无法读取你的 QQ 身份，请稍后重试；若持续出现，请检查 QQ Bot 事件权限与适配器版本。");
    return true;
  }
  const response = await ctx.faithBusiness.dispatch({
    uid: await ctx.faithCore.adapter.resolve(identity), identity,
    scene: session.isDirect ? "private" : "group", content: normalizedContent ?? normalizeQqContent(session), channelId: session.channelId,
    roomKey: JSON.stringify(["qq", session.selfId, session.channelId]),
    eventId: session.messageId, displayName: session.username,
    reply: (result) => sender.sendResult(session, result),
  });
  if (!response.matched) return false;
  if ("error" in response) await sender.sendText(session, friendlyBusinessError(response.error));
  else await sender.sendResult(session, response.result);
  return true;
}

function assertDependencies(ctx: Context) {
  if (typeof ctx.faithCore?.adapter?.resolve !== "function") throw new Error("faith-adapter-qq 需要已就绪的 faith-core 身份服务");
  if (typeof ctx.faithBusiness?.dispatch !== "function") throw new Error("faith-adapter-qq 需要已就绪的 faith-business 路由服务");
  if (typeof ctx.faithBusiness?.acceptsCommand !== "function") throw new Error("请同步更新 faith-business，以提供命令快速筛选接口");
}
export * from "./types";
export * from "./session/identity";
export * from "./session/content";
export * from "./errors";
export * from "./messaging/sender";
export * from "./panel";
