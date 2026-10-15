import { COCOFAITH_QQ_ADAPTER_VERSION } from "./version";
import { provideFaithAdapter } from "cocofaith-sdk/adapter";
import { Context } from "koishi";
import { Config as ConfigSchema, type Config as QqConfig } from "../config";
import { applyQqTransport } from "./transport";

export const name = "cocofaith-adapter-qq";
export const inject = [] as const;
export const Config = ConfigSchema;
export type Config = QqConfig;

export function apply(ctx: Context, config: Config) {
  provideFaithAdapter(ctx, {
    id: name,
    name: "CoCoFaith Adapter QQ",
    platform: "qq",
    version: COCOFAITH_QQ_ADAPTER_VERSION,
    mode: config.mode ?? "binding",
  });
  ctx.inject(["faithCore", "faithBusiness"], (ctx) => applyQqTransport(ctx, config));
}

export type * from "./contracts";
export * from "./errors";
export * from "./messaging/sender";
export * from "./panel";
export * from "./permissions";
export * from "./session/content";
export * from "./session/identity";
export * from "./session/router";
export * from "./types";
export * from "./version";
