/* eslint-disable @typescript-eslint/no-explicit-any */
// chain/utils/types.ts

import { type Serialized } from "langchain/load/serializable";
import { type AgentAction } from "langchain/schema";

export type ChainValues = Record<string, unknown>;
export type BaseAgentPacket = { type: AgentPacketType };

export type AgentPacketType =
  | AgentPacketFinishedType
  | "handleLLMStart"
  | "token"
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
      isAgentPacketFinishedType(packet.type);
      return true;
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
  // server-side only
  | ({ type: "handleLLMStart" } & BaseAgentPacket)
  | ({ type: "token"; token: string } & BaseAgentPacket) // handleLLMNewToken (shorted on purpose)
  | ({ type: "handleLLMEnd"; output: string } & BaseAgentPacket)
  | ({ type: "handleLLMError"; err: any } & BaseAgentPacket)
  | ({ type: "handleChainEnd"; outputs: ChainValues } & BaseAgentPacket)
  | ({ type: "handleChainError"; err: any } & BaseAgentPacket)
  | ({ type: "handleChainStart" } & BaseAgentPacket)
  | ({ type: "handleToolEnd"; output: string } & BaseAgentPacket)
  | ({ type: "handleToolError"; err: any } & BaseAgentPacket)
  | ({
      type: "handleToolStart";
      tool: Serialized;
      input: string;
    } & BaseAgentPacket)
  | ({ type: "handleAgentAction"; action: AgentAction } & BaseAgentPacket)
  | ({ type: "handleAgentEnd"; value: string } & BaseAgentPacket)
  | ({ type: "handleText"; text: string } & BaseAgentPacket)
  | ({ type: "handleRetrieverError"; err: any } & BaseAgentPacket)
  // our callbacks
  | ({ type: "handleAgentError"; err: any } & BaseAgentPacket) // synthetic; used for max iterations only
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
