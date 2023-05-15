// api/chain/types.ts

import { type ModelCreationProps } from "@acme/chain";

import { type DAGNode } from "~/features/WaggleDance/DAG";
import { type BaseResultType } from "~/features/WaggleDance/types";

export interface BaseRequestBody {
  creationProps: ModelCreationProps;
  goal: string;
}

export type StrategyRequestBody = BaseRequestBody;
export interface ExecuteRequestBody extends BaseRequestBody {
  tasks: DAGNode[];
  completedTasks: string[];
  taskResults: Record<string, BaseResultType>;
}
