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
  type BaseWaggleDanceMachine,
  type GraphDataState,
  type WaggleDanceResult,
  type IsDonePlanningState,
} from "./types";
import executeTasks from "./utils/executeTasks";
import planTasks from "./utils/planTasks"
import { type ChainPacket } from "@acme/chain";

// Check if every node is included in the completedTasks set
function isGoalReached(dag: DAG, completedTasks: Set<string>): boolean {
  return dag.nodes.every((node) => completedTasks.has(node.id));
}
export const rootPlanId = "👸"
export const initialCond = { predicate: "", params: {} }
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

// The main class for the WaggleDanceMachine that coordinates the planning and execution of tasks
export default class WaggleDanceMachine implements BaseWaggleDanceMachine {
  async run(
    request: BaseRequestBody,
    [initDAG, setDAG]: GraphDataState,
    [_isDonePlanning, setIsDonePlanning]: IsDonePlanningState,
    sendChainPacket: (chainPacket: ChainPacket) => void,
    log: (...args: (string | number | object)[]) => void,
    isRunning: boolean,
  ): Promise<WaggleDanceResult | Error> {

    let dag: DAG
    if (initDAG.edges.length > 1) {
      log("skipping planning because it is done - initDAG", initDAG);
      dag = initDAG;
    } else {
      setIsDonePlanning(false);
      dag = await planTasks(request.goal, request.creationProps, initDAG, setDAG, log);
      setIsDonePlanning(true);
      log("dag", dag);
    }
    // prepend our initial nodes to the DAG
    const planDAG = new DAG(
      [...initialNodes(request.goal, request.creationProps.modelName), ...dag.nodes],
      // connect our initial nodes to the DAG: gotta find them and create edges
      [...initialEdges(), ...dag.edges, ...findNodesWithNoIncomingEdges(dag).map((node) => new DAGEdgeClass(rootPlanId, node.id))],
    )
    setDAG(planDAG);
    const completedTasks: Set<string> = new Set(rootPlanId);
    let taskResults: Record<string, BaseResultType> = {};
    const maxConcurrency = request.creationProps.maxConcurrency ?? 8;

    // Continue executing tasks and updating DAG until the goal is reached
    while (!isGoalReached(planDAG, completedTasks)) {
      console.group("WaggleDanceMachine.run")
      const pendingTasks = dag.nodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (pendingTasks.length === 0) {
        log("No pending tasks, but goal not reached. DAG:", dag);
        break;
      }

      const relevantPendingTasks = pendingTasks.filter((task) =>
        dag.edges
          .filter((edge) => edge.tId === task.id)
          .every((edge) => completedTasks.has(edge.sId)),
      );

      log("relevantPendingTasks", relevantPendingTasks.map((task) => task.name))

      const executeRequest = {
        ...request,
        tasks: relevantPendingTasks.slice(0, maxConcurrency),
        dags: relevantPendingTasks.map(() => dag), // copy current dag to each subtask
        completedTasks: Array.from(completedTasks),
        taskResults,
      } as ExecuteRequestBody;

      const executionResponse = await executeTasks(executeRequest, maxConcurrency, isRunning, sendChainPacket, log);
      taskResults = { ...taskResults, ...executionResponse.taskResults };
      completedTasks.clear();
      for (const taskId of executionResponse.completedTasks) {
        completedTasks.add(taskId);
      }
    }

    console.log("WaggleDanceMachine.run: completedTasks", completedTasks)
    console.groupEnd();

    return { results: taskResults, completedTasks };
  }
}