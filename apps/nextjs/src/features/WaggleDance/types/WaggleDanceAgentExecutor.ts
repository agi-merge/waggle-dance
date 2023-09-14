import {
  type AgentPacket,
  type AgentSettingsMap,
  type TaskState,
} from "@acme/agent";
import { type DraftExecutionGraph, type DraftExecutionNode } from "@acme/db";

import executeTask from "../utils/executeTask";
import { isGoalReached } from "../utils/isGoalReached";
import planTasks from "../utils/planTasks";
import {
  mapAgentSettingsToCreationProps,
  type GraphDataState,
  type IsDonePlanningState,
  type WaggleDanceResult,
} from "./types";

type LogType = (...args: (string | number | object)[]) => void;
export type InjectAgentPacketType = (
  agentPacket: AgentPacket,
  node: DraftExecutionNode,
) => void;

export type RunParams = {
  goal: string;
  goalId: string;
  executionId: string;
  agentSettings: AgentSettingsMap;
  graphDataState: GraphDataState;
  isDonePlanningState: IsDonePlanningState;
  injectAgentPacket: InjectAgentPacketType;
  log: (...args: (string | number | object)[]) => void;
  abortController: AbortController;
};

class WaggleDanceAgentExecutor {
  constructor(
    private agentSettings: AgentSettingsMap,
    private goal: string,
    private goalId: string,
    private executionId: string,
    private completedTasks: Set<string>,
    private abortController: AbortController,
    private graphDataState: GraphDataState,
    private injectAgentPacket: InjectAgentPacketType,
    private log: LogType,
  ) {}

  async run(): Promise<WaggleDanceResult> {
    const taskResults: Record<string, TaskState> = {};

    const dag = await this.planAndSetDAG();

    if (!dag) {
      throw new Error("Planning failed");
    }

    const toDoNodes = Array.from(dag.nodes);

    while (!isGoalReached(dag, this.completedTasks)) {
      if (this.abortController.signal.aborted) {
        throw new Error("Signal aborted");
      }

      const pendingTasks = toDoNodes.filter(
        (node) => !this.completedTasks.has(node.id),
      );

      // Logic to filter tasks for the current layer
      const pendingCurrentDagLayerTasks = pendingTasks.filter((task) =>
        dag.edges
          .filter((edge) => edge.tId === task.id)
          .every((edge) => this.completedTasks.has(edge.sId)),
      );

      if (
        pendingCurrentDagLayerTasks.length === 0 &&
        pendingTasks.length === 0
      ) {
        throw new Error(
          "No pending tasks, and no executable tasks, but goal not reached.",
        );
      }

      await this.executeTasks(pendingCurrentDagLayerTasks, dag);
    }

    return {
      taskResults,
      completedTasks: this.completedTasks,
    };
  }

  async planAndSetDAG(): Promise<DraftExecutionGraph | null> {
    const [dag, setDAG] = this.graphDataState;

    const creationProps = mapAgentSettingsToCreationProps(
      this.agentSettings["plan"],
    );
    const fullPlanDAG = await planTasks({
      goal: this.goal,
      goalId: this.goalId,
      executionId: this.executionId,
      creationProps,
      graphDataState: [dag, setDAG],
      log: this.log,
      injectAgentPacket: this.injectAgentPacket,
      abortSignal: this.abortController.signal,
    });

    if (fullPlanDAG) {
      setDAG(fullPlanDAG, this.goal);
      return fullPlanDAG;
    }
    return null;
  }

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
          this.injectError(error, task);
        }
      } else {
        console.warn("aborted executeTasks");
      }
    }
  }

  private injectError(error: unknown, task: DraftExecutionNode) {
    // let packet: AgentPacket;

    // if (error instanceof Error) {
    //   packet = { type: "error", severity: "warn", error };
    // } else if (typeof error === "string") {
    //   packet = { type: "error", severity: "warn", error: new Error(error) };
    // } else if (error as AgentPacket) {
    //   packet = error as AgentPacket;
    // } else {
    //   packet = {
    //     type: "error",
    //     severity: "warn",
    //     error: new Error("Unknown error"),
    //   };
    // }

    // this.injectAgentPacket(packet, task);
    this.abortController.abort();
  }
}

export default WaggleDanceAgentExecutor;
