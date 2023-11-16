/* eslint-disable @typescript-eslint/no-explicit-any */
// chain/utils/types.ts

import { type Document } from "langchain/document";
import { type Serialized } from "langchain/load/serializable";
import {
  type AgentAction,
  type BaseMessage,
  type Generation,
  type LLMResult,
} from "langchain/schema";
import { parse as jsonParse } from "superjson";
import { parse as yamlParse } from "yaml";

import { removeEnclosingMarkdown } from "../..";
import { type ContextAndTools } from "./execute/callExecutionAgent.types";

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
  | "handleLLMEnd"
  | "handleLLMStart"
  | "t" // token
  | "handleChainEnd"
  | "handleChainStart"
  | "handleToolEnd"
  | "handleToolStart"
  | "handleAgentAction"
  | "handleText"
  | "handleToolError"
  // ours
  | "starting"
  | "working"
  | "idle"
  | "contextAndTools"
  | "rewrite"
  | "refine"
  | "review";

export const AgentPacketFinishedTypes = [
  "handleAgentEnd",
  "done",
  "artifact", // maybe not done? could be a side-effect of agents mid-run
  "error",
  "handleChainError",
  "handleLLMError",
  "handleAgentError",
] as const;

export const AgentPacketFinishedStrings = Array.from(
  AgentPacketFinishedTypes as unknown as string[],
);

export type AgentPacketFinishedType = (typeof AgentPacketFinishedTypes)[number];

const agentPacketFinishedTypesSet = new Set(AgentPacketFinishedStrings);

export const isAgentPacketFinishedType = (packet: AgentPacket) => {
  const { type } = packet;
  if (type === "error" && packet.severity !== "fatal") {
    return false;
  }
  return agentPacketFinishedTypesSet.has(type);
};

export const findFinishPacket = (packets: AgentPacket[]): AgentPacket => {
  const packet = packets.findLast((packet) => {
    try {
      return isAgentPacketFinishedType(packet);
    } catch (err) {
      return false;
    }
  }) ?? {
    type: "error",
    severity: "fatal",
    error: packets.length > 0 ? `Working…` : `None yet`,
  };

  return packet;
};

