import { type AgentPacket, type AgentSettingsMap } from "@acme/agent";
import { type DraftExecutionGraph, type DraftExecutionNode } from "@acme/db";

import executeTask from "../utils/executeTask";
import { mapAgentSettingsToCreationProps } from "./types";

type LogType = (...args: (string | number | object)[]) => void;
export type InjectAgentPacketType = (
  agentPacket: AgentPacket,
  node: DraftExecutionNode,
) => void;

class TaskExecutor {
  constructor(
    private agentSettings: AgentSettingsMap,
    private goal: string,
    private goalId: string,
    private executionId: string,
    private completedTasks: Set<string>,
    private abortController: AbortController,
    private injectAgentPacket: InjectAgentPacketType,
    private log: LogType,
  ) {}

  async executeTasks(
    tasks: Array<DraftExecutionNode>,
    dag: DraftExecutionGraph,
  ): Promise<void> {
    for (const task of tasks) {
      if (!this.abortController.signal.aborted) {
        try {
          const creationProps = mapAgentSettingsToCreationProps(
            this.agentSettings["execute"],
          );
          const executeRequest = {
            goal: this.goal,
            goalId: this.goalId,
            executionId: this.executionId,
            agentPromptingMethod:
              this.agentSettings["execute"].agentPromptingMethod!,
            task,
            dag,
            revieweeTaskResults: null, // intentionally left blank, first task can't be criticism
            completedTasks: this.completedTasks,
            creationProps,
          };
          const result = await executeTask({
            request: executeRequest,
            injectAgentPacket: this.injectAgentPacket,
            log: this.log,
            abortSignal: this.abortController.signal,
          });

          this.injectAgentPacket(result, task);
        } catch (error) {
          // Handle errors during task execution
          if (error instanceof Error) {
            this.injectAgentPacket(
              {
                type: "error",
                severity: "warn",
                error,
              },
              task,
            );
          } else if (error as AgentPacket) {
            const packet = error as AgentPacket;
            this.injectAgentPacket(packet, task);
          } else if (typeof error === "string") {
            this.injectAgentPacket(
              {
                type: "error",
                severity: "warn",
                error: new Error(error),
              },
              task,
            );
          } else {
            this.injectAgentPacket(
              {
                type: "error",
                severity: "warn",
                error: new Error("Unknown error"),
              },
              task,
            );
          }

          this.abortController.abort();
        }
      } else {
        console.warn("aborted executeTasks");
        this.abortController.abort();
      }
    }
  }
}

export default TaskExecutor;
