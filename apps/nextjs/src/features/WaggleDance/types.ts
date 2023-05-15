import type PddlDomain from "@acme/chain/src/pddl/domain";

import { type LinkObject, type NodeObject } from "./components/ForceGraph";
import { type PDDLJSON } from "./utils/convertPDDLJSONToBalamb";

export type PlanResult = {
  planId: string;
  domain: string;
  problem: string;
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

export type GraphData = {
  nodes: NodeObject[];
  links: LinkObject[];
};
