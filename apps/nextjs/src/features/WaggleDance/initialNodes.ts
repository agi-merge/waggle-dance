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
