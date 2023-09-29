import { type ExecutionNode } from "@acme/db";

export const rootPlanId = `👸🐝`;

export const rootPlanNode = (goalPrompt: string): ExecutionNode => ({
  id: rootPlanId,
  name: `Plan Bee`,
  context: `Plan initial strategy to help achieve your goal: ${goalPrompt}`,
  graphId: null,
});
