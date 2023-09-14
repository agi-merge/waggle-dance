// features/WaggleDance/WaggleDanceMachine.ts

import {
  initialNodes,
  rootPlanId,
  type AgentSettingsMap,
  type TaskState,
} from "../../../../../packages/agent";
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

export const runWaggleDanceMachine = async ({
  goal,
  goalId,
  executionId,
  agentSettings,
  graphDataState: [dag, setDAG],
  isDonePlanningState: [isDonePlanning, setIsDonePlanning],
  injectAgentPacket: injectAgentPacket,
  log,
  abortController,
}: RunParams): Promise<WaggleDanceResult | Error> => {
  console.debug("Running WaggleDanceMachine");
  const initNodes = initialNodes(goal);
  const completedTasks: Set<string> = new Set([rootPlanId]);

  const taskExecutor = new TaskExecutor(
    agentSettings,
    goal,
    goalId,
    executionId,
    completedTasks,
    abortController,
    injectAgentPacket,
    log,
  );

  if (dag.edges.length > 1 && isDonePlanning) {
    log("skipping planning because it is done - dag", dag);
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
      graphDataState: [dag, setDAG],
      log,
      injectAgentPacket,
      abortSignal: abortController.signal,
    });
    if (fullPlanDAG) {
      setDAG(fullPlanDAG, goal);
      dag = fullPlanDAG;
    }
    console.debug("dag", dag);
    console.debug("dag.nodes", fullPlanDAG);

    if (dag && initNodes[0]) {
      if (dag.nodes.length < 2) {
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
      }
      injectAgentPacket(
        {
          type: "done",
          value: `Planned an execution graph with ${dag.nodes.length} tasks and ${dag.edges.length} edges.`,
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

  const toDoNodes = Array.from(dag.nodes);
  const taskResults: Record<string, TaskState> = {};

  // Continue executing tasks and updating DAG until the goal is reached
  while (!isGoalReached(dag, completedTasks)) {
    if (abortController.signal.aborted) throw new Error("Signal aborted");

    const pendingTasks = toDoNodes.filter(
      (node) => !completedTasks.has(node.id),
    );

    if (pendingTasks.length === 0) {
      await sleep(1000); // FIXME: observation model instead
      continue;
    }

    const pendingCurrentDagLayerTasks = pendingTasks.filter((task) =>
      dag.edges
        .filter((edge) => edge.tId === task.id)
        .every((edge) => completedTasks.has(edge.sId)),
    );

    if (pendingCurrentDagLayerTasks.length === 0) {
      if (pendingTasks.length === 0 && toDoNodes.length === 0) {
        throw new Error(
          "No pending tasks, and no executable tasks, but goal not reached.",
        );
      }
    }

    await taskExecutor.executeTasks(pendingCurrentDagLayerTasks, dag);
  }

  console.debug("WaggleDanceMachine.run: completedTasks", completedTasks);
  console.groupEnd();

  return { taskResults, completedTasks };
};
