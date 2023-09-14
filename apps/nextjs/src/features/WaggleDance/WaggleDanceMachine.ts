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
  let resolveFirstTask: () => void = () => {};
  let rejectFirstTask: () => void = () => {};

  const firstTaskPromise = new Promise<void>((resolve, reject) => {
    resolveFirstTask = resolve;
    rejectFirstTask = reject;
  });

  const taskExecutor = new TaskExecutor(
    agentSettings,
    goal,
    goalId,
    executionId,
    abortController,
    injectAgentPacket,
    log,
    resolveFirstTask,
    rejectFirstTask,
  );

  if (dag.edges.length > 1 && isDonePlanning) {
    log("skipping planning because it is done - dag", dag);
  } else {
    setIsDonePlanning(false);
    const creationProps = mapAgentSettingsToCreationProps(
      agentSettings["plan"],
    );

    void (async () => {
      const fullPlanDAG = await planTasks({
        goal,
        goalId,
        executionId,
        creationProps,
        graphDataState: [dag, setDAG],
        log,
        injectAgentPacket,
        startFirstTask: taskExecutor.startFirstTask.bind(taskExecutor),
        abortSignal: abortController.signal,
      });
      taskExecutor.markPlanAsDone(rootPlanId);
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
    })();
  }
  // prepend our initial nodes to the DAG

  const taskResults: Record<string, TaskState> = {};
  // Continue executing tasks and updating DAG until the goal is reached
  while (!taskExecutor.isGoalReached(dag)) {
    if (abortController.signal.aborted) throw new Error("Signal aborted");

    const allNodes = Array.from(dag.nodes);
    const pendingTasks = allNodes.filter(
      (node) => !taskExecutor.completedTasks.has(node.id),
    );

    if (pendingTasks.length === 0) {
      await sleep(1000); // FIXME: observation model instead
      continue;
    }

    const pendingCurrentDagLayerTasks = pendingTasks.filter((task) =>
      dag.edges
        .filter((edge) => edge.tId === task.id)
        .every((edge) => taskExecutor.completedTasks.has(edge.sId)),
    );

    // if (taskExecutor.length === 0) {
    //   if (pendingTasks.length === 0 && allNodes.length === 0) {
    //     throw new Error(
    //       "No pending tasks, and no executable tasks, but goal not reached.",
    //     );
    //   }
    // }

    void Promise.all([
      taskExecutor.executeTasks(
        pendingCurrentDagLayerTasks,
        dag,
        agentSettings,
      ),
    ]);
  }

  console.debug(
    "WaggleDanceMachine.run: completedTasks",
    taskExecutor.completedTasks,
  );
  console.groupEnd();

  return { taskResults, completedTasks: taskExecutor.completedTasks };
};
