// WaggleDanceMachine.ts

// INTENDED BEHAVIOR:
// This machine is intended to plan and execute tasks concurrently, ensuring goal completion as quickly as possible.
// It starts by generating an execution DAG and then executes the tasks concurrently.
// When a task completes, a new dependent review task should be added to the DAG to ensure quality results.

import {
  type AgentSettingsMap,
  type TaskState,
} from "../../../../../packages/agent";
import { initialNodes, rootPlanId } from "./types/initialNodes";
import TaskExecutor, { type InjectAgentPacketType } from "./types/TaskExecutor";
import {
  mapAgentSettingsToCreationProps,
  type GraphDataState,
  type IsDonePlanningState,
  type WaggleDanceResult,
} from "./types/types";
import { isGoalReached } from "./utils/isGoalReached";
import planTasks from "./utils/planTasks";
import { sleep } from "./utils/sleep";

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

// The main class for the WaggleDanceMachine that coordinates the planning and execution of tasks
export default class WaggleDanceMachine {
  constructor() {
    console.debug("WaggleDanceMachine.constructor");
  }
  async run({
    goal,
    goalId,
    executionId,
    agentSettings,
    graphDataState: [getDAG, setDAG],
    isDonePlanningState: [isDonePlanning, setIsDonePlanning],
    injectAgentPacket: injectAgentPacket,
    log,
    abortController,
  }: RunParams): Promise<WaggleDanceResult | Error> {
    const initNodes = initialNodes(goal);

    const completedTasks: Set<string> = new Set([rootPlanId]);

    let resolveFirstTask: () => void = () => {}; // these are just placeholders, overwritten within firstTaskPromise
    let rejectFirstTask: () => void = () => {}; // these are just placeholders, overwritten within firstTaskPromise

    const firstTaskPromise = new Promise<void>((resolve, reject) => {
      resolveFirstTask = resolve;
      rejectFirstTask = reject;
    });

    const taskExecutor = new TaskExecutor(
      agentSettings,
      goal,
      goalId,
      executionId,
      completedTasks,
      abortController,
      injectAgentPacket,
      log,
      resolveFirstTask,
      rejectFirstTask,
    );

    if (getDAG().edges.length > 1 && isDonePlanning) {
      log("skipping planning because it is done - dag", getDAG());
    } else {
      setIsDonePlanning(false);
      const creationProps = mapAgentSettingsToCreationProps(
        agentSettings["plan"],
      );

      const fullPlanDAG = await planTasks({
        goal,
        goalId,
        executionId,
        creationProps,
        graphDataState: [getDAG, setDAG],
        log,
        injectAgentPacket,
        startFirstTask: taskExecutor.startFirstTask.bind(taskExecutor),
        abortSignal: abortController.signal,
      });
      if (fullPlanDAG) {
        setDAG(fullPlanDAG);
      }
      console.debug("dag", getDAG());

      if (getDAG() && initNodes[0]) {
        if (getDAG().nodes.length < 2) {
          injectAgentPacket(
            {
              type: "error",
              severity: "fatal",
              error: new Error(
                "No tasks planned, this is likely due to another uncaught error",
              ),
            },
            initNodes[0],
          );
        } else if (getDAG().edges.length < 1) {
          injectAgentPacket(
            {
              type: "error",
              severity: "fatal",
              error: new Error(
                "No edges planned, this is likely due to another uncaught error",
              ),
            },
            initNodes[0],
          );
        }
        injectAgentPacket(
          {
            type: "done",
            value: `Planned an execution graph with ${
              getDAG().nodes.length
            } tasks and ${getDAG().edges.length} edges.`,
          },
          initNodes[0],
        );
        setIsDonePlanning(true);
      } else {
        throw new Error("either no dag or no initial node");
      }

      log("done planning");
    }
    // prepend our initial nodes to the DAG

    const toDoNodes = Array.from(getDAG().nodes);
    const taskResults: Record<string, TaskState> = {};
    await firstTaskPromise;
    // Continue executing tasks and updating DAG until the goal is reached
    while (!isGoalReached(getDAG(), completedTasks)) {
      if (abortController.signal.aborted) throw new Error("Signal aborted");

      const pendingTasks = toDoNodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (pendingTasks.length === 0) {
        await sleep(1000); // FIXME: observation model instead
        continue;
      }

      const pendingCurrentDagLayerTasks = pendingTasks.filter((task) =>
        getDAG()
          .edges.filter((edge) => edge.tId === task.id)
          .every((edge) => completedTasks.has(edge.sId)),
      );

      if (pendingCurrentDagLayerTasks.length === 0) {
        if (pendingTasks.length === 0 && toDoNodes.length === 0) {
          throw new Error(
            "No pending tasks, and no executable tasks, but goal not reached.",
          );
        }
      }

      await taskExecutor.executeTasks(
        pendingCurrentDagLayerTasks,
        getDAG(),
        agentSettings,
      );
    }

    console.debug("WaggleDanceMachine.run: completedTasks", completedTasks);
    console.groupEnd();

    return { taskResults, completedTasks };
  }
}
