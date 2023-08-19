import type DAG from "./DAG";
import { DAGNodeClass } from "./DAG";

export const rootPlanId = `👸🐝`;
export const initialNodes = (prompt: string) => [
  new DAGNodeClass(
    rootPlanId,
    `👸🐝 Queen Bee`,
    `Plan initial strategy to help achieve your goal`,
    prompt,
    null,
  ),
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
