// WaggleDanceMachine.ts

import { jsonrepair } from "jsonrepair";

import { type ChainPacket, type ModelCreationProps } from "@acme/chain";

import readJSONL from "~/utils/jsonl";
import {
  type BaseRequestBody,
  type ExecuteRequestBody,
} from "~/pages/api/chain/types";
import type DAG from "./DAG";
import { type DAGNode, type GoalCond } from "./DAG";
import {
  type BaseResultType,
  type BaseWaggleDanceMachine,
  type PDDLDomain,
  type PDDLProblem,
  type PlanResult,
  type ProcessedPlanResult,
  type WaggleDanceResult,
} from "./types";
import { planAndDomainToDAG } from "./utils/conversions";

function isGoalReached(goal: GoalCond[], completedTasks: Set<string>): boolean {
  return goal.every((g) => completedTasks.has(g.predicate));
}

async function executeTasks(request: ExecuteRequestBody): Promise<{
  completedTasks: string[];
  taskResults: Record<string, BaseResultType>;
}> {
  const { tasks, completedTasks } = request;
  const completedTasksSet = new Set(completedTasks);
  const taskResults: Record<string, BaseResultType> = {};
  const promises = tasks.map(async (task) => {
    const response = await fetch("/api/chain/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const stream = response.body;
    if (!stream) {
      throw new Error(`No stream: ${response.statusText}`);
    }
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const jsonLines = new TextDecoder().decode(value);
        const packets: ChainPacket[] = await readJSONL(jsonLines);

        completedTasksSet.add(task.id);
        taskResults[task.id] = packets; // Assume packets is the result for the task, change based on actual structure
        return packets;
      }
    } catch (error) {
      console.error(error);
    } finally {
      reader.releaseLock();
    }
  });

  await Promise.all(promises);
  request.completedTasks = Array.from(completedTasksSet);

  return { completedTasks: request.completedTasks, taskResults };
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
    throw new Error(`Error fetching plan: ${res.status} ${res.statusText}`);
  }

  const { domain, problem } = (await res.json()) as PlanResult;
  console.log("planResult domain", domain, "problem", problem);
  const processed = {
    domain: JSON.parse(jsonrepair(domain)) as PDDLDomain,
    problem: JSON.parse(jsonrepair(problem)) as PDDLProblem,
  } as ProcessedPlanResult;
  console.log("processed", processed);
  const dag = planAndDomainToDAG(processed.domain, processed.problem);
  console.log("dag", dag);
  return dag;
}

function getNextTask(
  pendingTasks: DAGNode[],
  completedTasks: Set<string>,
  dag: DAG,
): DAGNode | null {
  for (const task of pendingTasks) {
    const dependencies = dag
      .getEdges()
      .filter((edge) => edge.target === task.id)
      .map((edge) => edge.source);

    if (dependencies.every((dep) => completedTasks.has(dep))) {
      return task;
    }
  }

  return null;
}

export default class WaggleDanceMachine implements BaseWaggleDanceMachine {
  async run(request: BaseRequestBody): Promise<WaggleDanceResult | Error> {
    const dag = await plan(request.goal, request.creationProps);
    console.log(`DAG: ${JSON.stringify(dag)}`);
    const executionQueue: DAGNode[] = dag
      .getNodes()
      .filter((node) =>
        dag.getEdges().every((edge) => edge.target !== node.id),
      );

    const completedTasks: Set<string> = new Set();
    let taskResults: Record<string, BaseResultType> = {};

    console.log("executionQueue", executionQueue);
    console.log("completedTasks", completedTasks);
    console.log("taskResults", taskResults);
    const executeRequest = {
      ...request,
      tasks: executionQueue,
      completedTasks: [...completedTasks],
      taskResults,
    } as ExecuteRequestBody;

    const executionResponse = await executeTasks(executeRequest);
    taskResults = { ...taskResults, ...executionResponse.taskResults };

    while (!isGoalReached(dag.getGoalConditions(), completedTasks)) {
      const pendingTasks = dag
        .getNodes()
        .filter((node) => !completedTasks.has(node.id));
      if (pendingTasks.length === 0) {
        break;
      }

      const nextTask = getNextTask(pendingTasks, completedTasks, dag);
      if (!nextTask) {
        throw new Error("No task to execute, goal is unreachable");
      }
      const { goal, creationProps } = request;
      const executionRequest = {
        goal,
        creationProps,
        tasks: [nextTask],
        completedTasks: [...completedTasks],
        taskResults,
      } as ExecuteRequestBody;

      await executeTasks(executionRequest);
    }

    return { results: taskResults };
  }
}
