// WaggleDance/types.ts
import { type Dispatch, type SetStateAction } from "react";

import type DAG from "./DAG";
import { type DAGNode } from "./DAG";

export type PlanResult = DAG;
export type ScheduledTask = DAGNode & { isScheduled: boolean };

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
  completedTasks: Set<string>
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
