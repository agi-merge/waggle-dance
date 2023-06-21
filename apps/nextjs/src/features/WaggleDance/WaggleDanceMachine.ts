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
import executeTask, { sleep } from "./utils/executeTask";
import planTasks from "./utils/planTasks"
import { type ChainPacket } from "@acme/chain";

// Check if every node is included in the completedTasks set
function isGoalReached(dag: DAG, completedTasks: Set<string>): boolean {
  return dag.nodes.every((node) => completedTasks.has(node.id));
}
export const initialCond = { predicate: "", context: {} }
export const rootPlanId = `👸🐝`
export const initialNodes = (goal: string, _modelName: string) => [
  new DAGNodeClass(
    rootPlanId,
    `👸🐝 Queen Bee`,
    `Planning how to achieve your goal`,
    goal,
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
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode | DAGNodeClass) => void,
    log: (...args: (string | number | object)[]) => void,
    executionMethod: string,
    isRunning: boolean,
    abortSignal: AbortSignal,
  ): Promise<WaggleDanceResult | Error> {
    const reviewPrefix = `criticize-`
    const optimisticFirstTaskState = { firstTaskState: "not started" as "not started" | "started" | "done" | "error" } as OptimisticFirstTaskState;

    let dag: DAG
    const completedTasks: Set<string> = new Set([rootPlanId]);
    const taskResults: Record<string, BaseResultType> = {};
    const maxConcurrency = request.creationProps.maxConcurrency ?? 4;

    const startFirstTask = async (task: DAGNode | DAGNodeClass, dag: DAG) => {
      log("speed optimization: we are able to execute the first task while still planning.")
      optimisticFirstTaskState.firstTaskState = "started";
      optimisticFirstTaskState.taskId = task.id
      completedTasks.add(task.id); // calling this pre-emptively allows our logic for regular tasks to remain simple.
      // Call the executeTasks function for the given task and update the states accordingly
      if (!abortSignal.aborted) {
        const result = await executeTask(
          { ...request, task, dag, taskResults, completedTasks, reviewPrefix, executionMethod },
          maxConcurrency,
          isRunning,
          sendChainPacket,
          log,
          abortSignal,
        )
        taskResults[task.id] = result;
        const node = dag.nodes.find(n => task.id === n.id)
        if (!node) {
          optimisticFirstTaskState.firstTaskState = "error";
          throw new Error("no node to sendChainPacket")
        } else {
          if (!result) {
            sendChainPacket({ type: "error", severity: "warn", message: "no task result" }, node)
            optimisticFirstTaskState.firstTaskState = "error";
            return;
          } else {
            debugger
            sendChainPacket({ type: "done", value: String(result) }, node)
          }
        }
        log("taskResults", taskResults);
        optimisticFirstTaskState.firstTaskState = "done";
      } else {
        console.warn("aborted startFirstTask")
        optimisticFirstTaskState.firstTaskState = "error";
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
        optimisticFirstTaskState.firstTaskState = state;
      };

      dag = await planTasks(request.goal, request.goalId, request.creationProps, initDAG, setDAG, log, sendChainPacket, optimisticFirstTaskState, abortSignal, updateTaskState, startFirstTask);
      const hookupEdges = findNodesWithNoIncomingEdges(dag).map((node) => new DAGEdgeClass(rootPlanId, node.id))
      dag = new DAG(
        [...initialNodes(request.goal, request.creationProps.modelName), ...dag.nodes],
        // connect our initial nodes to the DAG: gotta find them and create edges
        [...initialEdges(), ...dag.edges ?? [], ...hookupEdges],
      );
      if (dag && dag.nodes) {
        const rootNode = dag.nodes.find(n => n.id === rootPlanId)
        if (!rootNode) {
          throw new Error("no root node")
        }
        sendChainPacket({ type: "done", value: "Planned an execution graph." }, rootNode)
      } else {
        log("no nodes in dag")
        throw new Error("no nodes in dag")
      }

      setIsDonePlanning(true);
      log("done planning");
    }
    // prepend our initial nodes to the DAG

    const toDoNodes = Array.from(dag.nodes)
    // Continue executing tasks and updating DAG until the goal is reached
    while (!isGoalReached(dag, completedTasks)) {
      if (abortSignal.aborted) throw new Error("Signal aborted");

      // console.group("WaggleDanceMachine.run")
      const pendingTasks = toDoNodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (pendingTasks.length === 0 || optimisticFirstTaskState.firstTaskState === "started") {
        await sleep(1000); // FIXME: observation model instead
        continue;
      }

      const pendingCurrentDagLayerTasks = pendingTasks.filter((task) =>
        dag.edges.filter((edge) => edge.tId === task.id).every((edge) => completedTasks.has(edge.sId)),
      );

      if (pendingCurrentDagLayerTasks.length === 0) {
        if (pendingTasks.length === 0 && toDoNodes.length === 0) {
          throw new Error("No pending tasks, and no executable tasks, but goal not reached.")
        }
      }
      if (pendingCurrentDagLayerTasks.length > 0) {
        log("relevantPendingTasks", pendingCurrentDagLayerTasks.map((task) => task.name))
      }

      const task = pendingCurrentDagLayerTasks.splice(0, 1)[0] // pop first task
      if (!task) {
        throw new Error("no task")
      }
      // task && pendingTasks.splice(pendingTasks.indexOf(task), 1) // remove from pending tasks
      toDoNodes.splice(toDoNodes.indexOf(task), 1) // remove from toDoNodes
      const executeRequest = {
        ...request,
        task,
        dag,
        completedTasks: completedTasks,
        executionMethod,
        taskResults,
      } as ExecuteRequestBody;

      void (async () => {
        const exeResult = await executeTask(executeRequest, maxConcurrency, isRunning, sendChainPacket, log, abortSignal);
        taskResults[executeRequest.task.id] = exeResult;
        completedTasks.add(executeRequest.task.id);
      })()
    }

    console.log("WaggleDanceMachine.run: completedTasks", completedTasks)
    console.groupEnd();

    return { results: taskResults, completedTasks };
  }
}