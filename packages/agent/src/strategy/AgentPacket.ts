/* eslint-disable @typescript-eslint/no-explicit-any */
// chain/utils/types.ts

import { type Serialized } from "langchain/load/serializable";
import { type AgentAction } from "langchain/schema";

export type ChainValues = Record<string, unknown>;
export type BaseAgentPacket = {
  type: AgentPacketType;
};

export type BaseAgentPacketWithIds = BaseAgentPacket & {
  runId: string;
  parentRunId?: string;
};

export type AgentPacketType =
  | AgentPacketFinishedType
  | "handleLLMStart"
  | "t" // token
  | "handleLLMEnd"
  | "handleChainEnd"
  | "handleChainStart"
  | "handleToolEnd"
  | "handleToolStart"
  | "handleAgentAction"
  | "handleText"
  | "requestHumanInput"
  | "starting"
  | "working"
  | "idle"
  | "handleToolError";

export const AgentPacketFinishedTypes = [
  "handleAgentEnd",
  "done",
  "error",
  "handleChainError",
  "handleLLMError",
  "handleRetrieverError",
  "handleAgentError",
] as const;

export const AgentPacketFinishedStrings = Array.from(
  AgentPacketFinishedTypes as unknown as string[],
);

export type AgentPacketFinishedType = (typeof AgentPacketFinishedTypes)[number];

const agentPacketFinishedTypesSet = new Set(AgentPacketFinishedStrings);

export const isAgentPacketFinishedType = (type: AgentPacketType) => {
  return agentPacketFinishedTypesSet.has(type);
};

export const findFinishPacket = (packets: AgentPacket[]): AgentPacket => {
  const packet = packets.findLast((packet) => {
    try {
      return isAgentPacketFinishedType(packet.type);
    } catch (err) {
      return false;
    }
  }) ?? {
    type: "error",
    severity: "fatal",
    error: new Error(`No result packet found in ${packets.length} packets`),
  };

  return packet;
};

// TODO: group these by origination for different logic, or maybe different typings

export type AgentPacket =
  | ({ type: "handleChainError"; err: any } & BaseAgentPacketWithIds)
  | ({ type: "handleLLMError"; err: any } & BaseAgentPacketWithIds)
  | ({ type: "handleLLMStart" } & BaseAgentPacketWithIds)
  | ({ type: "t"; t: string } & BaseAgentPacket) // handleLLMNewToken (shortened on purpose)
  | ({ type: "handleLLMEnd"; output: string } & BaseAgentPacketWithIds)
  | ({ type: "handleChainEnd"; outputs: ChainValues } & BaseAgentPacketWithIds)
  | ({ type: "handleChainStart" } & BaseAgentPacketWithIds)
  | ({ type: "handleToolEnd"; output: string } & BaseAgentPacketWithIds)
  | ({ type: "handleToolError"; err: any } & BaseAgentPacketWithIds)
  | ({
      type: "handleToolStart";
      tool: Serialized;
      input: string;
    } & BaseAgentPacketWithIds)
  | ({
      type: "handleAgentAction";
      action: AgentAction;
    } & BaseAgentPacketWithIds)
  | ({ type: "handleAgentEnd"; value: string } & BaseAgentPacketWithIds)
  | ({ type: "handleText"; text: string } & BaseAgentPacketWithIds)
  | ({ type: "handleRetrieverError"; err: any } & BaseAgentPacketWithIds)
  | ({ type: "handleAgentError"; err: any } & BaseAgentPacketWithIds) // synthetic; used for max iterations only
  // our callbacks
  | ({ type: "done"; value: string } & BaseAgentPacket)
  | ({
      type: "error";
      severity: "warn" | "human" | "fatal";
      error: Error;
    } & BaseAgentPacket)
  | ({ type: "requestHumanInput"; reason: string } & BaseAgentPacket)
  // client-side only
  | ({ type: "starting"; nodeId: string } & BaseAgentPacket)
  | ({ type: "working"; nodeId: string } & BaseAgentPacket)
  | ({ type: "idle"; nodeId: string } & BaseAgentPacket);
export default AgentPacket;

export const display = (packet: AgentPacket): string | null => {
  switch (packet.type) {
    case "handleToolStart":
      return null;
    case "handleAgentAction":
      return `${packet.action.tool} (🔨`;
    case "handleLLMStart":
    case "working":
      return "⏳";
    case "handleToolEnd":
      return `✅ )`;
    case "handleToolError":
      return `❌ )`;
    case "handleAgentEnd":
      return null;
    case "handleAgentError":
      return `error ${(packet.err instanceof Error
        ? packet.err.name
        : String(packet.err)
      ).slice(0, 10)}`;
    default:
      return packet.type;
  }
};
