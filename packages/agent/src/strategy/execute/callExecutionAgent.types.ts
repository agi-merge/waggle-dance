// callExecutionAgent.types.ts

import type { JsonObject } from "langchain/tools";
import { z } from "zod";

import type { AgentPacket, Geo, ModelCreationProps, TaskState } from "../../..";
import type { AgentPromptingMethod } from "../../utils/llms";

export interface ContextAndTools {
  synthesizedContext?: string[];
  tools?: string[];
}

export interface CallExecutionAgentProps {
  creationProps: ModelCreationProps;
  goalPrompt: string;
  goalId: string;
  executionId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: string;
  dag: string;
  revieweeTaskResults: TaskState[];
  contentType: "application/json" | "application/yaml";
  abortSignal: AbortSignal;
  executionNamespace: string;
  lastToolInputs: Map<string, string>;
  handlePacketCallback: (packet: AgentPacket) => Promise<void>;
  agentProtocolOpenAPISpec?: JsonObject;
  geo?: Geo;
}

// could be replaced with?
// https://js.langchain.com/docs/modules/chains/additional/openai_functions/tagging

const contextAndToolsOutputSchema = z.object({
  synthesizedContext: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
});

const reActOutputSchema = z.object({
  action: z.string(),
  action_input: z.string(),
});

export { contextAndToolsOutputSchema, reActOutputSchema };
