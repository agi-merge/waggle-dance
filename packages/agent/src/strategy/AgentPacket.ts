// chain/utils/types.ts

import { type Serialized } from "langchain/load/serializable";
import { type AgentAction } from "langchain/schema";

export type ChainValues = Record<string, unknown>;
export type BaseAgentPacket = { type: AgentPacketType };
export type AgentPacketType =
  | "handleLLMStart"
  | "token"
  | "handleLLMEnd"
  | "handleLLMError"
  | "handleChainEnd"
  | "handleChainError"
  | "handleChainStart"
  | "handleToolEnd"
  | "handleToolError"
  | "handleToolStart"
  | "handleAgentAction"
  | "handleAgentEnd"
  | "handleText"
  | "handleRetrieverError"
  | "handleAgentError"
  | "done"
  | "error"
  | "requestHumanInput"
  | "starting"
  | "working"
  | "idle";
// TODO: group these by origination for different logic, or maybe different typings
export type AgentPacket =
  // server-side only
  | ({ type: "handleLLMStart" } & BaseAgentPacket)
  | ({ type: "token"; token: string } & BaseAgentPacket) // handleLLMNewToken (shorted on purpose)
  | ({ type: "handleLLMEnd"; output: string } & BaseAgentPacket)
  | ({ type: "handleLLMError"; err: unknown } & BaseAgentPacket)
  | ({ type: "handleChainEnd"; outputs: ChainValues } & BaseAgentPacket)
  | ({ type: "handleChainError"; err: unknown } & BaseAgentPacket)
  | ({ type: "handleChainStart" } & BaseAgentPacket)
  | ({ type: "handleToolEnd"; output: string } & BaseAgentPacket)
  | ({ type: "handleToolError"; err: unknown } & BaseAgentPacket)
  | ({
      type: "handleToolStart";
      tool: Serialized;
      input: string;
    } & BaseAgentPacket)
  | ({ type: "handleAgentAction"; action: AgentAction } & BaseAgentPacket)
  | ({ type: "handleAgentEnd"; value: string } & BaseAgentPacket)
  | ({ type: "handleText"; text: string } & BaseAgentPacket)
  | ({ type: "handleRetrieverError"; err: unknown } & BaseAgentPacket)
  // our callbacks
  | ({ type: "handleAgentError"; err: unknown } & BaseAgentPacket) // synthetic; used for max iterations only
  | ({ type: "done"; value: string } & BaseAgentPacket)
  | ({
      type: "error";
      severity: "warn" | "human" | "fatal";
      message: string;
    } & BaseAgentPacket)
  | ({ type: "requestHumanInput"; reason: string } & BaseAgentPacket)
  // client-side only
  | ({ type: "starting"; nodeId: string } & BaseAgentPacket)
  | ({ type: "working"; nodeId: string } & BaseAgentPacket);

export default AgentPacket;
