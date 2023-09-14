import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";

export type AgentType = "plan" | "execute" | "criticize" | "refine";

export interface PromptParams {
  type: AgentType;
  creationProps?: ModelCreationProps;
  goal?: string;
  goalId?: string;
  task?: string;
  dag?: string;
  result?: string;
  tools?: string;
}

export const criticismSuffix = "c";
export function isTaskCriticism(id: string) {
  return id === criticismSuffix;
}
