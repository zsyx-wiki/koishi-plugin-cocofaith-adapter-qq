import { Context } from "koishi";
import { Config as ConfigSchema, type Config as QqConfig } from "../config";
import type {} from "@mueo/koishi-plugin-cocofaith-core";
import type {} from "@mueo/koishi-plugin-cocofaith-business";
import { QqMessageSender } from "./messaging/sender";
import { isCoconutWaterCommand, normalizeQqContent } from "./session/content";
import { applyCommandPanel } from "./panel";
import { dispatchQqSession, isQqAddressed } from "./session/router";
import { registerCreatorPolicy } from "./permissions";

export const name = "cocofaith-adapter-qq";
export const inject = ["faithCore", "faithBusiness"] as const;
export const Config = ConfigSchema;
export type Config = QqConfig;

export function apply(ctx: Context, config: Config) {
  assertDependencies(ctx);
  const logger = ctx.logger("cocofaith-adapter-qq");
  const mode = config.mode ?? "binding";
  const sender = new QqMessageSender(ctx, config.allowProactiveMessages);
  ctx.on("dispose", () => sender.dispose());
  const creatorPolicy = registerCreatorPolicy(ctx, config);
  ctx.on("dispose", () => creatorPolicy.dispose());
  if (mode === "normal") applyCommandPanel(ctx, config.commandPanel);
  ctx.middleware(async (session, next) => {
    if (session.platform !== "qq") return next();
    if (mode === "binding" && session.isDirect) return next();
    if (!isQqAddressed(session, config.receiveMode)) return next();
    const content = normalizeQqContent(session);
    if (mode === "binding" && !isCoconutWaterCommand(content)) return next();
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
  logger.info(`QQ Adapter 已加载（${mode === "binding" ? "绑定模式：仅群聊椰子水命令" : "正常模式：完整命令"}；创造者私聊身份 ${config.creatorUserOpenids.length} 个，群身份 ${config.creatorGroupIdentities.length} 个，指令面板 ${mode === "normal" && config.commandPanel.enabled ? "开启" : "关闭"}）`);
}

function assertDependencies(ctx: Context) {
  if (typeof ctx.faithCore?.adapter?.resolve !== "function") throw new Error("CoCoFaith Adapter QQ 需要已就绪的 faithCore 身份服务");
  if (typeof ctx.faithBusiness?.dispatch !== "function") throw new Error("CoCoFaith Adapter QQ 需要已就绪的 faithBusiness 路由服务");
  if (typeof ctx.faithBusiness?.acceptsCommand !== "function") throw new Error("请同步更新 CoCoFaith Business，以提供命令快速筛选接口");
}
export * from "./types";
export * from "./session/identity";
export * from "./session/content";
export * from "./session/router";
export * from "./errors";
export * from "./messaging/sender";
export * from "./panel";
export * from "./permissions";
export * from "./version";
