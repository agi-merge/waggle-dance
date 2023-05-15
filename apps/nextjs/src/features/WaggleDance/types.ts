// WaggleDance/types.ts

import { type BaseRequestBody } from "~/pages/api/chain/types";
import { type LinkObject, type NodeObject } from "./components/ForceGraph";

export type PlanResult = {
  domain: string;
  problem: string;
};

export type ProcessedPlanResult = {
  domain: PDDLDomain;
  problem: PDDLProblem;
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

export type TaskSimulationCallbacks = {
  onTaskCreated: (newNode: NodeObject, newLink?: LinkObject) => void;
  onReviewFailure: (target: string, error: Error) => void;
};

type ChainMachineCallbacks = TaskSimulationCallbacks;

export type GraphData = {
  nodes: NodeObject[];
  links: LinkObject[];
};

export interface PDDLObject {
  type: string;
  name: string;
}

export interface PDDLAction {
  name: string;
  parameters: PDDLObject[];
  duration?: string;
  condition?: string;
  effect?: string;
}

export interface PDDLDomain {
  name: string;
  requirements: string[];
  types: PDDLObject[];
  predicates: string[];
  functions: string[];
  actions: PDDLAction[];
}

export interface PDDLProblem {
  name: string;
  domain: string;
  objects: PDDLObject[];
  init: string[];
  goal: string;
}
export type BaseResultType = JsonValue | void;
export interface WaggleDanceResult {
  readonly results: Record<string, BaseResultType>;
}

export interface BaseWaggleDanceMachine {
  run(
    request: BaseRequestBody,
    callbacks: ChainMachineCallbacks,
  ): Promise<WaggleDanceResult | Error>;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | object
  | Array<JsonValue>;
