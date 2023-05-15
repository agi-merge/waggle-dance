import { type ModelCreationProps } from "@acme/chain";

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

async function executeTasks(
  tasks: DAGNode[],
  completedTasks: Set<string>,
  taskResults: Record<string, BaseResultType>,
): Promise<void> {
  const promises = tasks.map(async (task) => {
    const result = await fetch("/api/chain/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });

    if (!result.ok) {
      throw new Error(
        "Error in execution of task: ${res.status} ${res.statusText}",
      );
    }

    taskResults[task.id] = (await result.json()) as BaseResultType;
    completedTasks.add(task.id);
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
    domain: JSON.parse(domain) as PDDLDomain,
    problem: JSON.parse(problem) as PDDLProblem,
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
  async run(
    goal: string,
    creationProps: ModelCreationProps,
    _callbacks: ChainMachineCallbacks,
  ): Promise<WaggleDanceResult | Error> {
    const dag = await plan(goal, creationProps);
    console.log(`DAG: ${JSON.stringify(dag)}`);
    const executionQueue: DAGNode[] = dag
      .getNodes()
      .filter((node) =>
        dag.getEdges().every((edge) => edge.target !== node.id),
      );

    const completedTasks: Set<string> = new Set();
    const taskResults: Record<string, BaseResultType> = {};

    console.log("executionQueue", JSON.stringify(executionQueue));
    console.log("completedTasks", JSON.stringify(completedTasks));
    console.log("taskResults", JSON.stringify(taskResults));
    await executeTasks(executionQueue, completedTasks, taskResults);

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

      await executeTasks([nextTask], completedTasks, taskResults);
    }

    return { results: taskResults };
  }
}
