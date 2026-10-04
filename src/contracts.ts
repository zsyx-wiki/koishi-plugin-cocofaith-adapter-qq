import type { Context, Session } from "koishi";
import type { FaithCoreServiceContract, IdentityInput } from "@mueo/cocofaith-sdk/core";
import type { GameplayImageNode, GameplayResult, GameplayTextNode } from "@mueo/cocofaith-sdk/gameplay";

export type { IdentityInput } from "@mueo/cocofaith-sdk/core";
export type MessageTextNode = GameplayTextNode;
export type MessageImageNode = GameplayImageNode;
export type MessageNode = GameplayTextNode | GameplayImageNode;
export type BusinessResult = GameplayResult;

export type BusinessDispatchResult =
  | { matched: false; reason: "empty" | "not-found" }
  | { matched: true; business: string; command: string; result: BusinessResult }
  | { matched: true; business: string; command: string; error: { code: string; message: string; details?: Record<string, unknown> } };

export type QqAdapterContext = Context & {
  faithCore: Pick<FaithCoreServiceContract, "adapter" | "permissions">;
  faithBusiness: {
    acceptsCommand(content: string): boolean;
    dispatch(event: {
      uid: number | null;
      identity: IdentityInput;
      scene: "private" | "group";
      content: string;
      channelId?: string;
      roomKey?: string;
      eventId?: string;
      displayName?: string;
      adapter: { name: string; version: string; allowRegistration: boolean };
      reply(result: BusinessResult): Promise<unknown>;
    }): Promise<BusinessDispatchResult>;
  };
};

export interface QqSendOptions { proactiveRequired?: boolean; }
export interface QqSender {
  sendText(session: Session, content: string, options?: QqSendOptions): Promise<unknown>;
  sendResult(session: Session, result: BusinessResult): Promise<unknown>;
}
