import React, { useState } from "react";
import { Button, Stack, Typography } from "@mui/joy";
import Balamb, { BalambError, SeedDef } from "balamb";

type PlanResult = {
  planId: string;
  tasks: string[];
};

type TaskResult = {
  taskId: string;
  result: string;
};

type Review = {
  overall: number;
};

type ReviewResult = {
  target: string;
  review: Review;
};

// Usage example:
// runSimulation(10);
class TaskSimulation {
  async runTaskWithReview(
    taskName: string,
    onReviewFailure: (target: string, error: Error) => void,
  ) {
    const subTaskCount = 1 + Math.floor(Math.random() * 10);
    var tasks: string[] = [];
    for (let i = 0; i < subTaskCount; i++) {
      const newTaskId = `subTask-${this.generateTaskName()}`;
      tasks.push(newTaskId);
    }
    console.log(`Planned ${subTaskCount} new tasks for ${taskName}`);

    const plan: SeedDef<PlanResult, void> = {
      id: `plan-${taskName}`,
      description: "Plan tasks to achieve goal",
      plant: async () => {
        return { planId: `plan-${taskName}`, tasks };
      },
    };

    const getSubtaskResult = (of: string) => {
      const getSubtaskResult: SeedDef<TaskResult, { planResult: PlanResult }> =
        {
          id: `getSubtaskResult-${of}`,
          description: "Get results of subtasks",
          dependsOn: { planResult: plan },
          plant: async ({ planResult }) => {
            const result = `${Math.random()}`;
            console.log(`Got result ${result} for ${of}`);
            return { taskId: of, result } as TaskResult;
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
          console.log(
            `Reviewed plan ${of} ${taskResult} with result ${review.overall}`,
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
        const review: Review = {
          overall: Math.random(),
        };
        console.log(`Reviewed plan ${plan.id} with result ${review.overall}`);
        return { target: plan.id, review };
      },
    };

    const seeds: SeedDef<any, any> = tasks.map((task) => {
      return reviewSubtask(task);
    });
    seeds.unshift(reviewPlan);
    try {
      const taskResult = await Balamb.run(seeds);
      if (taskResult instanceof BalambError) {
        console.error(taskResult);
        onReviewFailure(taskName, taskResult);
      } else {
        console.log(JSON.stringify(taskResult));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
        onReviewFailure(taskName, error);
      }
    }
    //   const reviewResult = await Balamb.run([
    //     { ...reviewTask(), args: { target: taskResult } },
    //   ]);

    //   if (reviewResult instanceof BalambError) {
    //     // const errMessage = `Task review failed for task ${taskName}`;
    //     console.error(reviewResult);
    //     onReviewFailure(taskName, reviewResult);
    //   } else {
    //     console.log(
    //       `Task ${taskName} executed successfully with result ${JSON.stringify(
    //         taskResult,
    //       )}`,
    //     );
    //   }
    // }
  }

  generateTaskName(): string {
    return `${Math.floor(Math.random() * 10000)}`;
  }

  async addTask(
    taskName: string,
    onReviewFailure: (target: string, error: Error) => void,
  ) {
    await this.runTaskWithReview(taskName, onReviewFailure);
  }

  async runSimulation(steps: number) {
    await this.runTaskWithReview(
      `GOAL-${this.generateTaskName()}`,
      this.cancelTaskAndChildren,
    );
  }

  cancelTaskAndChildren(target: string, error: Error) {
    console.log(`Cancelling task ${target} and its children because: ${error}`);
  }
}

const TaskSimulator = () => {
  const [simulation, setSimulation] = useState(() => {
    const sim = new TaskSimulation();
    sim;
    return sim;
  });
  const [log, setLog] = useState<string[]>([]);

  const handleRunSimulation = async () => {
    const steps = 1;
    await simulation.runSimulation(steps);
  };

  return (
    <Stack>
      <Button onClick={handleRunSimulation}>Run Simulation</Button>
      <Typography>{JSON.stringify(simulation)}</Typography>
    </Stack>
  );
};

export default TaskSimulator;
