import { v4 } from "uuid";

import { type ExecutionNode } from "@acme/db";

export const rootPlanId = `👸🐝`;
export const initialNodes = (goalPrompt: string): ExecutionNode[] => [
  {
    id: rootPlanId,
    name: `👸🐝 Queen Bee`,
    context: `Plan initial strategy to help achieve your goal: ${goalPrompt}`,
    graphId: v4(),
  },
];
