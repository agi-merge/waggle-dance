/* eslint-disable @typescript-eslint/no-explicit-any */
// chain/utils/types.ts

import { type Document } from "langchain/document";
import { type Serialized } from "langchain/load/serializable";
import {
  type AgentAction,
  type BaseMessage,
  type LLMResult,
} from "langchain/schema";

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
  | "handleChatModelStart"
  | "handleChatModelEnd"
  | "handleRetrieverStart"
  | "handleRetrieverEnd"
  | "handleRetrieverError"
  | "handleChainError"
  | "handleLLMError"
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

export const findResult = (packets: AgentPacket[]): string => {
  const finishPacket = findFinishPacket(packets);
  switch (finishPacket.type) {
    case "done":
    case "handleAgentEnd":
      return finishPacket.value;
    case "error":
      return JSON.stringify(finishPacket.error);
    case "handleChainError":
    case "handleAgentError":
    case "handleRetrieverError":
      return JSON.stringify(finishPacket.err);
    case "working":
      return `…${packets.length} packets`;
    default:
      return JSON.stringify(finishPacket);
  }
};

// TODO: group these by origination for different logic, or maybe different typings

export type AgentPacket =
  | ({
      type: "handleChatModelStart";
      llm: Serialized;
      messages: BaseMessage[][];
      runId: string;
      parentRunId?: string;
      extraParams?: Record<string, unknown>;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } & BaseAgentPacketWithIds)
  | ({
      type: "handleRetrieverStart";
      retriever: Serialized;
      query: string;
      runId: string;
      parentRunId?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } & BaseAgentPacketWithIds)
  | ({
      type: "handleRetrieverEnd";
      documents: Document[];
      runId: string;
      parentRunId?: string;
      tags?: string[];
    } & BaseAgentPacketWithIds)
  | ({
      type: "handleRetrieverError";
      err: any;
      runId: string;
      parentRunId?: string;
      tags?: string[];
    } & BaseAgentPacketWithIds)
  | ({ type: "handleChainError"; err: any } & BaseAgentPacketWithIds)
  | ({ type: "handleLLMError"; err: any } & BaseAgentPacketWithIds)
  | ({ type: "handleLLMStart" } & BaseAgentPacketWithIds)
  | ({ type: "t"; t: string } & BaseAgentPacket) // handleLLMNewToken (shortened on purpose)
  | ({ type: "handleLLMEnd"; output: LLMResult } & BaseAgentPacketWithIds)
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
