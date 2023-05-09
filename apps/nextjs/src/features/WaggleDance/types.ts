import { type LinkObject, type NodeObject } from "./components/ForceGraph";

export type PlanResult = {
  planId: string;
  tasks: string[];
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
