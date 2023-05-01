// useChainTaskDAG.ts
import { useCallback, useState } from "react";

import { GraphData, LinkObject, NodeObject } from "~/components/ForceTree";

export enum ChainTaskType {
  plan = "plan",
  review = "review",
  execute = "execute",
  complete = "complete",
  error = "error",
}

export type ChainTask = {
  id: string;
  type: ChainTaskType;
  dependencies: Set<string>;
  dependents: Set<string>;
};

export type DAGNode<T> = {
  id: string;
  data: T;
  dependencies: Set<string>;
  dependents: Set<string>;
};

// DirectedAcyclicGraph class is a generic implementation of a directed acyclic graph (DAG) data structure.
// It allows adding nodes with data and directed edges between nodes.
// It consists of methods to add nodes, remove nodes, add edges, and identify cyclic dependencies.
export class DirectedAcyclicGraph<T> {
  nodes: Map<string, DAGNode<T>>;

  constructor() {
    this.nodes = new Map();
  }

  // Adds a new node with a unique id and associated data to the graph.
  addNode(id: string, data: T): void {
    console.log(JSON.stringify(this.nodes));
    // if (this.nodes.has(id)) {
    //   return;
    //   //throw new Error(`Node with id "${id}" already exists.`);
    // }

    this.nodes.set(id, {
      id,
      data,
      dependencies: new Set(),
      dependents: new Set(),
    });
  }

  // Adds a directed edge between two nodes (from `from` node to the `to` node) in the graph.
  addEdge(from: string, to: string): void {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);

    if (!fromNode || !toNode) {
      throw new Error(`Both nodes must exist to create an edge. ${from} ${to}`);
    }

    if (this.checkCircularDependency(from, to)) {
      throw new Error(
        `Adding this edge (from ${from} to ${to}) would create a circular dependency.`,
      );
    }

    fromNode.dependents.add(to);
    toNode.dependencies.add(from);
  }

  // Checks if adding an edge between the two nodes (from `from` node to the `to` node) would create a circular dependency.
  checkCircularDependency(from: string, to: string): boolean {
    const visited = new Set<string>();
    const stack = [to];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === from) {
        return true;
      } else if (current !== undefined) {
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
    }

    return false;
  }

  // Removes a node with a specified id from the graph, updating dependencies and dependents lists for connected nodes.
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
  getGraphDataFromDAG = (dag: DirectedAcyclicGraph<ChainTask>): GraphData => {
    const nodes: NodeObject[] = [];
    const links: LinkObject[] = [];

    dag.nodes.forEach((task) => {
      nodes.push({
        ...task.data,
        dependencies: Array.from(task.dependencies),
        dependents: Array.from(task.dependents),
      });
      task.dependents.forEach((dependentId) => {
        links.push({
          source: task.id,
          target: dependentId,
        });
      });
    });

    return { nodes, links };
  };
}

const useChainTaskDAG = () => {
  const [dag] = useState(new DirectedAcyclicGraph<ChainTask>());

  const updateDAG = useCallback(
    (updateFn: (dag: DirectedAcyclicGraph<ChainTask>) => void) => {
      updateFn(dag);
    },
    [dag],
  );

  return { dag, updateDAG };
};

export default useChainTaskDAG;
