import { useCallback, useState } from "react";

import { ChainTask, ChainTaskType } from "~/components/ChainMachine";

export type DAGNode<T> = {
  id: string;
  data: T;
  dependencies: Set<string>;
  dependents: Set<string>;
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

    if (this.checkCircularDependency(from, to)) {
      throw new Error("Adding this edge would create a circular dependency.");
    }

    fromNode.dependents.add(to);
    toNode.dependencies.add(from);
  }

  checkCircularDependency(from: string, to: string): boolean {
    const visited = new Set<string>();
    const stack = [to];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === from) {
        return true;
      }

      visited.add(current);
      const currentNode = this.nodes.get(current);
      if (currentNode) {
        currentNode.dependencies.forEach((dependencyId) => {
          if (!visited.has(dependencyId)) {
            stack.push(dependencyId);
          }
        });
      }
    }

    return false;
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

const useDAG = (initialPlan: string) => {
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

  const updateDAG = useCallback(
    (updateFn: (dag: DirectedAcyclicGraph<ChainTask>) => void) => {
      setDAG((prevDag) => {
        const updatedDag = new DirectedAcyclicGraph<ChainTask>();
        updatedDag.nodes = new Map(prevDag.nodes);
        updateFn(updatedDag);
        return updatedDag;
      });
    },
    [],
  );

  return { dag, updateDAG };
};

export default useDAG;
