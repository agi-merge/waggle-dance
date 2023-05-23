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
  type ChainPacketsState,
} from "./types";

// Check if every node is included in the completedTasks set
function isGoalReached(dag: DAG, completedTasks: Set<string>): boolean {
  return dag.nodes.every((node) => completedTasks.has(node.id));
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

const planId = "👸"
export const initialCond = { predicate: "", params: {} }
export const initialNodes = (goal: string, _modelName: string) => [
  new DAGNodeClass(
    planId,
    `👸🐝 Queen Bee`,
    `Planning how to achieve your goal`,
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
  _isRunning: boolean,
  [chainPackets, setChainPackets]: ChainPacketsState,
  log: (...args: (string | number | object)[]) => void
): Promise<{
  completedTasks: Set<string>;
  taskResults: Record<string, BaseResultType>;
}> {
  // Destructure tasks and completedTasks from the request object
  const { dags, tasks, completedTasks, taskResults } = request;

  // Create a Set of completed tasks
  const completedTasksSet = new Set(completedTasks);
  // Create a task queue to store the tasks
  const taskQueue: ScheduledTask[] = tasks.map((t) => ({ ...t, isScheduled: false }));

  // Keep looping while there are tasks in the task queue
  while (taskQueue.length > 0) {
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

    log("Task queue:", taskQueue);

    // Execute the valid pairs of {task, dag} concurrently, storing the execution request promises in executeTaskPromises array
    const executeTaskPromises = validPairs.map(async ({ task, dag }) => {
      // remove task from taskQueue
      const scheduledTask = taskQueue.findIndex((scheduledTask) => { scheduledTask.id == task.id })
      taskQueue.splice(scheduledTask, 1)

      log(`About to execute task ${task.id} -${task.name}...`);

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
        throw new Error(`No stream: ${response.statusText} `);
      } else {
        log(`Task ${task.id} -${task.name} stream began!`);
      }

      // Read the stream data and process based on response
      const reader = stream.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            log("Stream complete");
            // Decode response data

            log(`About to decode response data for task ${task.id} -${task.name}:`);

            // Process response data and store packets in completedTasksSet and taskResults
            const packets: ChainPacket[] = readJSONL(buffer);

            completedTasksSet.add(task.id);
            taskResults[task.id] = packets;
            return packets;
          } else if (value.length) {
            const jsonLines = decodeText(value);
            buffer += jsonLines;
            try {
              const packet: ChainPacket = JSON.parse(jsonLines);
              if (packet) {
                completedTasksSet.add(task.id);
                taskResults[task.id] = packet;
                setChainPackets([...chainPackets, packet]); // Call setChainPackets after each streamed packet
              }
            } catch {
              // normal, do nothing
            }
          }
        }
      } catch (error) {
        let errMessage: string
        if (error instanceof Error) {
          errMessage = error.message
        } else {
          errMessage = JSON.stringify(error)
        }
        console.error(`Error while reading the stream or processing the response data for task ${task.id} -${task.name}: ${errMessage}`);
      } finally {
        reader.releaseLock();
      }
    });

    // Wait for all task promises to settle and sleep for 1 second before looping again
    await Promise.all(executeTaskPromises);
    await sleep(1000);
  }

  // Return completed tasks and task results
  return { completedTasks: completedTasksSet, taskResults };
}

// Request the execution plan (DAG) from the API
async function plan(
  goal: string,
  creationProps: ModelCreationProps,
  dag: DAG,
  setDAG: (dag: DAG) => void,
  log: (...args: (string | number | object)[]) => void
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
    throw new Error(`No stream: ${res.statusText} `);
  } else {
    log(`Planned!`);
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
            const diffNodesCount = partialDAG.nodes.length - dag.nodes.length
            const newEdgesCount = partialDAG.edges.length - dag.edges.length
            if (diffNodesCount || newEdgesCount) {
              if (newEdgesCount) {
                log("newEdgesCount", newEdgesCount)
              } else {
                log("diffNodesCount", diffNodesCount)
              }
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

  log("dagYamlString", dagYamlString);
  try {
    const dag = parse(dagYamlString) as unknown;
    log("dag", JSON.stringify(dag))
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
    [chainPackets, setChainPackets]: ChainPacketsState,
    log: (...args: (string | number | object)[]) => void,
    isRunning: boolean,
  ): Promise<WaggleDanceResult | Error> {
    let dag: DAG
    if (initDAG.edges.length > 1) {
      log("skipping planning because it is done - initDAG", initDAG);
      dag = initDAG;
    } else {
      setIsDonePlanning(false);
      dag = await plan(request.goal, request.creationProps, initDAG, setDAG, log);
      setIsDonePlanning(true);
      log("dag", dag);
    }
    // prepend our initial nodes to the DAG
    const planDAG = new DAG(
      [...initialNodes(request.goal, request.creationProps.modelName), ...dag.nodes],
      // connect our initial nodes to the DAG: gotta find them and create edges
      [...initialEdges(), ...dag.edges, ...findNodesWithNoIncomingEdges(dag).map((node) => new DAGEdgeClass(planId, node.id))],
    )
    setDAG(planDAG);
    const completedTasks: Set<string> = new Set(planId);
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

      const executionResponse = await executeTasks(executeRequest, maxConcurrency, isRunning, [chainPackets, setChainPackets], log);
      taskResults = { ...taskResults, ...executionResponse.taskResults };
      completedTasks.clear();
      for (const taskId of executionResponse.completedTasks) {
        completedTasks.add(taskId);
      }
    }

    return { results: taskResults, completedTasks };
  }
}