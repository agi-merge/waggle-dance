import {
  TaskStatus,
  type AgentPacket,
  type AgentSettingsMap,
  type DAGNode,
  type TaskState,
} from "@acme/agent";

import executeTask from "../utils/executeTask";
import type DAG from "./DAG";
import { type DAGNodeClass } from "./DAG";
import {
  mapAgentSettingsToCreationProps,
  type BaseResultType,
  type TaskResultsState,
} from "./types";

type LogType = (...args: (string | number | object)[]) => void;
type SendAgentPacketType = (
  agentPacket: AgentPacket,
  node: DAGNode | DAGNodeClass,
) => void;
type ResolveFirstTaskType = (
  value?: BaseResultType | PromiseLike<BaseResultType>,
) => void;
type RejectFirstTaskType = (reason?: string | Error) => void;

class TaskExecutor {
  constructor(
    private agentSettings: AgentSettingsMap,
    private goal: string,
    private goalId: string,
    private executionId: string,
    private completedTasks: Set<string>,
    private taskResultsState: TaskResultsState,
    private abortController: AbortController,
    private sendAgentPacket: SendAgentPacketType,
    private log: LogType,
    private resolveFirstTask: ResolveFirstTaskType,
    private rejectFirstTask: RejectFirstTaskType,
  ) {}
  async startFirstTask(task: DAGNode | DAGNodeClass, dag: DAG): Promise<void> {
    const taskResults = this.taskResultsState[0];
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
          completedTasks: this.completedTasks,
          creationProps,
        };
        const result = await executeTask({
          request: executeRequest,
          sendAgentPacket: this.sendAgentPacket,
          log: this.log,
          abortSignal: this.abortController.signal,
        });

        this.sendAgentPacket(
          {
            type: "done",
            value: result,
          },
          task,
        );
        this.resolveFirstTask(result);

        const taskState: TaskState = {
          ...task,
          status: TaskStatus.done,
          fromPacketType: "done",
          result,
          packets: [],
          updatedAt: new Date(),
        };
        taskResults[task.id] = taskState;
      } catch (error) {
        const message = (error as Error).message;
        this.sendAgentPacket(
          {
            type: "error",
            severity: "warn",
            message,
          },
          task,
        );
        this.rejectFirstTask(message);
        this.abortController.abort();
      }
    } else {
      console.warn("aborted startFirstTask");
      this.rejectFirstTask("Signal aborted");
      this.abortController.abort();
    }
  }
}

export default TaskExecutor;
