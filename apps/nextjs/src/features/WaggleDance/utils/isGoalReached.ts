import type DAG from "@acme/agent/src/prompts/types/DAG";

export function isGoalReached(dag: DAG, completedTasks: Set<string>): boolean {
  const isGoalReached = dag.nodes.every((node) => completedTasks.has(node.id));
  if (isGoalReached) {
    debugger;
  }
  return isGoalReached;
}
