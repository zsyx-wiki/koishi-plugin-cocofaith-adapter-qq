import { assertFaithAdapterServices } from "cocofaith-sdk/adapter";
import type { Context, Middleware, Session } from "koishi";
import type { Config } from "../config";
import type { QqAdapterContext, QqSender } from "./contracts";
import { QqMessageSender } from "./messaging/sender";
import { applyCommandPanel } from "./panel";
import { registerCreatorPolicy } from "./permissions";
import { isCoconutWaterCommand, normalizeQqContent } from "./session/content";
import { dispatchQqSession, isQqAddressed } from "./session/router";

export function applyQqTransport(ctx: Context, config: Config) {
  assertFaithAdapterServices(ctx, "CoCoFaith Adapter QQ");
  const services = ctx as QqAdapterContext;
  const sender = new QqMessageSender(ctx, config.allowProactiveMessages);
  ctx.on("dispose", () => sender.dispose());
  const creatorPolicy = registerCreatorPolicy(services, config);
  ctx.on("dispose", () => creatorPolicy.dispose());

  if (config.mode === "normal") applyCommandPanel(ctx, config.commandPanel);
  ctx.middleware(createQqMiddleware(services, config, sender));
  const mode = config.mode === "normal" ? "正常模式" : "绑定模式";
  const panelEnabled = config.mode === "normal" && config.commandPanel.enabled;
  const logger = ctx.logger("cocofaith-adapter-qq");
  logger.info(
    "QQ Adapter 已加载（%s；指令面板 %s；创造者私聊身份 %d 个，群身份 %d 个）",
    mode,
    panelEnabled ? "开启" : "关闭",
    config.creatorUserOpenids.length,
    config.creatorGroupIdentities.length,
  );
}

function commandContent(session: Session, config: Config): string | undefined {
  if (session.platform !== "qq") return;
  if (config.mode !== "normal" && session.isDirect) return;
  if (!isQqAddressed(session, config.receiveMode)) return;
  const content = normalizeQqContent(session);
  if (config.mode !== "normal" && !isCoconutWaterCommand(content)) return;
  return content;
}

function createQqMiddleware(ctx: QqAdapterContext, config: Config, sender: QqSender): Middleware {
  const logger = ctx.logger("cocofaith-adapter-qq");
  return async (session, next) => {
    const content = commandContent(session, config);
    if (content === undefined || !ctx.faithBusiness.acceptsCommand(content)) return next();

    try {
      const handled = await dispatchQqSession(ctx, session, sender, content);
      if (!handled) return next();
    } catch (error) {
      logger.error(
        `命令处理失败 scene=${session.isDirect ? "private" : "group"} message=${session.messageId || "unknown"}`,
        error,
      );
      await sender.sendText(session, "命令处理失败，请稍后重试。");
    }
  };
}
