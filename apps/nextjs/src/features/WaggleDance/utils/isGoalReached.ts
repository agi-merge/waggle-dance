import type { TaskState } from "@acme/agent";
import type { DraftExecutionGraph } from "@acme/db";

export function isGoalReached(
  dag: DraftExecutionGraph,
  taskStates: Record<string, TaskState>,
): boolean {
  const isGoalReached = dag.nodes.every((node) => !!taskStates[node.id]);
  return isGoalReached;
}
