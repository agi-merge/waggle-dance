// WaggleDanceMachine.ts

// INTENDED BEHAVIOR:
// This machine is intended to plan and execute tasks concurrently, ensuring goal completion as quickly as possible.
// It starts by generating an execution DAG and then executes the tasks concurrently.
// When a task completes, a new dependent review task should be added to the DAG to ensure quality results.
import { parse } from 'yaml';

import { type ChainPacket, type ModelCreationProps } from "@acme/chain";

import readJSONL from "~/utils/jsonl";
import {
  type BaseRequestBody,
  type ExecuteRequestBody,
} from "~/pages/api/chain/types";
import DAG, { DAGNodeClass, DAGEdgeClass, type DAGNode, type OptionalDAG } from "./DAG";
import {
  type ScheduledTask,
  type BaseResultType,
  type BaseWaggleDanceMachine,
  type GraphDataState,
  type WaggleDanceResult,
  type IsDonePlanningState,
} from "./types";

function isGoalReached(_goal: string, _completedTasks: Set<string>): boolean {
  return false;
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

const planId = "👑"
export const initialCond = { predicate: "", params: {} }
export const initialNodes = (goal: string, modelName: string) => [
  new DAGNodeClass(
    planId,
    `👑🐝-${modelName}`,
    `coming up with an initial plan to divide-and-conquer`,
    { goal },
  ),
]
export const initialEdges = () => []

function findNodesWithNoIncomingEdges(dag: DAG | OptionalDAG): DAGNode[] {
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

// The executeTasks function takes in a request and a DAG, then runs tasks concurrently,
// and updates the completed tasks and task results accordingly.
async function executeTasks(
  request: ExecuteRequestBody,
  maxConcurrency: number,
  isRunning: boolean
): Promise<{
  completedTasks: string[];
  taskResults: Record<string, BaseResultType>;
}> {
  // Destructure tasks and completedTasks from the request object
  const { dags, tasks, completedTasks, taskResults } = request;

  // Create a Set of completed tasks
  const completedTasksSet = new Set(completedTasks);
  // Create a task queue to store the tasks
  const taskQueue: ScheduledTask[] = tasks.map((t) => ({ ...t, isScheduled: false }));

  // Keep looping while there are tasks in the task queue
  while (isRunning && taskQueue.length > 0) {
    // Gather the valid pairs of {task, dag} c from the task queue based on the completed tasks and the DAG edges
    const validPairs = taskQueue.reduce((acc: Array<{ task: DAGNode; dag: DAG }>, task, idx) => {
      const dag = dags[idx];
      if (!dag || task.isScheduled) {
        return acc;
      }

      const isValid = dag.edges.filter((edge) => edge.tId === task.id)
        .every((edge) => completedTasksSet.has(edge.sId));

      if (isValid) {
        task.isScheduled = true
        acc.push({ task, dag });
      }

      return acc;
    }, []);
    if (validPairs.length >= maxConcurrency) {
      break;
    }

    // Execute the valid pairs of {task, dag} concurrently, storing the execution request promises in executeTaskPromises array
    const executeTaskPromises = validPairs.map(async ({ task, dag }) => {
      console.log(`About to schedule task ${task.id} -${task.name} `);
      taskQueue.splice(taskQueue.findIndex((scheduledTask) => { scheduledTask.id == task.id }), 1)

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
        while (isRunning && true) {
          console.log("about to read:")
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream complete");
            break;
          }

          // Decode response data

          console.log(`About to decode response data for task ${task.id} -${task.name}:`);
          const jsonLines = decodeText(value);
          console.log(`Decoded response data for task ${task.id} -${task.name}:`, jsonLines);

          // Process response data and store packets in completedTasksSet and taskResults
          const packets: ChainPacket[] = await readJSONL(jsonLines);
          completedTasksSet.add(task.id);
          taskResults[task.id] = packets;
          return packets;
        }
      } catch (error) {
        let errMessage: string
        if (error instanceof Error) {
          errMessage = error.message
        } else {
          errMessage = JSON.stringify(error)
        }
        console.error(`Error while reading the stream or processing the response data for task ${task.id} -${task.name}: ${errMessage}`);
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
  dag: DAG,
  setDAG: (dag: DAG) => void
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
  // Get the response body as a stream
  const stream = res.body;
  if (!stream) {
    debugger;
    throw new Error(`No stream: ${res.statusText} `);
  } else {
    console.log(`Planned!`);
  }
  async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
    let chunks = "" as string;
    const reader = stream.getReader();

    let result;
    while ((result = await reader.read()) && !result.done) {
      const chunk = new TextDecoder().decode(result.value);
      chunks += chunk;
      try {
        const yaml = parse(chunks) as unknown;
        if (yaml && yaml as OptionalDAG) {
          const optDag = yaml as OptionalDAG
          const validNodes = optDag.nodes?.filter((n) => n.name.length > 0 && n.act.length > 0 && n.id.length > 0 && n.params);
          const validEdges = optDag.edges?.filter((n) => n.sId.length > 0 && n.tId.length > 0);
          if (validNodes) {
            const hookupEdges = findNodesWithNoIncomingEdges(optDag).map((node) => new DAGEdgeClass(planId, node.id))
            const partialDAG = new DAG(
              [...initialNodes(goal, creationProps.modelName), ...validNodes],
              // connect our initial nodes to the DAG: gotta find them and create edges
              [...initialEdges(), ...validEdges ?? [], ...hookupEdges],
              // optDag?.init ?? initialCond,
              // optDag?.goal ?? initialCond,
            );
            if (partialDAG.nodes.length > partialDAG.nodes.length || partialDAG.edges.length > dag.edges.length) {
              setDAG(partialDAG)
            }
          }
        }
      } catch {
        // normal, do nothing
      }
    }

    return chunks;
  }

  // Convert the ReadableStream<Uint8Array> to a string
  const dagYamlString = await streamToString(stream);

  console.log("dagYamlString", dagYamlString);
  try {
    const dag = parse(dagYamlString) as unknown;
    console.log("dag", JSON.stringify(dag))
    // TODO: if this fails, spin up a ConstitutionChain w/ return type reinforcement
    return dag as DAG;
  } catch (error) {
    console.error(error);
    throw new Error(`Error parsing DAG: ${error}`);
  }
  // }
  // const planResult = (await res.json()) as string;
  // const json = JSON.parse(planResult) as PlanResult;
  // return json;
}

// The main class for the WaggleDanceMachine that coordinates the planning and execution of tasks
export default class WaggleDanceMachine implements BaseWaggleDanceMachine {
  async run(
    request: BaseRequestBody,
    [initDAG, setDAG]: GraphDataState,
    [_isDonePlanning, setIsDonePlanning]: IsDonePlanningState,
    isRunning: boolean,
  ): Promise<WaggleDanceResult | Error> {
    setIsDonePlanning(false);
    const dag = await plan(request.goal, request.creationProps, initDAG, setDAG);
    setIsDonePlanning(true);
    console.log("dag", dag);
    // prepend our initial nodes to the DAG
    setDAG(new DAG(
      [...initialNodes(request.goal, request.creationProps.modelName), ...dag.nodes],
      // connect our initial nodes to the DAG: gotta find them and create edges
      [...initialEdges(), ...dag.edges, ...findNodesWithNoIncomingEdges(dag).map((node) => new DAGEdgeClass(planId, node.id))],
    ));
    const completedTasks: Set<string> = new Set();
    let taskResults: Record<string, BaseResultType> = {};
    const maxConcurrency = request.creationProps.maxConcurrency ?? 8;

    // Continue executing tasks and updating DAG until the goal is reached
    while (isRunning && !isGoalReached(request.goal, completedTasks)) {
      const pendingTasks = dag.nodes.filter(
        (node) => !completedTasks.has(node.id),
      );

      if (pendingTasks.length === 0) {
        break;
      }

      const relevantPendingTasks = pendingTasks.filter((task) =>
        dag.edges
          .filter((edge) => edge.tId === task.id)
          .every((edge) => completedTasks.has(edge.sId)),
      );

      const executeRequest = {
        ...request,
        tasks: relevantPendingTasks.slice(0, maxConcurrency),
        dags: relevantPendingTasks.map(() => dag), // copy current dag to each subtask
        completedTasks: Array.from(completedTasks),
        taskResults,
      } as ExecuteRequestBody;

      const executionResponse = await executeTasks(executeRequest, maxConcurrency, isRunning);
      taskResults = { ...taskResults, ...executionResponse.taskResults };
      completedTasks.clear();
      for (const taskId of executionResponse.completedTasks) {
        completedTasks.add(taskId);
      }
    }

    return { results: taskResults };
  }
}