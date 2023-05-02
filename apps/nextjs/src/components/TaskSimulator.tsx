import React, { useState } from "react";
import { Button, Stack, Typography } from "@mui/joy";
import Balamb, { BalambError, SeedDef } from "balamb";

type TaskResult = {
  name: string;
  result: any;
};

type ReviewResult = {
  success: boolean;
};

// Usage example:
// runSimulation(10);
class TaskSimulation {
  async runTaskWithReview(
    taskName: string,
    onReviewFailure: (target: string) => void,
  ) {
    const planTask: SeedDef<void, void> = {
      id: `plan-${taskName}`,
      description: "Plan a tasks to achieve goal",
      plant: async () => {},
    };
    const executeTask: SeedDef<TaskResult, void> = {
      id: `execute-${taskName}`,
      description: "Execute a task and return its result",
      plant: async () => {
        // Simulate task execution
        const result = Math.random();
        return { name: `execute-${taskName}`, result };
      },
      dependsOn: { name: planTask },
    };

    const reviewTask: SeedDef<ReviewResult, { e: TaskResult }> = {
      id: `review-${taskName}`,
      description: "Review a task and determine if it's successful",
      dependsOn: { e: executeTask },
      plant: async ({ e }) => {
        // Simulate review with a 15% chance of failure
        const success = Math.random() > 0.15;
        return { success };
      },
    };

    const taskResult = await Balamb.run([
      { ...executeTask, args: { name: taskName } },
    ]);
    if (taskResult instanceof BalambError) {
      throw new Error("Task execution failed");
    } else {
      console.log(
        `Task ${taskName} executed successfully with result ${JSON.stringify(
          taskResult,
        )}`,
      );
      const reviewResult = await Balamb.run([
        { ...reviewTask, args: { target: taskResult } },
      ]);

      if (reviewResult instanceof BalambError) {
        throw new Error("Task review failed");
      } else if (reviewResult.results) {
        Object.keys(reviewResult.results).forEach((key) => {
          // const result = reviewResult.results[key]
          // if (result) {
          onReviewFailure(key);
          // }
        });
      }
    }
  }

  generateTaskName(): string {
    return `task-${Math.floor(Math.random() * 10000)}`;
  }

  async addTask(onReviewFailure: (target: string) => void) {
    const taskName = this.generateTaskName();
    await this.runTaskWithReview(taskName, onReviewFailure);
  }

  async runSimulation(steps: number) {
    for (let i = 0; i < steps; i++) {
      await this.addTask(this.cancelTaskAndChildren); // onReviewFailure
    }
  }

  cancelTaskAndChildren(target: string) {
    console.log(`Cancelling task ${target} and its children`);
  }
}

const TaskSimulator = () => {
  const [simulation, setSimulation] = useState(new TaskSimulation());
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
