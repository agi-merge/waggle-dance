import { v4 } from "uuid";

import { type ExecutionNode } from "@acme/db";

import type DAG from "./DAG";

export const rootPlanId = `👸🐝`;
export const initialNodes = (prompt: string): ExecutionNode[] => [
  {
    realId: v4(),
    id: rootPlanId,
    name: `👸🐝 Queen Bee`,
    context: `Plan initial strategy to help achieve your goal: ${prompt}`,
    graphId: v4(),
  },
];

export function findNodesWithNoIncomingEdges(dag: Partial<DAG>) {
  const nodesWithIncomingEdges = new Set<string>();
  for (const edge of dag.edges ?? []) {
    nodesWithIncomingEdges.add(edge.tId);
  }

  const nodesWithNoIncomingEdges = [];

  for (const node of dag.nodes ?? []) {
    if (!nodesWithIncomingEdges.has(node.id)) {
      nodesWithNoIncomingEdges.push(node);
    }
  }
  return nodesWithNoIncomingEdges;
}
