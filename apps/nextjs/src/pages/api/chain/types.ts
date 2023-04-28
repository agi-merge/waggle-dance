import { ModelCreationProps } from "@acme/chain";

export interface StrategyRequestBody {
  modelSettings: ModelCreationProps;
  goal: string;
  task?: string;
  tasks?: string[];
  lastTask?: string;
  result?: string;
  completedTasks?: string[];
}
