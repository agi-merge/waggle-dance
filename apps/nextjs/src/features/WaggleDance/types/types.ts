// WaggleDance/types.ts
import type {Dispatch, SetStateAction} from "react";
import type {JsonObject} from "langchain/tools";

import type {AgentSettings, ModelCreationProps, TaskState} from "@acme/agent";
import {
  TEMPERATURE_VALUES
  
} from "@acme/agent/src/utils/llms";
import type {AgentPromptingMethod} from "@acme/agent/src/utils/llms";
import type {DraftExecutionGraph, DraftExecutionNode} from "@acme/db";

import { env } from "~/env.mjs";

export type PlanResult = DraftExecutionGraph;

export interface WaggleDanceContextType {
  dag: DraftExecutionGraph;
  updateDAG: (dag: DraftExecutionGraph) => void;
}

export interface TaskResult {
  taskId: string;
  result: string;
}

export interface Review {
  overall: number;
}

export interface ReviewResult {
  target: string;
  review: Review;
}

export type BaseResultType = JsonValue | void;
export type WaggleDanceResult = Record<string, TaskState>;

export type GraphDataState = [
  DraftExecutionGraph,
  (dag: DraftExecutionGraph, goalPrompt: string) => void,
];
export type TaskResultsState = [
  Record<string, TaskState>,
  Dispatch<SetStateAction<Record<string, TaskState>>>,
];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | object
  | JsonValue[];

export function mapAgentSettingsToCreationProps(
  agentSettings: AgentSettings,
): ModelCreationProps {
  return {
    modelName: agentSettings.modelName,
    temperature: TEMPERATURE_VALUES[agentSettings.temperature],
    maxTokens: agentSettings.maxTokens,
    topP: agentSettings.topP,
    maxConcurrency: agentSettings.maxConcurrency,
    frequencyPenalty: agentSettings.frequencyPenalty,
    streaming: true,
    basePath: env.NEXT_PUBLIC_LANGCHAIN_API_URL,
    verbose: env.NEXT_PUBLIC_LANGCHAIN_VERBOSE === "true",
  };
}

export interface BaseRequestBody {
  creationProps: ModelCreationProps;
  goalId: string;
  goalPrompt: string;
  agentProtocolOpenAPISpec?: JsonObject;
}

export interface RefineRequestBody {
  goalPrompt: string;
}

export type PlanRequestBody = BaseRequestBody & {
  executionId: string;
};

export type ExecuteRequestBody = PlanRequestBody & {
  executionId: string;
  task: DraftExecutionNode;
  revieweeTaskResults: TaskState[];
  dag: DraftExecutionGraph;
  agentPromptingMethod: AgentPromptingMethod;
};
