import React, { useState } from "react";
import { Button, Stack, Typography } from "@mui/joy";
import Balamb, { BalambError, SeedDef } from "balamb";

type TaskResult = {
  name: string;
  result: any;
};

type ReviewResult = {
  target: string;
  success: boolean;
};

// Usage example:
// runSimulation(10);
class TaskSimulation {
  async runTaskWithReview(
    taskName: string,
    onReviewFailure: (target: string, error: Error) => void,
  ) {
    const planTask = () => {
      const id = `plan-${taskName}-${this.generateTaskName()}`;
      const planTask: SeedDef<string[], void> = {
        id,
        description: "Plan a tasks to achieve goal",
        plant: async () => {
          const subTaskCount = 1 + Math.floor(Math.random() * 10);
          var tasks: string[] = [];
          for (let i = 0; i < subTaskCount; i++) {
            const newTaskId = `subTask-${this.generateTaskName()}`;
            tasks.push(newTaskId);
          }
          console.log(`Planned ${subTaskCount} new tasks for ${id}`);
          return tasks;
        },
      };
      return planTask;
    };

    const executeTask = () => {
      const id = `execute-${taskName}-${this.generateTaskName()}`;
      const executeTask: SeedDef<TaskResult, void> = {
        id,
        description: "Execute a task and return its result",
        plant: async () => {
          // Simulate task execution
          const result = Math.random();
          console.log(`Executed task ${id} with result ${result}`);
          return { name: id, result } as TaskResult;
        },
        dependsOn: { name: planTask() },
      };
      return executeTask;
    };

    const reviewTask = () => {
      const reviewTask: SeedDef<ReviewResult, { e: TaskResult }> = {
        id: `review-${taskName}-${this.generateTaskName()}`,
        description: "Review a task and determine if it's successful",
        dependsOn: { e: executeTask() },
        plant: async ({ e }) => {
          // Simulate review with a 15% chance of failure
          const success = Math.random() > 0.15;
          console.log(`Reviewed task ${e.name} with result ${success}`);
          return { target: e.name, success };
        },
      };
      return reviewTask;
    };

    const taskResult = await Balamb.run([
      planTask(),
      // { ...planTask(), args: {} },
      // { ...executeTask(), args: { name: taskName } },
      // { ...reviewTask(), args: { target: taskName } },
    ]);
    if (taskResult instanceof BalambError) {
      console.error(taskResult);
      onReviewFailure(taskName, taskResult);
    } else {
      const reviewResult = await Balamb.run([
        { ...reviewTask(), args: { target: taskResult } },
      ]);

      if (reviewResult instanceof BalambError) {
        // const errMessage = `Task review failed for task ${taskName}`;
        console.error(reviewResult);
        onReviewFailure(taskName, reviewResult);
      } else {
        console.log(
          `Task ${taskName} executed successfully with result ${JSON.stringify(
            taskResult,
          )}`,
        );
      }
    }
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
      {/* <ul>
        {log.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ul> */}
    </Stack>
  );
};

export default TaskSimulator;
