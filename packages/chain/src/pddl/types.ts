export type PddlType = "agent" | "task" | "resource";

export interface PddlObject {
  name: string;
  type: PddlType;
}

export interface PddlPredicate {
  name: string;
  args: PddlObject[];
}

export interface PddlFunction {
  name: string;
  args: PddlObject[];
  value: number;
}

export interface PddlAction {
  name: string;
  parameters: PddlObject[];
  duration: number;
  condition: PddlPredicate[];
  effect: PddlPredicate[];
}
