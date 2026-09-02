import { h, type Context, type Session } from "koishi";
import type { BusinessResult, MessageNode } from "@mueo/koishi-plugin-faith-business";
import type { QqSendOptions, QqSender, QqSession } from "./types";

const PASSIVE_WINDOW_MS = 5 * 60 * 1_000 - 2_000;
const MARKDOWN_CHUNK = 3_800;
const MAX_CHUNKS = 1;
const SEND_INTERVAL_MS = 120;

export class QqMessageSender implements QqSender {
  private readonly logger;
  private queues = new Map<string, Promise<unknown>>();
  private lastSent = new Map<string, number>();
  private sequences = new WeakMap<object, number>();
  constructor(ctx: Context, private allowProactiveMessages = false) { this.logger = ctx.logger("faith-adapter-qq-message"); }

  sendResult(session: Session, result: BusinessResult) {
    if (result.type === "silent") return Promise.resolve(undefined);
    const options = { proactiveRequired: result.delivery === "proactive-required" };
    if (result.type === "text") return this.sendText(session, result.content, options);
    if (result.type === "image") return this.sendImage(session, result.url, result.fallback, options);
    if (!this.canDeliver(session, options)) return Promise.resolve(undefined);
    return this.enqueue(session, async () => {
      for (const node of result.content) await this.sendNode(session, node, options);
    });
  }

  sendText(session: Session, content: string, options: QqSendOptions = {}) {
    if (!this.canDeliver(session, options)) return Promise.resolve(undefined);
    const chunks = splitMessage(content);
    return this.enqueue(session, async () => {
      for (let index = 0; index < chunks.length; index++) {
        if (index) await delay(SEND_INTERVAL_MS);
        if (!this.canDeliver(session, options)) return;
        await this.sendMarkdownOrText(session, chunks[index], options);
      }
    });
  }

  private async sendMarkdownOrText(session: Session, content: string, options: QqSendOptions) {
    if (!this.canDeliver(session, options)) return;
    await this.throttle(session);
    const internal = session.bot.internal as any;
    const method = session.isDirect ? internal?.sendPrivateMessage : internal?.sendMessage;
    if (typeof method !== "function") return session.send(content);
    const passive = isPassive(session);
    const sequence = (this.sequences.get(session) ?? 0) + 1;
    this.sequences.set(session, sequence);
    const rendered = withMention(session, compactMarkdown(content));
    const payload: Record<string, unknown> = { content: "markdown", msg_type: 2, markdown: { content: rendered } };
    if (passive && sequence <= MAX_CHUNKS) { payload.msg_id = session.messageId; payload.msg_seq = sequence; }
    else if (options.proactiveRequired && this.allowProactiveMessages && (session as QqSession).qq?.id) payload.event_id = (session as QqSession).qq!.id;
    else return;
    try { return await method.call(internal, session.channelId, payload); }
    catch (error) {
      this.logger.warn(`QQ Markdown 发送失败，降级为纯文本：${error instanceof Error ? error.message : String(error)}`);
      return session.send(session.isDirect ? content : [h.at(session.userId), "\n", content]);
    }
  }

  private sendImage(session: Session, url: string, fallback?: string, options: QqSendOptions = {}) {
    if (!this.canDeliver(session, options)) return Promise.resolve(undefined);
    return this.enqueue(session, async () => {
      if (!this.canDeliver(session, options)) return;
      try { return await session.send(h.image(url)); }
      catch (error) { if (fallback) return session.send(fallback); throw error; }
    });
  }
  private async sendNode(session: Session, node: MessageNode, options: QqSendOptions) {
    if (!this.canDeliver(session, options)) return;
    if (node.type === "text") return this.sendMarkdownOrText(session, node.content, options);
    await this.throttle(session); return session.send(h.image(node.url));
  }
  private canDeliver(session: Session, options: QqSendOptions) { return isPassive(session) || (!!options.proactiveRequired && this.allowProactiveMessages); }
  private async throttle(session: Session) {
    const key = `${session.bot.sid}:${session.channelId}`, wait = SEND_INTERVAL_MS - (Date.now() - (this.lastSent.get(key) ?? 0));
    if (wait > 0) await delay(wait);
    this.lastSent.set(key, Date.now());
  }
  private enqueue(session: Session, task: () => Promise<unknown>) {
    const key = `${session.bot.sid}:${session.channelId}`;
    const previous = this.queues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    this.queues.set(key, current);
    void current.finally(() => { if (this.queues.get(key) === current) this.queues.delete(key); }).catch(() => {});
    return current;
  }
}

export function splitMessage(content: string) {
  const value = content || " ", chunks: string[] = [];
  for (let offset = 0; offset < value.length && chunks.length < MAX_CHUNKS; offset += MARKDOWN_CHUNK) chunks.push(value.slice(offset, offset + MARKDOWN_CHUNK));
  if (value.length > MARKDOWN_CHUNK * MAX_CHUNKS) chunks[MAX_CHUNKS - 1] = `${chunks[MAX_CHUNKS - 1].slice(0, -16)}\n…内容过长，已截断`;
  return chunks;
}
export function escapeMarkdown(value: string) { return value.replace(/([\\`*_[\]~#!>])/g, "\\$1"); }
export function compactMarkdown(value: string) {
  return value.split("\n").map((line) => {
    const match = line.trim().match(/^([^：:]{1,12})[：:]\s*(.+)$/);
    if (!match) return escapeMarkdown(line.trim());
    return `**${escapeMarkdown(match[1])}：** ${escapeMarkdown(match[2])}`;
  }).filter(Boolean).join("\n");
}
function delay(ms: number) { return new Promise<void>((resolve) => setTimeout(resolve, ms)); }
function isPassive(session: Session) {
  if (!session.messageId) return false;
  if (!session.timestamp) return true;
  const timestamp = session.timestamp < 10_000_000_000 ? session.timestamp * 1_000 : session.timestamp;
  const age = Date.now() - timestamp;
  return age >= 0 && age < PASSIVE_WINDOW_MS;
}
function withMention(session: Session, content: string) {
  if (session.isDirect) return content;
  const raw = (session as QqSession).qq?.d;
  const id = raw?.member_openid || raw?.author?.member_openid || raw?.author?.id || session.userId;
  return id ? `<@${id}>\n${content}` : content;
}
