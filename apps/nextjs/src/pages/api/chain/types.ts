// api/chain/types.ts

import { type ModelCreationProps } from "@acme/chain";
import { type AgentPromptingMethod, TEMPERATURE_VALUES } from "@acme/chain/src/utils/llms";
import { env } from "~/env.mjs";

import type DAG from "~/features/WaggleDance/DAG";
import { type DAGNode } from "~/features/WaggleDance/DAG";
import { type BaseResultType } from "~/features/WaggleDance/types";
import { type AgentSettings } from "~/stores/waggleDanceStore";

export function mapAgentSettingsToCreationProps(agentSettings: AgentSettings): ModelCreationProps {
  return {
    modelName: agentSettings.modelName,
    temperature: TEMPERATURE_VALUES[agentSettings.temperature],
    maxTokens: -1,
    topP: agentSettings.topP,
    maxConcurrency: agentSettings.maxConcurrency,
    frequencyPenalty: agentSettings.frequencyPenalty,
    streaming: true,
    verbose: env.NEXT_PUBLIC_LANGCHAIN_VERBOSE === "true",
  };
}

export interface BaseRequestBody {
  creationProps: ModelCreationProps;
  goalId: string;
  goal: string;
}

export type PlanRequestBody = BaseRequestBody;
export interface ExecuteRequestBody extends BaseRequestBody {
  task: DAGNode;
  completedTasks: Set<string>;
  taskResults: Record<string, BaseResultType>;
  dag: DAG;
  agentPromptingMethod: AgentPromptingMethod;
  reviewPrefix: string;
}
