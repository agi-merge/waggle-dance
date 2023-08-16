// WaggleDanceMachine.ts

// INTENDED BEHAVIOR:
// This machine is intended to plan and execute tasks concurrently, ensuring goal completion as quickly as possible.
// It starts by generating an execution DAG and then executes the tasks concurrently.
// When a task completes, a new dependent review task should be added to the DAG to ensure quality results.

import { mapAgentSettingsToCreationProps } from "~/pages/api/agent/types";
import { type AgentSettings } from "~/stores/waggleDanceStore";
import { type ChainPacket } from "../../../../../packages/agent";
import DAG, {
  DAGEdgeClass,
  DAGNodeClass,
  type DAGNode,
  type OptionalDAG,
} from "./DAG";
import {
  type BaseResultType,
  type GraphDataState,
  type IsDonePlanningState,
  type WaggleDanceResult,
} from "./types";
import executeTask, { sleep } from "./utils/executeTask";
import planTasks from "./utils/planTasks";

// Check if every node is included in the completedTasks set
function isGoalReached(dag: DAG, completedTasks: Set<string>): boolean {
  return dag.nodes.every((node) => completedTasks.has(node.id));
}
export const initialCond = { predicate: "", context: {} };
export const rootPlanId = `👸🐝`;
export const initialNodes = (goal: string) => [
  new DAGNodeClass(
    rootPlanId,
    `👸🐝 Queen Bee`,
    `Plan initial strategy to help achieve your goal`,
    goal,
    null,
  ),
];
export const initialEdges = () => [];

export function findNodesWithNoIncomingEdges(
  dag: DAG | OptionalDAG,
): DAGNode[] {
  const nodesWithIncomingEdges = new Set<string>();
  for (const edge of dag.edges ?? []) {
    nodesWithIncomingEdges.add(edge.tId);
  }

  const nodesWithNoIncomingEdges: DAGNode[] = [];

  for (const node of dag.nodes ?? []) {
    if (!nodesWithIncomingEdges.has(node.id)) {
      nodesWithNoIncomingEdges.push(node);
    }
  }
  return nodesWithNoIncomingEdges;
}

export type OptimisticFirstTaskState = {
  firstTaskState: "not started" | "started" | "done" | "error";
  taskId?: string;
};

export type RunParams = {
  goal: string;
  goalId: string;
  executionId: string;
  agentSettings: Record<"plan" | "review" | "execute", AgentSettings>;
  graphDataState: GraphDataState;
  isDonePlanningState: IsDonePlanningState;
  sendChainPacket: (
    chainPacket: ChainPacket,
    node: DAGNode | DAGNodeClass,
  ) => void;
  log: (...args: (string | number | object)[]) => void;
  abortController: AbortController;
};

