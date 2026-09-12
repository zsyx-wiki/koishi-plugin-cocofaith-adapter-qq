import type { Session } from "koishi";

export function normalizeQqContent(session: Session) {
  let content = (session.stripped?.content || session.content || "").trim();
  if (session.selfId) {
    const escaped = escapeRegExp(session.selfId);
    content = content.replace(new RegExp(`^<at\\s+[^>]*(?:id|user-id)=["']${escaped}["'][^>]*/?>\\s*`, "i"), "").trim();
  }
  content = content.replace(/^／/, "/").replace(/^\/+\s*/, "/");
  return content;
}
export function isCoconutWaterCommand(content: string) {
  return /^椰子水(?:\s|$)/.test(content.trimStart().replace(/^[/／]+\s*/, ""));
}
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
