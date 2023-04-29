/*

Given a DAG, write a idiomatic and complete ChainMachine React component that achieves the following:

Tasks have async executions.
The first task in the demo is to add a plan type task. The result of the plan task is an array of sub-task strings.
When a task (≠ review type) returns a result, it must be reviewed.
However, because review is also async and slow, we want to start executing the sub-tasks while waiting. Similarly, some can be executed in parallel, while others are dependent.
A task chain is said to be complete when all of its nodes have been canceled or completed.

*/

import { useCallback, useEffect, useState } from "react";
import { Button, Stack, Typography } from "@mui/joy";

import ForceTree, { GraphData, getGraphDataFromDAG } from "./ForceTree";

export type DAGNode<T> = {
  id: string;
  data: T;
  dependencies: Set<string>;
  dependents: Set<string>;
};

export type Plan = {
  id: string;
  task: string;
  dependencies: Set<string>;
};
export class DirectedAcyclicGraph<T> {
  nodes: Map<string, DAGNode<T>>;

  constructor() {
    this.nodes = new Map();
  }

  addNode(id: string, data: T): void {
    if (this.nodes.has(id)) {
      throw new Error(`Node with id "${id}" already exists.`);
    }

    this.nodes.set(id, {
      id,
      data,
      dependencies: new Set(),
      dependents: new Set(),
    });
  }

  addEdge(from: string, to: string): void {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);

    if (!fromNode || !toNode) {
      throw new Error("Both nodes must exist to create an edge.");
    }

    fromNode.dependents.add(to);
    toNode.dependencies.add(from);
  }

  removeNode(id: string): void {
    const task = this.nodes.get(id);

    if (!task) {
      throw new Error(`Node with id "${id}" does not exist.`);
    }

    task.dependencies.forEach((dependencyId) => {
      const dependency = this.nodes.get(dependencyId);
      if (dependency) {
        dependency.dependents.delete(id);
      }
    });

    task.dependents.forEach((dependentId) => {
      const dependent = this.nodes.get(dependentId);
      if (dependent) {
        dependent.dependencies.delete(id);
      }
    });

    this.nodes.delete(id);
  }

  getNode(id: string): DAGNode<T> | undefined {
    return this.nodes.get(id);
  }

  cancelTask(id: string): void {
    const task = this.nodes.get(id);

    if (!task) {
      throw new Error(`Node with id "${id}" does not exist.`);
    }

    task.dependents.forEach((dependentId) => {
      this.cancelTask(dependentId);
    });

    this.removeNode(id);
  }

  executeTask(id: string, execute: (data: T) => void): void {
    const task = this.nodes.get(id);

    if (!task) {
      throw new Error(`Node with id "${id}" does not exist.`);
    }

    if (task.dependencies.size === 0) {
      execute(task.data);

      task.dependents.forEach((dependentId) => {
        const dependent = this.nodes.get(dependentId);
        if (dependent) {
          dependent.dependencies.delete(id);
        }
        this.executeTask(dependentId, execute);
      });

      this.removeNode(id);
    }
  }
}

export enum ChainTaskType {
  plan = "plan",
  review = "review",
  execute = "execute",
  error = "error",
}

export type ChainTask = {
  id: string;
  type: ChainTaskType;
  dependencies: Set<string>;
  dependents: Set<string>;
};

export type ChainMachineProps = {
  initialPlan: string;
};

const ChainMachine: React.FC<ChainMachineProps> = ({ initialPlan }) => {
  const [dag, setDAG] = useState(() => {
    const initialDag = new DirectedAcyclicGraph<ChainTask>();
    initialDag.addNode(initialPlan, {
      id: initialPlan,
      type: ChainTaskType.plan,
      dependencies: new Set(),
      dependents: new Set(),
    });
    return initialDag;
  });

  const executeTask = useCallback(
    async (id: string) => {
      const task = dag.getNode(id)?.data;
      console.log("loop task", task);
      if (!task) {
        throw new Error(`Task with id "${id}" does not exist.`);
      }

      if (task.dependencies.size === 0) {
        const result = await execute(task);

        if (task.type !== ChainTaskType.review) {
          const reviewId = `review-${id}`;
          dag.addNode(reviewId, {
            id: reviewId,
            type: ChainTaskType.review,
            dependencies: new Set([id]),
            dependents: new Set(task.dependents),
          });
          task.dependents.forEach((dependentId) => {
            dag.addEdge(reviewId, dependentId);
          });
          task.dependents.clear();
          task.dependents.add(reviewId);
        }

        const dependentPromises = []; // Add a new array for Promises of dependent tasks
        task.dependents.forEach((dependentId) => {
          setDAG((prevDag) => {
            const updatedDag = prevDag;
            const dependent = updatedDag.getNode(dependentId)?.data;

            if (dependent) {
              dependent.dependencies.delete(id);
            }
            console.log("updatedDag1", updatedDag);
            return updatedDag;
          });

          dependentPromises.push(executeTask(dependentId)); // Add Promises for each dependent task
        });

        await Promise.all(dependentPromises); // Wait for all dependent tasks to finish concurrently

        setDAG((prevDag) => {
          const updatedDag = prevDag;
          updatedDag.removeNode(id);
          console.log("updatedDag2", updatedDag);
          return updatedDag;
        });
      }
    },
    [dag],
  );

  const startChain = useCallback(async () => {
    if (dag.getNode(initialPlan)) {
      const taskPromises = [executeTask(initialPlan)];

      await Promise.all(taskPromises); // Wait for all concurrent tasks to finish
    }
  }, [initialPlan, executeTask, dag]);

  const [graphData, setGraphData] = useState<GraphData>(() =>
    getGraphDataFromDAG(dag),
  );
  useEffect(() => {
    // Update graphData whenever dag changes
    console.log("dag", dag);
    setGraphData(getGraphDataFromDAG(dag));
  }, [dag]);

  return (
    <Stack className="h-200 max-w-md">
      <Typography>
        {JSON.stringify(dag.nodes, getCircularReplacer())}
      </Typography>
      <Button onClick={startChain}>Start Chain</Button>
      <div>
        <ForceTree data={graphData} />
      </div>
    </Stack>
  );
};
const execute = async (task: ChainTask) => {
  // Implement your execution logic here based on task.type
  // demo mode
  switch (task.type) {
    case ChainTaskType.plan:
      return await planTask(task.id);
    case ChainTaskType.review:
      return await reviewTask(task.id, task.id);
    case ChainTaskType.execute:
      return await executeSubTask(task.id);
  }
};

// Simulate async planTask
const planTask = async (id: string) => {
  return new Promise<Plan[]>((resolve) =>
    setTimeout(
      () =>
        resolve([
          { id: "task1", task: "", dependencies: new Set<string>("") },
          { id: "task2", task: "", dependencies: new Set<string>(["task1"]) },
          { id: "task3", task: "", dependencies: new Set<string>(["task1"]) },
        ]),
      1000,
    ),
  );
};

// Simulate async reviewTask
const reviewTask = async (id: string, taskId: string) => {
  return new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(true), 1000),
  );
};

// Simulate async executeSubTask
const executeSubTask = async (id: string) => {
  return new Promise<void>((resolve) => setTimeout(resolve, 1000));
};

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

export default ChainMachine;

/* Return ONLY Improvements to the code, preserving the stated goals and implied intents */
