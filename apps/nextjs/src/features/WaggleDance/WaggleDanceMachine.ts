// WaggleDanceMachine.ts

// Every `fetch` API method calls a large language model with different capabilities, tasks, and roles.
// The machine should then start executing actions from the PDDL, and update the DAG accordingly.
// If tasks are not dependent, that state can be parallelized. The aim is to complete the goal as quickly as possible.
// Starts by generating PDDL of the domain and problem, parses it, and updates an execution DAG.
// WaggleDanceMachine.ts

import { TextDecoder } from "util";

import { type ChainPacket, type ModelCreationProps } from "@acme/chain";

import readJSONL from "~/utils/jsonl";
import {
  type BaseRequestBody,
  type ExecuteRequestBody,
} from "~/pages/api/chain/types";
import DAG, { DAGNodeClass, type Cond, type DAGNode } from "./DAG";
import {
  type BaseResultType,
  type BaseWaggleDanceMachine,
  type GraphDataState,
  type PlanResult,
  type WaggleDanceResult,
} from "./types";

function isGoalReached(goal: Cond[], completedTasks: Set<string>): boolean {
  return goal.every((g) => completedTasks.has(g.predicate));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeTasks(
  request: ExecuteRequestBody,
  dag: DAG,
): Promise<{
  completedTasks: string[];
  taskResults: Record<string, BaseResultType>;
}> {
  const { tasks, completedTasks } = request;
  const completedTasksSet = new Set(completedTasks);
  const taskResults: Record<string, BaseResultType> = {};
  const taskQueue = [...tasks];
  const tasksInProgress = new Set<DAGNode>();
  const maxConcurrency = request.creationProps.maxConcurrency ?? 8;

  while (taskQueue.length > 0 || tasksInProgress.size > 0) {
    console.log(`while (taskQueue.length > 0 || tasksInProgress.size > 0)`);
    const isNotFull = () => tasksInProgress.size < maxConcurrency;
    let selectedTask = false;
    while (isNotFull()) {
      console.log("Selecting next task...");
      const task = getNextTask(
        taskQueue,
        completedTasksSet,
        tasksInProgress,
        dag,
      );

      if (task) {
        console.log("Selected task:", task);
        tasksInProgress.add(task);
        taskQueue.splice(taskQueue.indexOf(task), 1);
        selectedTask = true;
      } else {
        console.log("No task selected");
        break;
      }
    }

    if (selectedTask) {
      const executeTaskPromises = Array.from(tasksInProgress).map((task) => {
        console.log(`about to schedule task ${task.id}-${task.name}`);
        return (async () => {
          const edge = dag.edges.find((e) => e.targetId === task.id);

          if (!edge) {
            console.error(`No edge found for task ${task.id}-${task.name}`);
            return;
          }

          console.log(`About to execute task ${task.id}-${task.name}...`);
          const data = { ...request, task };
          const response = await fetch("/api/chain/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });
          const stream = response.body;
          if (!stream) {
            throw new Error(`No stream: ${response.statusText}`);
          }
          const reader = stream.getReader();

          try {
            while (true) {
              console.log(`while (true)`);
              const { done, value } = await reader.read();
              if (done) {
                break;
              }
              const jsonLines = new TextDecoder().decode(value);
              const packets: ChainPacket[] = await readJSONL(jsonLines);

              completedTasksSet.add(task.id);
              taskResults[task.id] = packets; // Assume packets is the result for the task, change based on actual structure
              tasksInProgress.delete(task);
              return packets;
            }
          } catch (error) {
            console.error(error);
          } finally {
            reader.releaseLock();
          }
          return [];
        })();
      });
      await Promise.all(executeTaskPromises);
    }

    await sleep(1000);
  }

  return { completedTasks: Array.from(completedTasksSet), taskResults };
}

function getNextTask(
  taskQueue: DAGNode[],
  completedTasks: Set<string>,
  tasksInProgress: Set<DAGNode>,
  dag: DAG,
): DAGNode | null {
  for (const task of taskQueue) {
    const dependencies = dag.edges
      .filter((edge) => edge.targetId === task.id)
      .map((edge) => edge.sourceId);

    if (
      dependencies.every((dep) => completedTasks.has(dep)) &&
      !tasksInProgress.has(task)
    ) {
      return task;
    }
  }

  return null;
}

async function plan(
  goal: string,
  creationProps: ModelCreationProps,
): Promise<DAG> {
  const data = { goal, creationProps };
  const res = await fetch("/api/chain/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    console.error(`Error fetching plan: ${res.status} ${res.statusText}`);
    throw new Error(`Error fetching plan: ${res.status} ${res.statusText}`);
  }
  const planResult = (await res.json()) as string;
  const json = JSON.parse(planResult) as PlanResult;
  console.log("planResult", planResult, "json", json);
  return json;
}

export default class WaggleDanceMachine implements BaseWaggleDanceMachine {
  async run(
    request: BaseRequestBody,
    [initDAG, setDAG]: GraphDataState,
  ): Promise<WaggleDanceResult | Error> {
    if (initDAG.nodes.length === 0) {
      setDAG(
        new DAG(
          [
            new DAGNodeClass("0", "Your Goal", request.goal, {}),
            new DAGNodeClass(
              "1",
              `PlanBee-${request.creationProps.modelName}`,
              `coming up with an initial plan to divide-and-conquer`,
              { goal: request.goal },
            ),
          ],
          [new DAGEdgeClass("0", "1")],
          [],
          [],
        ),
      );
    }
    const dag = await plan(request.goal, request.creationProps);
    console.log("dag", dag);
    setDAG(dag);
    const completedTasks: Set<string> = new Set();
    let taskResults: Record<string, BaseResultType> = {};
    const maxConcurrency = request.creationProps.maxConcurrency ?? 8;

    while (!isGoalReached(dag.goal, completedTasks)) {
      const pendingTasks = dag.nodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (pendingTasks.length === 0) {
        break;
      }

      const relevantPendingTasks = pendingTasks.filter((task) =>
        dag.edges
          .filter((edge) => edge.targetId === task.id)
          .every((edge) => completedTasks.has(edge.sourceId)),
      );

      const executeRequest = {
        ...request,
        tasks: relevantPendingTasks.slice(0, maxConcurrency),
        completedTasks: Array.from(completedTasks),
        taskResults,
      } as ExecuteRequestBody;

      const executionResponse = await executeTasks(executeRequest, dag);
      taskResults = { ...taskResults, ...executionResponse.taskResults };
      completedTasks.clear();
      for (const taskId of executionResponse.completedTasks) {
        completedTasks.add(taskId);
      }
    }

    return { results: taskResults };
  }
}
