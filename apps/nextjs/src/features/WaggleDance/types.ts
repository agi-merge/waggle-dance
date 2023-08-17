// WaggleDance/types.ts
import { type Dispatch, type SetStateAction } from "react";

import { type ModelCreationProps } from "@acme/agent";
import {
  TEMPERATURE_VALUES,
  type AgentPromptingMethod,
} from "@acme/agent/src/utils/llms";

import { env } from "~/env.mjs";
import { type AgentSettings } from "~/stores/waggleDanceStore";
import type DAG from "./DAG";
import { type DAGNode } from "./DAG";

export type PlanResult = DAG;

export type WaggleDanceContextType = {
  dag: DAG;
  updateDAG: (dag: DAG) => void;
};

export type TaskResult = {
  taskId: string;
  result: string;
};

export type Review = {
  overall: number;
};

export type ReviewResult = {
  target: string;
  review: Review;
};

export type BaseResultType = JsonValue | void;
export interface WaggleDanceResult {
  results: Record<string, BaseResultType>;
  completedTasks: Set<string>;
}

export type GraphDataState = [DAG, Dispatch<SetStateAction<DAG>>];
export type IsDonePlanningState = [boolean, Dispatch<SetStateAction<boolean>>];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | object
  | Array<JsonValue>;

export function mapAgentSettingsToCreationProps(
  agentSettings: AgentSettings,
): ModelCreationProps {
  return {
    modelName: agentSettings.modelName,
    temperature: TEMPERATURE_VALUES[agentSettings.temperature],
    maxTokens: -1,
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
  goal: string;
}

export type PlanRequestBody = BaseRequestBody & {
  executionId: string;
};

export type ExecuteRequestBody = PlanRequestBody & {
  executionId: string;
  task: DAGNode;
  completedTasks: Set<string>;
  taskResults: Record<string, BaseResultType>;
  dag: DAG;
  agentPromptingMethod: AgentPromptingMethod;
};