// The main class for the WaggleDanceMachine that coordinates the planning and execution of tasks
export default class WaggleDanceMachine {
  constructor() {
    console.warn("WaggleDanceMachine constructor");
  }
  async run({
    goal,
    goalId,
    executionId,
    agentSettings,
    graphDataState: [initDAG, setDAG],
    isDonePlanningState: [isDonePlanning, setIsDonePlanning],
    sendChainPacket,
    log,
    abortController,
  }: RunParams): Promise<WaggleDanceResult | Error> {
    setDAG({ ...initDAG });
    const optimisticFirstTaskState = {
      firstTaskState: "not started" as
        | "not started"
        | "started"
        | "done"
        | "error",
    } as OptimisticFirstTaskState;

    const initNodes = initialNodes(goal);

    let dag = ((): DAG => {
      return new DAG(
        [...initNodes],
        // connect our initial nodes to the DAG: gotta find them and create edges
        [...initialEdges()],
      );
    })();
    const completedTasks: Set<string> = new Set([rootPlanId]);
    const taskResults: Record<string, BaseResultType> = {};

    const startFirstTask = async (task: DAGNode | DAGNodeClass, dag: DAG) => {
      log(
        "speed optimization: we are able to execute the first task while still planning.",
      );
      optimisticFirstTaskState.firstTaskState = "started";
      optimisticFirstTaskState.taskId = task.id;
      completedTasks.add(task.id); // calling this pre-emptively allows our logic for regular tasks to remain simple.
      // Call the executeTasks function for the given task and update the states accordingly
      if (!abortController.signal.aborted) {
        let result;
        try {
          const creationProps = mapAgentSettingsToCreationProps(
            agentSettings["execute"],
          );

          const executeRequest = {
            goal,
            goalId,
            executionId,
            agentPromptingMethod:
              agentSettings["execute"].agentPromptingMethod!,
            task,
            dag,
            taskResults,
            completedTasks,
            creationProps,
          };

          result = await executeTask({
            request: executeRequest,
            sendChainPacket,
            log,
            abortSignal: abortController.signal,
          });
        } catch (error) {
          sendChainPacket(
            {
              type: "error",
              severity: "warn",
              message: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            },
            task,
          );
          optimisticFirstTaskState.firstTaskState = "error";
          return;
        }
        taskResults[task.id] = result;
        const node = dag.nodes.find((n) => task.id === n.id);
        if (!node) {
          optimisticFirstTaskState.firstTaskState = "error";
          abortController.abort();
          throw new Error("no node to sendChainPacket");
        } else {
          if (!result) {
            sendChainPacket(
              { type: "error", severity: "warn", message: "no task result" },
              node,
            );
            optimisticFirstTaskState.firstTaskState = "error";
            abortController.abort();
            return;
          } else if (typeof result === "string") {
            sendChainPacket({ type: "done", value: result }, node);
          }
        }
        log("optimistic first task succeeded", result);
        optimisticFirstTaskState.firstTaskState = "done";
      } else {
        console.warn("aborted startFirstTask");
        optimisticFirstTaskState.firstTaskState = "error";
        abortController.abort();
        return;
      }
      // console.error("Error executing the first task:", error);
    };
    if (initDAG.edges.length > 1 && isDonePlanning) {
      log("skipping planning because it is done - initDAG", initDAG);
    } else {
      setIsDonePlanning(false);
      const updateTaskState = (state: "not started" | "started" | "done") => {
        optimisticFirstTaskState.firstTaskState = state;
      };
      try {
        const creationProps = mapAgentSettingsToCreationProps(
          agentSettings["plan"],
        );

        dag = await planTasks({
          goal,
          goalId,
          executionId,
          creationProps,
          dag,
          graphDataState: [initDAG, setDAG],
          log,
          sendChainPacket,
          optimisticFirstTaskState,
          abortSignal: abortController.signal,
          updateTaskState,
          startFirstTask,
        });
        const hookupEdges = findNodesWithNoIncomingEdges(dag).map(
          (node) => new DAGEdgeClass(rootPlanId, node.id),
        );
        dag = new DAG(
          [...initNodes, ...dag.nodes],
          // connect our initial nodes to the DAG: gotta find them and create edges
          [...initialEdges(), ...(dag.edges ?? []), ...hookupEdges],
        );
      } catch (error) {
        if (initNodes[0]) {
          sendChainPacket(
            {
              type: "error",
              severity: "fatal",
              message: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            },
            initNodes[0],
          );
          return error as Error;
        } else {
          throw new Error("no initial node");
        }
      }

      if (dag && dag.nodes) {
        const rootNode = dag.nodes.find((n) => n.id === rootPlanId);
        if (!rootNode) {
          throw new Error("no root node");
        }
        sendChainPacket(
          {
            type: "done",
            value: `Planned an execution graph with ${dag.nodes.length} tasks and ${dag.edges.length} edges.`,
          },
          rootNode,
        );
        setIsDonePlanning(true);
      }

      log("done planning");
    }
    // prepend our initial nodes to the DAG

    const toDoNodes = Array.from(dag.nodes);
    // Continue executing tasks and updating DAG until the goal is reached
    while (!isGoalReached(dag, completedTasks)) {
      if (abortController.signal.aborted) throw new Error("Signal aborted");

      // console.group("WaggleDanceMachine.run")
      const pendingTasks = toDoNodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (
        pendingTasks.length === 0 ||
        optimisticFirstTaskState.firstTaskState === "started"
      ) {
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
      if (pendingCurrentDagLayerTasks.length > 0) {
        log(
          "relevantPendingTasks",
          pendingCurrentDagLayerTasks.map((task) => task.name),
        );
      }

      const task = pendingCurrentDagLayerTasks.splice(0, 1)[0]; // pop first task
      if (!task) {
        await sleep(100); // wait for tasks to end
        continue;
      }
      toDoNodes.splice(toDoNodes.indexOf(task), 1); // remove from toDoNodes

      const creationProps = mapAgentSettingsToCreationProps(
        agentSettings["execute"],
      );

      const executeRequest = {
        goal,
        goalId,
        executionId,
        agentPromptingMethod: agentSettings["execute"].agentPromptingMethod!,
        task,
        dag,
        taskResults,
        completedTasks,
        creationProps,
      };

      void (async () => {
        let result;
        try {
          result = await executeTask({
            request: executeRequest,
            sendChainPacket,
            log,
            abortSignal: abortController.signal,
          });
        } catch (error) {
          sendChainPacket(
            {
              type: "error",
              severity: "warn",
              message: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            },
            task,
          );
          abortController.abort();
          return;
        }
        taskResults[executeRequest.task.id] = result;
        completedTasks.add(executeRequest.task.id);
        const node = dag.nodes.find((n) => task.id === n.id);
        if (!node) {
          abortController.abort();
          throw new Error("no node to sendChainPacket");
        } else {
          if (!result) {
            sendChainPacket(
              { type: "error", severity: "warn", message: "no task result" },
              node,
            );
            abortController.abort();
            return;
          } else if (typeof result === "string") {
            sendChainPacket({ type: "done", value: result }, node);
          }
        }
      })();
    }

    console.debug("WaggleDanceMachine.run: completedTasks", completedTasks);
    console.groupEnd();

    return { results: taskResults, completedTasks };
  }
}
