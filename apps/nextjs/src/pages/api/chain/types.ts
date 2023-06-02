// api/chain/types.ts

import { type ModelCreationProps } from "@acme/chain";

import type DAG from "~/features/WaggleDance/DAG";
import { type DAGNode } from "~/features/WaggleDance/DAG";
import { type BaseResultType } from "~/features/WaggleDance/types";

export interface BaseRequestBody {
  creationProps: ModelCreationProps;
  goal: string;
}

export type StrategyRequestBody = BaseRequestBody;
export interface ExecuteRequestBody extends BaseRequestBody {
  task: DAGNode;
  completedTasks: Set<string>;
  taskResults: Record<string, BaseResultType>;
  dag: DAG;
  executionMethod: string;
  result: string;
  reviewPrefix: string;
}
