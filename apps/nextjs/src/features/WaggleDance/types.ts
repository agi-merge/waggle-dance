// WaggleDance/types.ts

import { type Dispatch, type SetStateAction } from "react";

import { type BaseRequestBody } from "~/pages/api/chain/types";
import type DAG from "./DAG";

export type PlanResult = DAG;

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
}

export type GraphDataState = [DAG, Dispatch<SetStateAction<DAG>>];
export interface BaseWaggleDanceMachine {
  run(
    request: BaseRequestBody,
    graphDataState: GraphDataState,
  ): Promise<WaggleDanceResult | Error>;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | object
  | Array<JsonValue>;
