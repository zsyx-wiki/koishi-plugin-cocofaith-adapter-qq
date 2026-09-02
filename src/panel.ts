import type { Context } from "koishi";

export interface QqPanelConfig { enabled: boolean; groupId: string; }
const REMARK = "faith-v3-command-panel";
const LEGACY_REMARK = "faith-qq-command-panel";
export const FAITH_QQ_PANEL_COMMANDS = Object.freeze([
  ["信仰", "查看信仰信息", false], ["信仰 信息", "查看信仰信息", false], ["信仰 注册", "注册一个信仰", false],
  ["信仰 弃誓", "变更当前信仰", false], ["信仰 职业", "查看或选择职业", false], ["信仰 变更职业", "付费变更职业", false],
  ["信仰管理 数值", "调整玩家业务数值", true],
  ["虚空祈求", "消耗金币抽取物品", false], ["虚空祈求 次数", "查看今日祈求次数", false],
  ["称号", "查看称号命令", false],
] as const);

export function applyCommandPanel(ctx: Context, config: QqPanelConfig) {
  if (!config.enabled || !config.groupId) return;
  if (FAITH_QQ_PANEL_COMMANDS.length > 20) throw new Error("QQ 指令面板最多注册 20 条命令");
  validatePanelCommands(FAITH_QQ_PANEL_COMMANDS);
  const logger = ctx.logger("faith-adapter-qq-panel"), synchronized = new WeakSet<object>(), pending = new WeakMap<object, Promise<void>>();
  const panel = { remark: REMARK, items: FAITH_QQ_PANEL_COMMANDS.map(([name, desc, only_admin]) => ({ type: "command", name, desc, only_admin })) };
  const sync = (bot: any) => {
    if (!bot || bot.platform !== "qq" || synchronized.has(bot)) return Promise.resolve();
    const active = pending.get(bot); if (active) return active;
    const task = (async () => {
      try {
        await bot.getAccessToken?.();
        const list = await bot.http.get("/v2/panels", { params: { scope: "group", limit: 50 } });
        const records = list?.records ?? [];
        const existing = records.find((record: any) => record.panel?.remark === REMARK) ?? records.find((record: any) => record.panel?.remark === LEGACY_REMARK);
        if (existing) {
          await bot.http.put(`/v2/panels/${existing.panel_id}`, { panel });
          logger.info(`已更新 QQ 指令面板 ${existing.panel_id}（${FAITH_QQ_PANEL_COMMANDS.length} 项）`);
        } else {
          const created = await bot.http.post("/v2/panels", { scope: "group", target_type: "specific", group_openids: [config.groupId], panel });
          logger.info(`已创建 QQ 指令面板 ${created?.panel_id ?? "unknown"}（${FAITH_QQ_PANEL_COMMANDS.length} 项）`);
        }
        synchronized.add(bot);
      } catch (error) { logger.warn(`同步 QQ 指令面板失败：${formatPanelError(error)}`); }
      finally { pending.delete(bot); }
    })();
    pending.set(bot, task); return task;
  };
  ctx.on("bot-connect", sync);
  ctx.on("ready", () => Promise.all([...ctx.bots].map(sync)).then(() => undefined));
}

function validatePanelCommands(commands: typeof FAITH_QQ_PANEL_COMMANDS) {
  for (const [name, desc] of commands) {
    if (qqLength(name) > 14) throw new Error(`QQ 指令面板名称过长：${name}`);
    if (qqLength(desc) > 30) throw new Error(`QQ 指令面板描述过长：${name}`);
  }
}
function qqLength(value: string) {
  return [...value].reduce((length, char) => length + (/^[\x00-\x7f]$/.test(char) ? 1 : 2), 0);
}
function formatPanelError(error: unknown) {
  if (!error || typeof error !== "object") return String(error);
  const value = error as { message?: unknown; response?: { data?: unknown }; code?: unknown };
  const details = value.response?.data;
  let suffix = "";
  try { if (details !== undefined) suffix = `；QQ 返回：${JSON.stringify(details).slice(0, 800)}`; } catch {}
  return `${typeof value.message === "string" ? value.message : "请求失败"}${value.code ? `（${String(value.code)}）` : ""}${suffix}`;
}
