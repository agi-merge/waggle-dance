// WaggleDance/types.ts
import { type Dispatch, type SetStateAction } from "react";

import {
  type AgentSettings,
  type ModelCreationProps,
  type TaskState,
} from "@acme/agent";
import {
  TEMPERATURE_VALUES,
  type AgentPromptingMethod,
} from "@acme/agent/src/utils/llms";
import { type DraftExecutionGraph, type DraftExecutionNode } from "@acme/db";

import { env } from "~/env.mjs";

export type PlanResult = DraftExecutionGraph;

export type WaggleDanceContextType = {
  dag: DraftExecutionGraph;
  updateDAG: (dag: DraftExecutionGraph) => void;
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
export type WaggleDanceResult = Record<string, TaskState>;

export type GraphDataState = [
  DraftExecutionGraph,
  (dag: DraftExecutionGraph, goal: string) => void,
];
export type IsDonePlanningState = [boolean, Dispatch<SetStateAction<boolean>>];
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
  | Array<JsonValue>;

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
  goal: string;
}

export interface RefineRequestBody {
  goal: string;
}

export type PlanRequestBody = BaseRequestBody & {
  executionId: string;
};

export type ExecuteRequestBody = PlanRequestBody & {
  executionId: string;
  task: DraftExecutionNode;
  revieweeTaskResults: TaskState[] | null;
  // completedTasks: Set<string>;
  // taskResults: Record<string, BaseResultType>;
  dag: DraftExecutionGraph;
  agentPromptingMethod: AgentPromptingMethod;
};
