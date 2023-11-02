import { type Step, type Task } from "lib/AgentProtocol/types";

export const tasks: Record<string, Task> = {};
export const steps: Record<string, Step> = {};

export const stub = {
  tasks,
  steps,
};
