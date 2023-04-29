/*

Given a DAG, write a idiomatic and complete ChainMachine React component that achieves the following:

Tasks have async executions.
The first task in the demo is to add a plan type task. The result of the plan task is an array of sub-task strings.
When a task (≠ review type) returns a result, it must be reviewed.
However, because review is also async and slow, we want to start executing the sub-tasks while waiting. Similarly, some can be executed in parallel, while others are dependent.
A task chain is said to be complete when all of its nodes have been canceled or completed.

*/

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Stack } from "@mui/joy";
import { useMachine } from "react-robot";
import { createMachine, invoke, reduce, state, transition } from "robot3";

import ForceTree, { GraphData, getGraphDataFromDAG } from "./ForceTree";

export type DAGNode<T> = {
  id: string;
  data: T;
  dependencies: Set<string>;
  dependents: Set<string>;
};

export class DirectedAcyclicGraph<T> {
  tasks: Map<string, DAGNode<T>>;

  constructor() {
    this.tasks = new Map();
  }

  addNode(id: string, data: T): void {
    if (this.tasks.has(id)) {
      throw new Error(`Node with id "${id}" already exists.`);
    }

    this.tasks.set(id, {
      id,
      data,
      dependencies: new Set(),
      dependents: new Set(),
    });
  }

  addEdge(from: string, to: string): void {
    const fromNode = this.tasks.get(from);
    const toNode = this.tasks.get(to);

    if (!fromNode || !toNode) {
      throw new Error("Both nodes must exist to create an edge.");
    }

    fromNode.dependents.add(to);
    toNode.dependencies.add(from);
  }

  removeNode(id: string): void {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`Node with id "${id}" does not exist.`);
    }

    task.dependencies.forEach((dependencyId) => {
      const dependency = this.tasks.get(dependencyId);
      if (dependency) {
        dependency.dependents.delete(id);
      }
    });

    task.dependents.forEach((dependentId) => {
      const dependent = this.tasks.get(dependentId);
      if (dependent) {
        dependent.dependencies.delete(id);
      }
    });

    this.tasks.delete(id);
  }

  getNode(id: string): DAGNode<T> | undefined {
    return this.tasks.get(id);
  }

  cancelTask(id: string): void {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`Node with id "${id}" does not exist.`);
    }

    task.dependents.forEach((dependentId) => {
      this.cancelTask(dependentId);
    });

    this.removeNode(id);
  }

  executeTask(id: string, execute: (data: T) => void): void {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`Node with id "${id}" does not exist.`);
    }

    if (task.dependencies.size === 0) {
      execute(task.data);

      task.dependents.forEach((dependentId) => {
        const dependent = this.tasks.get(dependentId);
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

      if (!task) {
        throw new Error(`Task with id "${id}" does not exist.`);
      }

      if (task.dependencies.size === 0) {
        const result = await execute(task);

        task.dependents.forEach((dependentId) => {
          setDAG((prevDag) => {
            const updatedDag = prevDag;
            const dependent = updatedDag.getNode(dependentId)?.data;

            if (dependent) {
              dependent.dependencies.delete(id);
            }

            return updatedDag;
          });

          executeTask(dependentId);
        });

        setDAG((prevDag) => {
          const updatedDag = prevDag;
          updatedDag.removeNode(id);
          return updatedDag;
        });
      }
    },
    [dag],
  );

  const startChain = useCallback(() => {
    if (dag.getNode(initialPlan)) {
      executeTask(initialPlan);
    }
  }, [initialPlan, executeTask, dag]);

  const [graphData, setGraphData] = useState<GraphData>(() =>
    getGraphDataFromDAG(dag),
  );

  return (
    <div>
      <ForceTree data={graphData} />
      <button onClick={startChain}>Start Chain</button>
    </div>
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
  return new Promise<string[]>((resolve) =>
    setTimeout(() => resolve(["task1", "task2", "task3"]), 1000),
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

export default ChainMachine;

/* Return ONLY Improvements to the code, preserving the stated goals and implied intents */
