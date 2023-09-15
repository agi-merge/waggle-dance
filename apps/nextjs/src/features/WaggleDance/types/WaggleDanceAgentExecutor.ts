import {
  initialNodes,
  type AgentPacket,
  type AgentSettingsMap,
  type TaskState,
} from "@acme/agent";
import { type DraftExecutionGraph, type DraftExecutionNode } from "@acme/db";

import executeTask from "../utils/executeTask";
import { isGoalReached } from "../utils/isGoalReached";
import planTasks from "../utils/planTasks";
import { sleep } from "../utils/sleep";
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
  private error: Error | null = null;

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

  async run(): Promise<WaggleDanceResult | Error> {
    const taskResults: Record<string, TaskState> = {};
    this.error = null;
    const initialNode = initialNodes(this.goal)[0]!;
    void (async () => {
      try {
        const result = await this.planAndSetDAG();
        console.log("hiya");
        if (!result || result.nodes.length === 1) {
          this.setError(new Error("No plan found"));
        }
      } catch (error) {
        debugger;
        this.setError(error);
      }
    })();

    while (true) {
      const dag = this.graphDataState[0]; // Use the shared state to get the updated dag
      // if (!dag) {
      //   continue;
      // }

      if (isGoalReached(dag, this.completedTasks) || this.error) {
        debugger;
        break;
      }

      if (this.abortController.signal.aborted) {
        console.warn("aborted run");
        break;
      }

      // plan does not count as a pending task
      const pendingTasks = dag.nodes.filter(
        (node) =>
          node.id != initialNode.id && !this.completedTasks.has(node.id),
      );

      // Logic to filter tasks for the current layer
      const pendingCurrentDagLayerTasks = pendingTasks.filter((task) =>
        dag.edges
          .filter((edge) => edge.tId === task.id)
          .every((edge) => this.completedTasks.has(edge.sId)),
      );

      const isDonePlanning = this.completedTasks.has(initialNode.id);

      if (pendingTasks.length === 0 && isDonePlanning) {
        // sanity check for invalid state
        throw new Error(
          "No pending tasks while we are not planning, yet the goal is not reached.",
        );
      } else {
        if (pendingCurrentDagLayerTasks.length === 0) {
          console.log("sleeping");
          await sleep(100);
        } else {
          await this.executeTasks(pendingCurrentDagLayerTasks, dag);
        }
      }
    }

    return (
      this.error || {
        taskResults,
        completedTasks: this.completedTasks,
      }
    );
  }

  async planAndSetDAG(): Promise<DraftExecutionGraph | null> {
    const creationProps = mapAgentSettingsToCreationProps(
      this.agentSettings["plan"],
    );
    const fullPlanDAG = await planTasks({
      goal: this.goal,
      goalId: this.goalId,
      executionId: this.executionId,
      creationProps,
      graphDataState: this.graphDataState,
      log: this.log,
      injectAgentPacket: this.injectAgentPacket,
      abortSignal: this.abortController.signal,
    });

    if (fullPlanDAG) {
      this.graphDataState[1](fullPlanDAG, this.goal);
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
          this.setError(error);
        }
      } else {
        console.warn("aborted executeTasks");
      }
    }
  }

  private setError(error: unknown) {
    this.error =
      error instanceof Error ? error : new Error(`Unknown error: ${error}`);
  }
}

export default WaggleDanceAgentExecutor;
