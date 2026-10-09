import type { FaithCoreServiceContract } from "@mueo/cocofaith-sdk/core";
import type { GameplayImageNode,GameplayResult,GameplayTextNode } from "@mueo/cocofaith-sdk/gameplay";
import type { FaithBusinessAdapterContract } from "@mueo/cocofaith-sdk/protocol";
import type { Context,Session } from "koishi";

export type { IdentityInput } from "@mueo/cocofaith-sdk/core";
export type MessageTextNode = GameplayTextNode;
export type MessageImageNode = GameplayImageNode;
export type MessageNode = GameplayTextNode | GameplayImageNode;
export type BusinessResult = GameplayResult;

export type { BusinessDispatchResult } from "@mueo/cocofaith-sdk/protocol";

export type QqAdapterContext = Context & {
  faithCore: Pick<FaithCoreServiceContract, "adapter" | "permissions">;
  faithBusiness: FaithBusinessAdapterContract;
};

export interface QqSendOptions { proactiveRequired?: boolean; }
export interface QqSender {
  sendText(session: Session, content: string, options?: QqSendOptions): Promise<unknown>;
  sendResult(session: Session, result: BusinessResult): Promise<unknown>;
}
