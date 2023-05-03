import Balamb, { BalambError, BalambResult, SeedDef } from "balamb";

import { ModelCreationProps } from "@acme/chain";

import {
  TaskSimulationCallbacks as ChainMachineCallbacks,
  PlanResult,
  Review,
  ReviewResult,
  TaskResult,
} from "./types";

interface BaseWaggleDanceMachine {
  run(
    goal: string,
    creationProps: ModelCreationProps,
    callbacks: ChainMachineCallbacks,
  ): Promise<BalambResult>;
}

/// Talk about mixing metaphors!
/// This implementation uses Balamb to plant seeds, aka, use a DAG to execute dependent tasks.
/// It queries the backend API for results from the underlying AI.
class WaggleDanceMachine implements BaseWaggleDanceMachine {
  async run(
    goal: string,
    creationProps: ModelCreationProps,
    callbacks: ChainMachineCallbacks,
  ) {
    const planId = `plan-${goal}`;
    const taskName = goal;
    // callbacks.onTaskCreated({ id: planId });

    const plan: SeedDef<PlanResult, void> = {
      id: planId,
      description: "Plan tasks to achieve goal",
      plant: async () => {
        const data = {
          creationProps,
          goal,
        };
        const res = await fetch("/api/chain/plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        const tasks = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return { planId: `plan-${taskName}`, tasks: (tasks as string[]) ?? [] };
      },
    };

    const getSubtaskResult = (of: string) => {
      const getSubtaskResult: SeedDef<TaskResult, { planResult: PlanResult }> =
        {
          id: `${of}`,
          description: "Get results of subtasks",
          dependsOn: { planResult: plan },
          plant: async ({ planResult }) => {
            callbacks.onTaskCreated(
              { id: `${of}` },
              { target: planResult.planId, source: `${of}` },
            );
            const result = `${Math.random()}`;
            console.log(`Got result ${result} for ${of}`);
            return { taskId: `${of}`, result } as TaskResult;
          },
        };
      return getSubtaskResult;
    };

    const reviewSubtask = (of: string) => {
      const reviewSubtask: SeedDef<ReviewResult, { taskResult: TaskResult }> = {
        id: `review-${of}`,
        description: "Review a plan and determine if needs cancellation",
        dependsOn: { taskResult: getSubtaskResult(of) },
        plant: async ({ taskResult }) => {
          const review: Review = {
            overall: Math.random(),
          };
          callbacks.onTaskCreated(
            { id: `review-${of}` /*, label: taskResult.result */ },
            { target: `review-${of}`, source: taskResult.taskId },
          );
          if (review.overall < 0.01) {
            throw new Error(`random review failure of target: ${plan.id}`);
          }
          return { target: plan.id, review };
        },
      };
      return reviewSubtask;
    };

    const reviewPlan: SeedDef<ReviewResult, { planResult: PlanResult }> = {
      id: `review-${plan.id}`,
      description: "Review a plan and determine if needs cancellation",
      dependsOn: { planResult: plan },
      plant: async ({ planResult }) => {
        callbacks.onTaskCreated(
          { id: `review-${plan.id}` },
          { target: `review-${plan.id}`, source: plan.id },
        );
        const review: Review = {
          overall: Math.random(),
        };
        console.log(`Reviewed plan ${plan.id} with result ${review.overall}`);
        return { target: plan.id, review };
      },
    };
    const planResult = await Balamb.run([reviewPlan]);
    // [Log] {"info":{"errorCode":"SEED_FAILURES","failures":[{"id":"plan-","error":{}}],"partialResults":{}}}
    const tasks =
      planResult.results && (planResult.results[planId].tasks as string[]);
    if (planResult) console.log(JSON.stringify(planResult));
    const seeds: SeedDef<any, any>[] = tasks.map((tasks) => {
      return reviewSubtask(tasks);
    });
    seeds.unshift(reviewPlan);
    try {
      const taskResult = await Balamb.run(seeds);
      if (taskResult instanceof BalambError) {
        console.error(taskResult);
        callbacks.onReviewFailure(taskName, taskResult);
      } else {
        console.log(JSON.stringify(taskResult));
        return taskResult;
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
        callbacks.onReviewFailure(taskName, error);
      }
    }
    throw new Error("Task simulation failed");
  }

  generateTaskName(): string {
    return `${Math.floor(Math.random() * 10000)}`;
  }

  // async run(callbacks: ChainMachineCallbacks) {
  //   return await this.runTaskWithReview(
  //     `GOAL-${this.generateTaskName()}`,
  //     callbacks,
  //   );
  // }
}

export default WaggleDanceMachine;
