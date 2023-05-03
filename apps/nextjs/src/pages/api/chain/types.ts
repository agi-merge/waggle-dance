import { ModelCreationProps } from "@acme/chain";

export interface StrategyRequestBody {
  creationProps: ModelCreationProps;
  goal: string;
  task?: string;
  tasks?: string[];
  lastTask?: string;
  result?: string;
  completedTasks?: string[];
}
