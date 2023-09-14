import { type AgentPacket, type AgentSettingsMap } from "@acme/agent";
import { type DraftExecutionGraph, type DraftExecutionNode } from "@acme/db";

import executeTask from "../utils/executeTask";
import { mapAgentSettingsToCreationProps } from "./types";

type LogType = (...args: (string | number | object)[]) => void;
export type InjectAgentPacketType = (
  agentPacket: AgentPacket,
  node: DraftExecutionNode,
) => void;
type ResolveFirstTaskType = (
  value?: AgentPacket | PromiseLike<AgentPacket>,
) => void;
type RejectFirstTaskType = (reason?: string | Error) => void;

class TaskExecutor {
  public readonly scheduledTasks: Set<Promise<unknown>> = new Set();
  public readonly completedTasks: Set<string> = new Set();

  constructor(
    private agentSettings: AgentSettingsMap,
    private goal: string,
    private goalId: string,
    private executionId: string,
    private abortController: AbortController,
    private injectAgentPacket: InjectAgentPacketType,
    private log: LogType,
    private resolveFirstTask: ResolveFirstTaskType,
    private rejectFirstTask: RejectFirstTaskType,
  ) {}

  async startFirstTask(
    task: DraftExecutionNode,
    dag: DraftExecutionGraph,
  ): Promise<void> {
    this.log(
      "speed optimization: we are able to execute the first task while still planning.",
    );
    this.completedTasks.add(task.id);

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
          creationProps,
        };
        const result = await executeTask({
          request: executeRequest,
          injectAgentPacket: this.injectAgentPacket,
          log: this.log,
          abortSignal: this.abortController.signal,
        });

        this.resolveFirstTask(result);

        this.injectAgentPacket(result, task);

        // const taskState = new TaskState({
        //   ...task,
        //   nodeId: task.id,
        //   value: result,
        //   packets: [result],
        //   updatedAt: new Date(),
        // });
        // this.taskResultsState[0][task.id] = taskState;
      } catch (error) {
        if (error instanceof Error) {
          this.injectAgentPacket(
            {
              type: "error",
              severity: "warn",
              error,
            },
            task,
          );
          this.rejectFirstTask(error.message);
        } else if (error as AgentPacket) {
          const packet = error as AgentPacket;
          this.injectAgentPacket(packet, task);
          this.rejectFirstTask(packet.type);
        } else if (typeof error === "string") {
          this.injectAgentPacket(
            {
              type: "error",
              severity: "warn",
              error: new Error(error),
            },
            task,
          );
          this.rejectFirstTask(error);
        } else {
          this.injectAgentPacket(
            {
              type: "error",
              severity: "warn",
              error: new Error("Unknown error"),
            },
            task,
          );
          this.rejectFirstTask("Unknown error");
        }

        this.abortController.abort();
      }
    } else {
      console.warn("aborted startFirstTask");
      this.rejectFirstTask("Signal aborted");
      this.abortController.abort();
    }
  }

  markPlanAsDone(planId: string): void {
    this.completedTasks.add(planId);
  }

  async executeTasks(
    tasks: Array<DraftExecutionNode>,
    dag: DraftExecutionGraph,
    agentSettings: AgentSettingsMap,
  ): Promise<void> {
    for (const task of tasks) {
      const taskPromise = this.executeTask(task, dag, agentSettings);
      this.scheduledTasks.add(taskPromise);
      try {
        await taskPromise;
        this.completedTasks.add(task.id);
      } catch (error) {
        this.handleError(task, error);
        this.abortController.abort();
      } finally {
        this.scheduledTasks.delete(taskPromise);
      }
    }
  }

  private async executeTask(
    task: DraftExecutionNode,
    dag: DraftExecutionGraph,
    agentSettings: AgentSettingsMap,
  ): Promise<void> {
    if (!this.abortController.signal.aborted) {
      try {
        const creationProps = mapAgentSettingsToCreationProps(
          agentSettings["execute"],
        );
        const executeRequest = {
          goal: this.goal,
          goalId: this.goalId,
          executionId: this.executionId,
          agentPromptingMethod: agentSettings["execute"].agentPromptingMethod!,
          task,
          dag,
          revieweeTaskResults: null, // intentionally left blank, first task can't be criticism
          completedTasks: this.completedTasks,
          creationProps,
        };
        const taskPromise = executeTask({
          request: executeRequest,
          injectAgentPacket: this.injectAgentPacket,
          log: this.log,
          abortSignal: this.abortController.signal,
        });
        this.scheduledTasks.add(taskPromise);
        const result = await taskPromise;
        this.scheduledTasks.delete(taskPromise);
        this.completedTasks.add(task.id);

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
          this.rejectFirstTask(error.message);
        } else if (error as AgentPacket) {
          const packet = error as AgentPacket;
          this.injectAgentPacket(packet, task);
          this.rejectFirstTask(packet.type);
        } else if (typeof error === "string") {
          this.injectAgentPacket(
            {
              type: "error",
              severity: "warn",
              error: new Error(error),
            },
            task,
          );
          this.rejectFirstTask(error);
        } else {
          this.injectAgentPacket(
            {
              type: "error",
              severity: "warn",
              error: new Error("Unknown error"),
            },
            task,
          );
          this.rejectFirstTask("Unknown error");
        }

        this.abortController.abort();
      }
    } else {
      console.warn("aborted executeTasks");
      this.rejectFirstTask("Signal aborted");
      this.abortController.abort();
    }
  }

  private handleError(task: DraftExecutionNode, error: unknown): void {
    // Implementation of error handling
    debugger;
    this.cancelAllTasks();
    throw error;
  }

  private cancelAllTasks(): void {
    for (const _ of this.scheduledTasks) {
      for (const _ of this.scheduledTasks) {
        if (!this.abortController.signal.aborted) {
          this.abortController.abort();
        }
      }
      this.scheduledTasks.clear();
    }
  }

  isGoalReached(dag: DraftExecutionGraph): boolean {
    const isGoalReached =
      this.scheduledTasks.size === 0 &&
      this.completedTasks.size > 0 &&
      dag.nodes.every((node) => this.completedTasks.has(node.id));
    if (isGoalReached) {
      debugger;
    }
    return isGoalReached;
  }
}

export default TaskExecutor;
