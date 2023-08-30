import { type ModelCreationProps } from "../..";

export type ChainType = "plan" | "execute" | "criticize" | "refine";

export interface PromptParams {
  type: ChainType;
  creationProps?: ModelCreationProps;
  goal?: string;
  goalId?: string;
  task?: string;
  dag?: string;
  result?: string;
  tools?: string;
}

export const criticismSuffix = "-criticize";
export function isTaskCriticism(id: string) {
  return id.endsWith(criticismSuffix);
}
