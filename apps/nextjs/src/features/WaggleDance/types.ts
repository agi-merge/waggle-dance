// WaggleDance/types.ts

import { type Dispatch, type SetStateAction } from "react";

import { type BaseRequestBody } from "~/pages/api/chain/types";
import type DAG from "./DAG";
import { type DAGNode } from "./DAG";
import { type ChainPacket } from "@acme/chain";

export type PlanResult = DAG;
export type ScheduledTask = DAGNode & { isScheduled: boolean };

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
export type ChainPacketsState = [ChainPacket[], Dispatch<SetStateAction<ChainPacket[]>>];

export interface BaseWaggleDanceMachine {
  run(
    request: BaseRequestBody,
    graphDataState: GraphDataState,
    isDonePlanningState: IsDonePlanningState,
    chainPacketsState: ChainPacketsState,
    log: (...args: (string | number | object)[]) => void,
    isRunning: boolean,
  ): Promise<WaggleDanceResult | Error>;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | object
  | Array<JsonValue>;