class FindResultError extends Error {
  constructor(packets: AgentPacket[], originalError?: unknown) {
    super();
    this.message = `Could not find result in: ${packets.join(
      ", ",
    )}, after ${String(originalError)}`;
    this.cause = originalError;
  }
}
export const findResult = (packets: AgentPacket[]): string => {
  const finishPacket = findFinishPacket(packets);
  switch (finishPacket.type) {
    case "done":
    case "handleAgentEnd":
      // some type issue elsewhere is allowing this to not be a string
      // allows unpacking wrapped packets
      if (typeof finishPacket.value !== "string") {
        console.debug("finishPacket.value", finishPacket.value);
        if (finishPacket as AgentPacket) {
          return findResult([finishPacket.value as AgentPacket]);
        }
        try {
          const parsed: unknown = yamlParse(finishPacket.value);
          if (parsed as AgentPacket) {
            return findResult([parsed as AgentPacket]);
          }
        } catch (err) {
          try {
            const parsed: unknown = jsonParse(finishPacket.value);
            if (parsed as AgentPacket) {
              return findResult([parsed as AgentPacket]);
            } else {
              throw new FindResultError(packets, err);
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
      return finishPacket.value;
    case "error":
      if (typeof finishPacket.error === "string") {
        return finishPacket.error;
      }
      return JSON.stringify(finishPacket.error);
    case "handleChainError":
    case "handleAgentError":
    case "handleRetrieverError":
      if (typeof finishPacket.err === "string") {
        return finishPacket.err;
      }
      return JSON.stringify(finishPacket.err);
    case "working":
      return `…${packets.length} packets`;
    default:
      return JSON.stringify(finishPacket);
  }
};

export const findContextAndTools = (
  packets: AgentPacket[],
): ContextAndTools | null => {
  const lastContextAndToolsPacket = packets.findLast((packet) => {
    try {
      return packet.type === "contextAndTools";
    } catch (err) {
      return false;
    }
  }) as
    | ({
        type: "contextAndTools";
      } & ContextAndTools)
    | null;

  return {
    synthesizedContext:
      lastContextAndToolsPacket?.synthesizedContext ?? undefined,
    tools: lastContextAndToolsPacket?.tools ?? undefined,
  };
};

const extractText = (
  outputs: ChainValues | Generation | { text: string },
): { title: string; output: string } | undefined => {
  const actionString =
    "text" in outputs
      ? removeEnclosingMarkdown(outputs["text"] as string)
      : "None";
  try {
    const { action: title, action_input: output } = JSON.parse(
      actionString,
    ) as {
      action: string;
      action_input: string;
    };
    return { title, output };
  } catch {}
};
export function getMostRelevantOutput(packet: AgentPacket): {
  title: string;
  output: string;
} {
  switch (packet.type) {
    case "done":
      return { title: packet.type, output: packet.value };
    case "error":
      return { title: "Error", output: packet.error };
    case "handleAgentAction":
      return {
        title: packet.action.tool,
        output: packet.action.toolInput.slice(0, 50),
      };
    case "handleLLMEnd":
      const gens = packet.output.generations;
      if (!!gens) {
        const output = gens
          .map((p) => p.flatMap((pp) => extractText(pp)?.output || pp.text))
          .join(", ");
        return {
          title: `Think`,
          output: `${output.slice(0, 35)}`,
        };
      }
      return {
        title: "Think",
        output: Object.keys(packet.output).join(", "),
      };
    case "handleAgentEnd":
      return { title: "Done", output: packet.value };
    case "handleToolEnd":
      return { title: "Skill", output: packet.output };
    case "handleAgentError":
      return { title: "Error", output: String(packet.err) };
    case "handleLLMError":
      return { title: "Error", output: String(packet.err) };
    case "handleChainError":
      return { title: "Error", output: String(packet.err) };
    case "handleChainEnd":
      return (
        extractText(packet.outputs) || {
          title: `Chain End ${packet.parentRunId}`,
          output: String(packet.outputs["text"]),
        }
      );
    case "handleChainStart":
      return { title: "Work", output: "working" };
    case "handleLLMStart":
      return { title: "Think", output: "thinking" };
    case "handleRetrieverStart":
      return { title: "Retrieve", output: packet.query };
    case "handleRetrieverEnd":
      return { title: "Retrieve", output: String(packet.documents) };
    case "handleRetrieverError":
      return { title: "Retrieve", output: String(packet.err) };
    case "handleChatModelStart":
      return { title: "?", output: String(packet.llm) };
    case "working":
      return { title: "Working", output: "working" };
    case "idle":
      return { title: "Idle", output: "idle" };
    case "starting":
      return { title: "Starting", output: "starting" };
    case "handleToolStart":
      return { title: "Skill", output: packet.input };
    default:
      return { title: "", output: "None" };
  }
}
export type WaggleDanceAgentPacket =
  | ({
      type: "contextAndTools";
    } & BaseAgentPacketWithIds &
      ContextAndTools)
  | ({
      type: "refine";
    } & BaseAgentPacketWithIds)
  | ({
      type: "rewrite";
    } & BaseAgentPacketWithIds)
  | ({
      type: "review";
    } & BaseAgentPacketWithIds)
  | ({ type: "artifact"; url: string | URL } & BaseAgentPacketWithIds);

// TODO: group these by origination for different logic, or maybe different typings

export type AgentPacket =
  | WaggleDanceAgentPacket
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
  | ({
      type: "handleLLMStart";
      llmHash?: number | undefined;
      hash?: number | undefined;
    } & BaseAgentPacketWithIds)
  | ({ type: "t"; t: string } & BaseAgentPacket) // handleLLMNewToken (shortened on purpose)
  | ({ type: "handleLLMEnd"; output: LLMResult } & BaseAgentPacketWithIds)
  | ({ type: "handleChainEnd"; outputs: ChainValues } & BaseAgentPacketWithIds)
  | ({
      type: "handleChainStart";
      chainHash?: number | undefined;
      inputsHash?: number | undefined;
    } & BaseAgentPacketWithIds)
  | ({
      type: "handleToolEnd";
      output: string;
      lastToolInput?: string;
    } & BaseAgentPacketWithIds)
  | ({
      type: "handleToolError";
      err: any;
      lastToolInput?: string;
    } & BaseAgentPacketWithIds)
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
      error: string;
    } & BaseAgentPacket)
  // client-side only
  | ({ type: "starting"; nodeId: string } & BaseAgentPacket)
  | ({ type: "working"; nodeId: string } & BaseAgentPacket)
  | ({ type: "idle"; nodeId: string } & BaseAgentPacket);

export default AgentPacket;
