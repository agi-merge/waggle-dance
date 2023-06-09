// WaggleDanceMachine.ts

// INTENDED BEHAVIOR:
// This machine is intended to plan and execute tasks concurrently, ensuring goal completion as quickly as possible.
// It starts by generating an execution DAG and then executes the tasks concurrently.
// When a task completes, a new dependent review task should be added to the DAG to ensure quality results.


import {
  type BaseRequestBody,
  type ExecuteRequestBody,
} from "~/pages/api/chain/types";
import DAG, { DAGNodeClass, DAGEdgeClass, type DAGNode, type OptionalDAG } from "./DAG";
import {
  type BaseResultType,
  type GraphDataState,
  type WaggleDanceResult,
  type IsDonePlanningState,
} from "./types";
import executeTask, { sleep } from "./utils/executeTasks";
import planTasks from "./utils/planTasks"
import { type ChainPacket } from "@acme/chain";
import { v4 as uuidv4 } from 'uuid';

// Check if every node is included in the completedTasks set
function isGoalReached(dag: DAG, completedTasks: Set<string>): boolean {
  return dag.nodes.every((node) => completedTasks.has(node.id));
}
export const initialCond = { predicate: "", context: {} }
export const rootPlanId = `👸-${uuidv4()}`
export const initialNodes = (goal: string, _modelName: string) => [
  new DAGNodeClass(
    rootPlanId,
    `👸🐝 Queen Bee`,
    `Planning how to achieve your goal`,
    { goal },
  ),
]
export const initialEdges = () => []

export function findNodesWithNoIncomingEdges(dag: DAG | OptionalDAG): DAGNode[] {
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
  firstTaskState: "not started" | "started" | "done" | "error"
  taskId?: string
}

// The main class for the WaggleDanceMachine that coordinates the planning and execution of tasks
export default class WaggleDanceMachine {

  async run(
    request: BaseRequestBody,
    [initDAG, setDAG]: GraphDataState,
    [isDonePlanning, setIsDonePlanning]: IsDonePlanningState,
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode) => void,
    log: (...args: (string | number | object)[]) => void,
    executionMethod: string,
    isRunning: boolean,
    abortSignal: AbortSignal,
  ): Promise<WaggleDanceResult | Error> {
    const reviewPrefix = `criticism-${new Date().getUTCMilliseconds()}-`
    const taskState = { firstTaskState: "not started" as "not started" | "started" | "done" | "error" } as OptimisticFirstTaskState;

    let dag: DAG
    let completedTasks: Set<string> = new Set([rootPlanId]);
    let taskResults: Record<string, BaseResultType> = {};
    const maxConcurrency = request.creationProps.maxConcurrency ?? 4;

    const startFirstTask = async (task: DAGNode) => {
      taskState.firstTaskState = "started";
      taskState.taskId = task.id
      // Call the executeTasks function for the given task and update the states accordingly
      if (!abortSignal.aborted) {
        const { completedTasks: newCompletedTasks, taskResults: newTaskResults } = await executeTask(
          { ...request, task, dag, taskResults, completedTasks, reviewPrefix, executionMethod },
          maxConcurrency,
          isRunning,
          sendChainPacket,
          log,
          abortSignal,
        )
        completedTasks = new Set([...newCompletedTasks, ...completedTasks]);
        taskResults = { ...newTaskResults, ...taskResults };
        sendChainPacket({ type: "done", nodeId: task.id, value: JSON.stringify(taskResults) }, dag.nodes.find(n => task.id == n.id)!)
        log("taskResults", taskResults);
        taskState.firstTaskState = "done";
      } else {
        console.warn("aborted startFirstTask")
        taskState.firstTaskState = "error";
        return
      }
      // console.error("Error executing the first task:", error);
    };
    if (initDAG.edges.length > 0 && isDonePlanning) {
      log("skipping planning because it is done - initDAG", initDAG);
      dag = { ...initDAG };
    } else {
      setIsDonePlanning(false);
      const updateTaskState = (state: "not started" | "started" | "done") => {
        taskState.firstTaskState = state;
      };

      dag = await planTasks(request.goal, request.creationProps, initDAG, setDAG, log, sendChainPacket, taskState, updateTaskState, startFirstTask);
      if (dag.nodes[0]) {
        sendChainPacket({ type: "done", nodeId: rootPlanId, value: "🍯 Return Goal" }, dag.nodes[dag.nodes.length - 1]!)
      } else {
        log("no nodes in dag")
      }

      setIsDonePlanning(true);
      log("done planning");
    }
    // prepend our initial nodes to the DAG
    const planDAG = new DAG(
      [...initialNodes(request.goal, request.creationProps.modelName), ...dag.nodes],
      // connect our initial nodes to the DAG: gotta find them and create edges
      [...initialEdges(), ...dag.edges, ...findNodesWithNoIncomingEdges(dag).map((node) => new DAGEdgeClass(rootPlanId, node.id))],
    )
    setDAG(planDAG);

    const toDoNodes = Array.from(planDAG.nodes)
    // Continue executing tasks and updating DAG until the goal is reached
    while (!isGoalReached(planDAG, completedTasks)) {
      // console.group("WaggleDanceMachine.run")
      const pendingTasks = toDoNodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (pendingTasks.length === 0) {
        await sleep(1000); // FIXME: observation model instead
        continue;
      }

      const relevantPendingTasks = pendingTasks.filter((task) =>
        !(taskState.firstTaskState === "started" && task.id === taskState.taskId) && !(completedTasks.has(task.id)) && planDAG.edges
          .filter((edge) => edge.tId === task.id)
          .every((edge) => completedTasks.has(edge.sId)),
      );

      if (relevantPendingTasks.length === 0) {
        if (pendingTasks.length === 0 && toDoNodes.length === 0) {
          throw new Error("No pending tasks, and no executable tasks, but goal not reached.")
        }
        console.log("waiting for tasks to complete")
        await sleep(1000);
        // throw new Error("No relevantPendingTasks tasks, but goal not reached.");
      }
      if (relevantPendingTasks.length > 0) {
        log("relevantPendingTasks", relevantPendingTasks.map((task) => task.name))
      }

      const task = relevantPendingTasks.splice(0, 1)[0] // pop first task
      // task && pendingTasks.splice(pendingTasks.indexOf(task), 1) // remove from pending tasks
      task && toDoNodes.splice(toDoNodes.indexOf(task), 1) // remove from toDoNodes
      const executeRequest = {
        ...request,
        task,
        dag: planDAG,
        completedTasks: completedTasks,
        executionMethod,
        taskResults,
      } as ExecuteRequestBody;

      void (async () => {
        const executionResponse = await executeTask(executeRequest, maxConcurrency, isRunning, sendChainPacket, log, abortSignal);
        taskResults = { ...taskResults, ...executionResponse.taskResults };
        for (const taskId of executionResponse.completedTasks) {
          completedTasks.add(taskId);
        }
      })()


      await sleep(1000);
    }

    console.log("WaggleDanceMachine.run: completedTasks", completedTasks)
    console.groupEnd();

    return { results: taskResults, completedTasks };
  }
}