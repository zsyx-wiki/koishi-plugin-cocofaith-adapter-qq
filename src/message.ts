import { h, type Context, type Session } from "koishi";
import type { BusinessResult, MessageNode } from "@mueo/koishi-plugin-faith-business";
import type { QqSendOptions, QqSender, QqSession } from "./types";

const PASSIVE_WINDOW_MS = 5 * 60 * 1_000 - 2_000;
const MARKDOWN_CHUNK = 3_800;
const MAX_CHUNKS = 1;
const MAX_REPLIES = 5;
const SEND_INTERVAL_MS = 120;

export class QqMessageSender implements QqSender {
  private readonly logger;
  private queues = new Map<string, Promise<unknown>>();
  private lastSent = new Map<string, number>();
  private sequences = new Map<string, { count: number; expires: number }>();
  private received = new WeakMap<object, number>();
  private disposed = false;
  dispose() { this.disposed = true; this.sequences.clear(); this.lastSent.clear(); }
  constructor(ctx: Context, private allowProactiveMessages = false) { this.logger = ctx.logger("faith-adapter-qq-message"); }

  sendResult(session: Session, result: BusinessResult) {
    // broadcast 是其他平台的可选公告；QQ 只发送包含升级信息的本群正文。
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
    await this.throttle(session);
    if (!this.canDeliver(session, options)) return;
    const internal = session.bot.internal as any;
    const method = session.isDirect ? internal?.sendPrivateMessage : internal?.sendMessage;
    if (typeof method !== "function") {
      if (!this.reserve(session, options)) return;
      return session.send(content);
    }
    const rendered = withMention(session, compactMarkdown(content));
    const credentials = this.reserve(session, options);
    if (!credentials) return;
    const payload = { msg_type: 2, markdown: { content: rendered }, ...credentials };
    try { return await method.call(internal, session.channelId, payload); }
    catch (error) {
      this.logger.warn(`QQ Markdown 发送失败，降级为纯文本：${error instanceof Error ? error.message : String(error)}`);
      const fallback = this.reserve(session, options);
      if (!fallback) return;
      return method.call(internal, session.channelId, { msg_type: 0, content: withMention(session, content), ...fallback });
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
  private credential(session: Session) {
    const key = JSON.stringify([session.bot.sid, session.channelId, session.messageId]);
    let value = this.sequences.get(key);
    if (!value) {
      let timestamp = session.timestamp;
      if (timestamp) timestamp = timestamp < 10_000_000_000 ? timestamp * 1_000 : timestamp;
      else { timestamp = this.received.get(session) ?? Date.now(); this.received.set(session, timestamp); }
      value = { count: 0, expires: timestamp + PASSIVE_WINDOW_MS };
      if (this.sequences.size >= 10000) for (const [id, entry] of this.sequences) if (entry.expires <= Date.now()) this.sequences.delete(id);
      // 容量满时拒绝新凭证，不能清除仍有效的计数导致重复回复。
      if (this.sequences.size >= 10000) return { count: MAX_REPLIES, expires: 0 };
      this.sequences.set(key, value);
    }
    return value;
  }
  private canDeliver(session: Session, options: QqSendOptions) {
    if (this.disposed) return false;
    const value = this.credential(session);
    return (!!session.messageId && Date.now() < value.expires && value.count < MAX_REPLIES)
      || (!!options.proactiveRequired && this.allowProactiveMessages);
  }
  private reserve(session: Session, options: QqSendOptions): Record<string, unknown> | null {
    if (this.disposed) return null;
    const value = this.credential(session);
    if (session.messageId && Date.now() < value.expires && value.count < MAX_REPLIES) {
      return { msg_id: session.messageId, msg_seq: ++value.count };
    }
    return options.proactiveRequired && this.allowProactiveMessages ? {} : null;
  }
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
function withMention(session: Session, content: string) {
  if (session.isDirect) return content;
  const raw = (session as QqSession).qq?.d;
  const id = raw?.member_openid || raw?.author?.member_openid || raw?.author?.id || session.userId;
  return id ? `<@${id}>\n${content}` : content;
}
