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
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
