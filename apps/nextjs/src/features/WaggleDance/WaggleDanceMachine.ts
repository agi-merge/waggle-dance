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
import executeTasks, { sleep } from "./utils/executeTasks";
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

export type OptimisticFirstTaskState = {
  firstTaskState: "not started" | "started" | "done"
}

// The main class for the WaggleDanceMachine that coordinates the planning and execution of tasks
export default class WaggleDanceMachine implements BaseWaggleDanceMachine {

  async run(
    request: BaseRequestBody,
    [initDAG, setDAG]: GraphDataState,
    [isDonePlanning, setIsDonePlanning]: IsDonePlanningState,
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode) => void,
    log: (...args: (string | number | object)[]) => void,
    isRunning: boolean,
  ): Promise<WaggleDanceResult | Error> {
    const taskState = { firstTaskState: "not started" as "not started" | "started" | "done" } as OptimisticFirstTaskState;
    let dag: DAG
    let completedTasks: Set<string> = new Set(rootPlanId);
    let taskResults: Record<string, BaseResultType> = {};
    const maxConcurrency = request.creationProps.maxConcurrency ?? 8;

    const startFirstTask = async (task: DAGNode) => {
      taskState.firstTaskState = "started";
      // Call the executeTasks function for the given task and update the states accordingly
      const { completedTasks: newCompletedTasks, taskResults: newTaskResults } = await executeTasks(
        { ...request, tasks: [task], dag, taskResults, completedTasks },
        maxConcurrency,
        isRunning,
        sendChainPacket,
        log
      )
      completedTasks = new Set([...newCompletedTasks, ...completedTasks]);
      taskResults = { ...newTaskResults, ...taskResults };
      taskState.firstTaskState = "done";
      // console.error("Error executing the first task:", error);
    };
    if (initDAG.edges.length > 0 && isDonePlanning) {
      log("skipping planning because it is done - initDAG", initDAG);
      dag = initDAG;
    } else {
      setIsDonePlanning(false);
      const updateTaskState = (state: "not started" | "started" | "done") => {
        taskState.firstTaskState = state;
      };

      dag = await planTasks(request.goal, request.creationProps, initDAG, setDAG, log, sendChainPacket, taskState, updateTaskState, startFirstTask);
      if (dag.nodes[0]) {
        sendChainPacket({ type: "done", nodeId: rootPlanId, value: "🍯 Goal Achieved (GOAL validation in params)" }, dag.nodes[0])
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

    // Continue executing tasks and updating DAG until the goal is reached
    while (!isGoalReached(planDAG, completedTasks)) {
      // console.group("WaggleDanceMachine.run")
      const pendingTasks = dag.nodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (pendingTasks.length === 0) {
        log("No pending tasks, but goal not reached. DAG:", dag);
        await sleep(1000);
        continue;
      }

      const relevantPendingTasks = pendingTasks.filter((task, i) =>
        !(taskState.firstTaskState === "started" && i === 0) && !(completedTasks.has(task.id)) && planDAG.edges
          .filter((edge) => edge.tId === task.id)
          .every((edge) => completedTasks.has(edge.sId)),
      );


      if (relevantPendingTasks.length === 0) {
        log("No relevantPendingTasks tasks, but goal not reached. DAG:", dag);
        await sleep(1000);
        continue;
      }

      log("relevantPendingTasks", relevantPendingTasks.map((task) => task.name))

      const executeRequest = {
        ...request,
        tasks: relevantPendingTasks.slice(0, maxConcurrency),
        dag: planDAG,
        completedTasks: completedTasks,
        taskResults,
      } as ExecuteRequestBody;

      const executionResponse = await executeTasks(executeRequest, maxConcurrency, isRunning, sendChainPacket, log);
      taskResults = { ...taskResults, ...executionResponse.taskResults };
      for (const taskId of executionResponse.completedTasks) {
        completedTasks.add(taskId);
        // queue review task
        const goalNode = planDAG.nodes[planDAG.nodes.length - 1]
        const reviewId = `review-${taskId}`
        setDAG({
          ...planDAG,
          nodes: [...planDAG.nodes, new DAGNodeClass(reviewId, `Review ${dag.nodes.find(n => n.id === taskId)}`, "Review", {})],
          edges: [...planDAG.edges, ...(goalNode ? [new DAGEdgeClass(reviewId, goalNode.id)] : []), new DAGEdgeClass(taskId, reviewId)],
        })
      }
    }

    console.log("WaggleDanceMachine.run: completedTasks", completedTasks)
    console.groupEnd();

    return { results: taskResults, completedTasks };
  }
}