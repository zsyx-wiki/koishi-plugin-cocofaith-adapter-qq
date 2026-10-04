import type { Config } from "../config";
import type { QqAdapterContext } from "./contracts";

export function registerCreatorPolicy(ctx: QqAdapterContext, config: Config) {
  const identities = [
    ...config.creatorUserOpenids.map((value) => ({ adapter: "qqbot", type: "qqbot_user_openid", value, scope: "private_chat" } as const)),
    ...config.creatorGroupIdentities.map((identity) => ({ adapter: "qqbot", type: "qqbot_member_openid", value: identity.memberOpenid, scope: "group_chat", scopeValue: identity.groupOpenid } as const)),
  ];
  return ctx.faithCore.permissions.register("faith.creator", async ({ uid }) => {
    const resolved = await Promise.all(identities.map((identity) => ctx.faithCore.adapter.resolve(identity)));
    return resolved.includes(uid);
  });
}
