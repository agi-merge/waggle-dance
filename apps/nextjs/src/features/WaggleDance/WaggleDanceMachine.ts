import Balamb, { BalambError, type BalambResult, type SeedDef } from "balamb";

import { type ModelCreationProps } from "@acme/chain";
import PddlParser from "@acme/chain/src/pddl/parser";

import {
  type TaskSimulationCallbacks as ChainMachineCallbacks,
  type PlanResult,
  type Review,
  type ReviewResult,
  type TaskResult,
} from "./types";
import convertPDDLJSONtoBalambSeeds, {
  type PDDLJSON,
} from "./utils/convertPDDLJSONToBalamb";

interface BaseWaggleDanceMachine {
  run(
    goal: string,
    creationProps: ModelCreationProps,
    callbacks: ChainMachineCallbacks,
  ): Promise<BalambResult | BalambError>;
}

type TaskResultContainer = {
  taskResult: TaskResult;
};

type PlanResultContainer = {
  planResult: PlanResult;
};

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
        const { domain, problem } = (await res.json()) as {
          domain: string;
          problem: string;
        };
        const domainParser = new PddlParser(domain);
        const problemParser = new PddlParser(problem);
        const domainPddl = domainParser.parse();
        const problemPddl = problemParser.parse();

        return { planId: `plan-${taskName}`, domainPddl, problemPddl };
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
            // TODO: temp hack to appease Balamb Types.  I believe we will have an actual async call here someday.
            await new Promise((resolve) => setTimeout(resolve, 1));

            console.log(`Got result ${result} for ${of}`);
            return { taskId: `${of}`, result } as TaskResult;
          },
        };
      return getSubtaskResult;
    };

    const reviewSubtask = (of: string) => {
      const reviewSubtask: SeedDef<ReviewResult, TaskResultContainer> = {
        id: `review-${of}`,
        description: "Review a plan and determine if needs cancellation",
        dependsOn: { taskResult: getSubtaskResult(of) },
        plant: async ({ taskResult }) => {
          const review: Review = {
            overall: Math.random(),
          };
          // TODO: temp hack to appease Balamb Types.  I believe we will have an actual async call here someday.
          await new Promise((resolve) => setTimeout(resolve, 1));

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

    const reviewPlan: SeedDef<ReviewResult, PlanResultContainer> = {
      id: `review-${plan.id}`,
      description: "Review a plan and determine if needs cancellation",
      dependsOn: { planResult: plan },
      plant: async ({ planResult }) => {
        console.log(`Reviewing plan ${planResult}`);

        callbacks.onTaskCreated(
          { id: `review-${plan.id}` },
          { target: `review-${plan.id}`, source: plan.id },
        );

        const review: Review = {
          overall: Math.random(),
        };
        // TODO: temp hack to appease Balamb Types.  I believe we will have an actual async call here someday.
        await new Promise((resolve) => setTimeout(resolve, 1));

        console.log(`Reviewed plan ${plan.id} with result ${review.overall}`);
        return { target: plan.id, review };
      },
    };
    const planResult = await Balamb.run([plan]);

    // If planResult is of type BalambError, then we need to bail out
    // and return the error to the caller.
    if (planResult instanceof BalambError) {
      console.error(planResult);
      callbacks.onReviewFailure(taskName, planResult);
      return planResult;
    }

    // [Log] {"info":{"errorCode":"SEED_FAILURES","failures":[{"id":"plan-","error":{}}],"partialResults":{}}}
    // const tasks =
    //   (planResult.results &&
    //     (planResult?.results?.[planId] as { tasks: string[] })?.tasks) ||
    //   [];
    // if (planResult) console.log(JSON.stringify(planResult));
    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // const seeds: SeedDef<any, any>[] = tasks.map((tasks) => {
    //   // TODO: debugging these balamb types is 🤮
    //   return reviewSubtask(tasks);
    // });
    const pddl =
      (planResult.results && (planResult?.results?.[planId] as PDDLJSON)) || {};
    console.log(`pddl: ${JSON.stringify(pddl)}`);
    const seeds = convertPDDLJSONtoBalambSeeds(pddl);
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
