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
    const planTask: SeedDef<string[], void> = {
      id: `plan-${taskName}`,
      description: "Plan a tasks to achieve goal",
      plant: async () => {
        const subTaskCount = 1 + Math.floor(Math.random() * 10);
        var tasks: string[] = [];
        for (let i = 0; i < subTaskCount; i++) {
          const newTaskId = `planTask-${this.generateTaskName()}`;
          tasks.push(newTaskId);
        }
        console.log(`Planned ${subTaskCount} new tasks`);
        return tasks;
      },
    };

    const executeTask: SeedDef<TaskResult, void> = {
      id: `execute-${taskName}`,
      description: "Execute a task and return its result",
      plant: async () => {
        // Simulate task execution
        const result = Math.random();
        console.log(`Executed task ${taskName} with result ${result}`);
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
        console.log(`Reviewed task ${taskName} with result ${success}`);
        return { success };
      },
    };

    const taskResult = await Balamb.run([
      { ...executeTask, args: { name: taskName } },
    ]);
    if (taskResult instanceof BalambError) {
      onReviewFailure(taskName);
      // throw new Error("Task execution failed");
    } else {
      const reviewResult = await Balamb.run([
        { ...reviewTask, args: { target: taskResult } },
      ]);

      if (reviewResult instanceof BalambError) {
        const errMessage = `"Task review failed for task ${taskName}`;
        console.error(errMessage);
        // throw new Error(errMessage);
        onReviewFailure(taskName);
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

  async addTask(taskName: string, onReviewFailure: (target: string) => void) {
    await this.runTaskWithReview(taskName, onReviewFailure);
  }

  async runSimulation(steps: number) {
    var promises: Promise<void>[] = [];
    for (let i = 0; i < steps; i++) {
      const taskName = this.generateTaskName();
      promises.push(
        this.addTask(
          `runSimulationTask-${taskName}`,
          this.cancelTaskAndChildren,
        ),
      ); // onReviewFailure
    }
    await Promise.all(promises);
  }

  cancelTaskAndChildren(target: string) {
    console.log(`Cancelling task ${target} and its children`);
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
    const steps = 10;
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
