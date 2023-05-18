// WaggleDanceMachine.ts

// INTENDED BEHAVIOR:
// This machine is intended to plan and execute tasks concurrently, ensuring goal completion as quickly as possible.
// It starts by generating an execution DAG and then executes the tasks concurrently.
// When a task completes, a new dependent review task should be added to the DAG to ensure quality results.

import { type ChainPacket, type ModelCreationProps } from "@acme/chain";

import readJSONL from "~/utils/jsonl";
import {
  type BaseRequestBody,
  type ExecuteRequestBody,
} from "~/pages/api/chain/types";
import DAG, { DAGNodeClass, DAGEdgeClass, type Cond, type DAGNode } from "./DAG";
import {
  type BaseResultType,
  type BaseWaggleDanceMachine,
  type GraphDataState,
  type PlanResult,
  type WaggleDanceResult,
} from "./types";

function isGoalReached(goal: Cond, completedTasks: Set<string>): boolean {
  return completedTasks.has(goal.predicate);
}

// A utility function to wait for a specified amount of time (ms)
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeText(data: Uint8Array) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(data);
  } else {
    return String.fromCharCode.apply(null, Array.from(data));
  }
}

// The executeTasks function takes in a request and a DAG, then runs tasks concurrently,
// and updates the completed tasks and task results accordingly.
async function executeTasks(
  request: ExecuteRequestBody,
): Promise<{
  completedTasks: string[];
  taskResults: Record<string, BaseResultType>;
}> {
  // Destructure tasks and completedTasks from the request object
  const { dags, tasks, completedTasks, taskResults } = request;

  // Create a Set of completed tasks
  const completedTasksSet = new Set(completedTasks);
  // Create a task queue to store the tasks
  const taskQueue = [...tasks];

  // Keep looping while there are tasks in the task queue
  while (taskQueue.length > 0) {
    // Gather the valid pairs of {task, dag} c from the task queue based on the completed tasks and the DAG edges
    const validPairs = taskQueue.reduce((acc: Array<{ task: DAGNode; dag: DAG }>, task, idx) => {
      const dag = dags[idx];
      if (!dag) {
        return acc;
      }

      const isValid = dag.edges.filter((edge) => edge.targetId === task.id)
        .every((edge) => completedTasksSet.has(edge.sourceId));

      if (isValid) {
        acc.push({ task, dag });
      }

      return acc;
    }, []);

    // Execute the valid pairs of {task, dag} concurrently, storing the execution request promises in executeTaskPromises array
    const executeTaskPromises = validPairs.map(async ({ task, dag }) => {
      console.log(`About to schedule task ${task.id} -${task.name} `);
      taskQueue.splice(taskQueue.indexOf(task), 1);

      console.log(`About to execute task ${task.id} -${task.name}...`);

      // Execute each task by making an API request
      const data = { ...request, task, dag };
      const response = await fetch("/api/chain/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // Get the response body as a stream
      const stream = response.body;
      if (!response.ok || !stream) {
        debugger;
        throw new Error(`No stream: ${response.statusText} `);
      } else {
        console.log(`Task ${task.id} -${task.name} executed!`);
      }

      // Read the stream data and process based on response
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          // Decode response data
          const jsonLines = decodeText(value);

          // Process response data and store packets in completedTasksSet and taskResults
          const packets: ChainPacket[] = await readJSONL(jsonLines);
          completedTasksSet.add(task.id);
          taskResults[task.id] = packets;
          return packets;
        }
      } catch (error) {
        console.error(error);
        debugger;
      } finally {
        reader.releaseLock();
      }
    });

    // Wait for all task promises to settle and sleep for 1 second before looping again
    await Promise.allSettled(executeTaskPromises);
    await sleep(1000);
  }

  // Return completed tasks and task results
  return { completedTasks: Array.from(completedTasksSet), taskResults };
}

// Request the execution plan (DAG) from the API
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

// The main class for the WaggleDanceMachine that coordinates the planning and execution of tasks
export default class WaggleDanceMachine implements BaseWaggleDanceMachine {
  async run(
    request: BaseRequestBody,
    [initDAG, setDAG]: GraphDataState,
  ): Promise<WaggleDanceResult | Error> {
    if (initDAG.nodes.length === 0) {
      setDAG(
        new DAG(
          [
            new DAGNodeClass("1", "Human", `Set Goal`, { goal: request.goal }),
            new DAGNodeClass(
              "2",
              `PlanBee-${request.creationProps.modelName}`,
              `coming up with an initial plan to divide-and-conquer`,
              { goal: request.goal },
            ),
          ],
          [new DAGEdgeClass("1", "2")],
          { predicate: "", params: {} },
          { predicate: "", params: {} },
        ),
      );
    }

    const dag = await plan(request.goal, request.creationProps);
    console.log("dag", dag);
    setDAG(dag);
    const completedTasks: Set<string> = new Set();
    let taskResults: Record<string, BaseResultType> = {};
    const maxConcurrency = request.creationProps.maxConcurrency ?? 8;

    // Continue executing tasks and updating DAG until the goal is reached
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

      const executionResponse = await executeTasks(executeRequest);
      taskResults = { ...taskResults, ...executionResponse.taskResults };
      completedTasks.clear();
      for (const taskId of executionResponse.completedTasks) {
        completedTasks.add(taskId);
      }
    }

    return { results: taskResults };
  }
}