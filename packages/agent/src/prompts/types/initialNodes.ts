import { v4 } from "uuid";

import { type DraftExecutionGraph, type ExecutionNode } from "@acme/db";

export const rootPlanId = `👸🐝`;
export const initialNodes = (prompt: string): ExecutionNode[] => [
  {
    id: rootPlanId,
    name: `👸🐝 Queen Bee`,
    context: `Plan initial strategy to help achieve your goal: ${prompt}`,
    graphId: v4(),
  },
];

export function findNodesWithNoIncomingEdges(
  dag: Partial<DraftExecutionGraph>,
) {
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
