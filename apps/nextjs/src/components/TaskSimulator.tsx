import React, { useState } from "react";
import { Button, Stack, Typography } from "@mui/joy";
import Balamb, { BalambError, SeedDef } from "balamb";

import ForceTree, { GraphData, LinkObject, NodeObject } from "./ForceTree";

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

type TaskSimulationCallbacks = {
  onTaskCreated: (newNode: NodeObject, newLink?: LinkObject) => void;
  onReviewFailure: (target: string, error: Error) => void;
};

// Usage example:
// runSimulation(10);
class TaskSimulation {
  async runTaskWithReview(
    taskName: string,
    callbacks: TaskSimulationCallbacks,
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
        callbacks.onTaskCreated({ id: `plan-${taskName}` });
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
            callbacks.onTaskCreated(
              { id: `getSubtaskResult-${of}` },
              { source: of, target: plan.id },
            );
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
          callbacks.onTaskCreated(
            { id: taskResult.taskId /*, label: taskResult.result */ },
            { source: of, target: plan.id },
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
          { source: planResult.planId, target: plan.id },
        );
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

  async runSimulation(callbacks: TaskSimulationCallbacks) {
    return await this.runTaskWithReview(
      `GOAL-${this.generateTaskName()}`,
      callbacks,
    );
  }
}

const TaskSimulator = () => {
  const [simulation, setSimulation] = useState(() => {
    const sim = new TaskSimulation();
    sim;
    return sim;
  });

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const removeSubGraphData = (target: string) => {
    setGraphData((prevGraphData) => {
      const nodesToRemove = [target];

      const newNodes = prevGraphData.nodes.filter(
        (node) => !nodesToRemove.includes(node.id),
      );
      const newLinks = prevGraphData.links.filter(
        (link) =>
          !nodesToRemove.includes(link.source as string) &&
          !nodesToRemove.includes(link.target as string),
      );

      return { nodes: newNodes, links: newLinks };
    });
  };

  const handleRunSimulation = async () => {
    const steps = 1;
    const result = await simulation.runSimulation({
      onTaskCreated: (newNode: NodeObject, newLink?: LinkObject) => {
        console.log(
          `onTaskCreated ${newNode.id}, newLink: ${newLink?.source}->${newLink?.target}`,
        );
        setGraphData((prevGraphData) => ({
          nodes: [...prevGraphData.nodes, newNode],
          links: newLink
            ? [...prevGraphData.links, newLink]
            : prevGraphData.links,
        }));
      },
      onReviewFailure: (target: string, error: Error) => {
        // TODO: remove sub-GraphData
        console.error(`Review of ${target} failed: ${error}`);
        removeSubGraphData(target);
      },
    });
    console.log(`Simulation result: ${JSON.stringify(result)}`);
  };

  return (
    <Stack>
      <Button onClick={handleRunSimulation}>Run Simulation</Button>
      <Typography>{JSON.stringify(simulation)}</Typography>
      {graphData.links.length > 0 && <ForceTree data={graphData} />}
    </Stack>
  );
};

export default TaskSimulator;
