import { jsonrepair } from "jsonrepair";

import { type ModelCreationProps } from "@acme/chain";

import stream from "~/utils/stream";
import {
  type BaseRequestBody,
  type ExecuteRequestBody,
  type StrategyRequestBody,
} from "~/pages/api/chain/types";
import type DAG from "./DAG";
import { type DAGNode, type GoalCond } from "./DAG";
import {
  type BaseResultType,
  type BaseWaggleDanceMachine,
  type TaskSimulationCallbacks as ChainMachineCallbacks,
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

async function executeTasks(request: ExecuteRequestBody): Promise<void> {
  const { tasks, taskResults, completedTasks } = request;
  const promises = tasks.map(async (task) => {
    await stream(
      "/api/chain/execute",
      request,
      (message) => {
        if (message.type === "execute") {
          taskResults[task.id] = JSON.parse(message.value) as BaseResultType;
          completedTasks.push(task.id);
        }
      },
      (error) => {
        console.error(error);
      },
    );
  });

  await Promise.all(promises);
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
    const taskResults: Record<string, BaseResultType> = {};

    console.log("executionQueue", executionQueue);
    console.log("completedTasks", completedTasks);
    console.log("taskResults", taskResults);
    const executeRequest = {
      ...request,
      tasks: executionQueue,
      completedTasks: [...completedTasks],
      taskResults,
    } as ExecuteRequestBody;
    await executeTasks(executeRequest);

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
