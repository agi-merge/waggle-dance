import { type DraftExecutionGraph } from "@acme/db";

export function isGoalReached(
  dag: DraftExecutionGraph,
  completedTasks: Set<string>,
): boolean {
  const isGoalReached = dag.nodes.every((node) => completedTasks.has(node.id));
  if (isGoalReached) {
    debugger;
  }
  return isGoalReached;
}
