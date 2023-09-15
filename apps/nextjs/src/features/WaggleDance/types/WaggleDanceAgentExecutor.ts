import { type MutableRefObject } from "react";

import {
  initialNodes,
  TaskState,
  type AgentPacket,
  type AgentSettingsMap,
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
  graphDataState: MutableRefObject<GraphDataState>;
  isDonePlanningState: IsDonePlanningState;
  injectAgentPacket: InjectAgentPacketType;
  log: (...args: (string | number | object)[]) => void;
  abortController: AbortController;
};

class WaggleDanceAgentExecutor {
  private error: Error | null = null;
  private taskResults: Record<string, TaskState> = {};

  constructor(
    private agentSettings: AgentSettingsMap,
    private goal: string,
    private goalId: string,
    private executionId: string,
    private abortController: AbortController,
    private graphDataState: MutableRefObject<GraphDataState>,
    private injectAgentPacket: InjectAgentPacketType,
    private log: LogType,
  ) {}

  async run(): Promise<WaggleDanceResult | Error> {
    this.taskResults = {};
    this.error = null;
    const initialNode = initialNodes(this.goal)[0]!;
    void (async () => {
      try {
        const result = await this.planAndSetDAG();
        if (!result || result.nodes.length === 1) {
          this.setError(new Error("No plan found"));
        }

        this.taskResults[initialNode.id] = new TaskState({
          ...initialNode,
          packets: [],
          value: {
            type: "done",
            value: `came up with a plan graph with ${
              result?.nodes.length ?? 0
            } tasks with ${result?.edges.length ?? 0} interdependencies`,
          },
          updatedAt: new Date(),
          nodeId: initialNode.id,
        });
      } catch (error) {
        debugger;
        this.setError(error);
      }
    })();

    while (true) {
      const dag = this.graphDataState.current[0]; // Use the shared state to get the updated dag
      console.debug("dag", dag);
      if (isGoalReached(dag, this.taskResults)) {
        console.debug("goal is reached");
        break;
      }
      if (this.error) {
        console.error("error", this.error);
        break;
      }

      if (this.abortController.signal.aborted) {
        console.warn("aborted run");
        break;
      }

      // plan does not count as a pending task
      const pendingTasks = dag.nodes.filter(
        (node) => node.id != initialNode.id && !this.taskResults[node.id],
      );

      // Logic to filter tasks for the current layer
      const pendingCurrentDagLayerTasks = pendingTasks.filter((task) =>
        dag.edges
          .filter((edge) => edge.tId === task.id)
          .every((edge) => this.taskResults[edge.sId]),
      );

      const isDonePlanning = this.taskResults[initialNode.id];

      if (pendingTasks.length === 0 && isDonePlanning) {
        // sanity check for invalid state
        throw new Error(
          "No pending tasks while we are not planning, yet the goal is not reached.",
        );
      } else {
        if (pendingCurrentDagLayerTasks.length === 0) {
          console.debug(
            "waiting for scheduled tasks (tasks without incomplete dependencies)",
          );
          await sleep(100);
        } else {
          await this.executeTasks(pendingCurrentDagLayerTasks, dag);
        }
      }
    }

    return this.error || this.taskResults;
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
      graphDataState: this.graphDataState.current,
      log: this.log,
      injectAgentPacket: this.injectAgentPacket,
      abortSignal: this.abortController.signal,
    });

    if (fullPlanDAG) {
      this.graphDataState.current[1](fullPlanDAG, this.goal);
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
