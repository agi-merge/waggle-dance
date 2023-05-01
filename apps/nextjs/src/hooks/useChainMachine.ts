import { useEffect, useMemo, useRef, useState } from "react";
import { DirectedAcyclicGraph as G } from "typescript-graph";

import { GraphData, LinkObject, NodeObject } from "~/components/ForceTree";

class DirectedAcyclicGraph<T> extends G<T> {
  // ...
  edgesFromNode(nodeID: string): Array<{ target: T }> {
    const targetNodeIndices = this.adjacency[
      Array.from(this.nodes.keys()).indexOf(nodeID)
    ].reduce<number[]>((indices, val, idx) => {
      if (val) indices.push(idx);
      return indices;
    }, []);
    const targetNodes = targetNodeIndices.map((idx) =>
      this.nodes.get(Array.from(this.nodes.keys())[idx]),
    );
    return targetNodes.map((target) => ({ target }));
  }

  nodeId(t: T): string {
    return this.nodeIdentity(t);
  }
}

type Task = {
  name: string;
};

type NodeType = "plan" | "task" | "taskReview";

interface ChainMachineNode {
  name: string;
  type: NodeType;
  execution: () => Promise<Task[]>;
}

type ChainMachineNodeExecution = {
  dag: DirectedAcyclicGraph<ChainMachineNode>;
  graphData: GraphData;
};

// ChainMachine Interface
interface ChainMachine {
  dag: DirectedAcyclicGraph<ChainMachineNode>;
  graphData: GraphData;
  execute: () => Promise<ChainMachineNodeExecution>;
}

// Simulated ChainMachine Implementation
export class SimulatedChainMachine implements ChainMachine {
  dag: DirectedAcyclicGraph<ChainMachineNode>;
  graphData: GraphData;
  constructor() {
    console.log("new DAG");
    this.dag = new DirectedAcyclicGraph<ChainMachineNode>();
    this.graphData = { nodes: [], links: [] };
  }

  async executeNode(nodeId: string, node: ChainMachineNode) {
    console.log(`Executing node ${node.name}`);
    const subtasks = await node.execution();
    const childNodesExecution = subtasks.map(async (result) => {
      if (node.type !== "taskReview") {
        const reviewNode: ChainMachineNode = {
          name: `review-${node.name}`,
          type: "taskReview",
          execution: async () => {
            // Simulate a 15% chance of failing
            if (Math.random() <= 0.15) {
              throw new Error(`Review task review-${node.name} failed`);
            }
            return [result];
          },
        };

        const reviewNodeId = this.dag.nodeId(reviewNode);
        if (!this.dag.getNode(reviewNodeId)) {
          this.dag.insert(reviewNode);
          this.dag.addEdge(nodeId, reviewNodeId);
        }
        await this.executeNode(reviewNodeId, reviewNode);
      } else {
        try {
          await node.execution();
        } catch (error) {
          SimulatedChainMachine.handleCancellation(
            this.dag,
            nodeId,
            node,
            error,
          );
        }
      }
    });
    await Promise.allSettled(childNodesExecution);
  }

  async execute() {
    const rootNodeId = "root-plan";
    let root = this.dag.getNode(rootNodeId);

    if (!root) {
      root = {
        name: rootNodeId,
        type: "plan" as NodeType,
        execution: async () => {
          const verbs = ["search", "download", "process", "analyze", "store"];
          const nouns = [
            "data",
            "images",
            "videos",
            "documents",
            "information",
          ];
          const taskCount = Math.floor(Math.random() * 5);
          const tasks: Task[] = [];

          for (let i = 0; i < taskCount; i++) {
            const verb = verbs[Math.floor(Math.random() * verbs.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const taskId = Math.random().toString(36).substring(2, 6);
            const task: Task = { name: `${verb}-${noun}-${taskId}` };
            tasks.push(task);
          }

          return tasks;
        },
      };
      this.dag.insert(root); // Use insert() method since root does not exist yet
    }

    await this.executeNode(rootNodeId, root);
    this.graphData = dagToGraphData(this.dag);
    return { dag: this.dag, graphData: this.graphData };
  }

  static handleCancellation(
    graph: DirectedAcyclicGraph<ChainMachineNode>,
    nodeId: string,
    node: ChainMachineNode,
    error: Error,
  ) {
    console.log(`Node ${node.name} cancelled due to error: ${error.message}`);
    graph
      .getSubGraphStartingFrom(nodeId)
      .getNodes()
      .forEach((childNode) =>
        console.log(`Cancelled child node: ${childNode.name}`),
      );
  }
}

function dagToGraphData(
  graph: DirectedAcyclicGraph<ChainMachineNode>,
): GraphData {
  const nodes = graph.getNodes().map<NodeObject>((node) => ({
    id: node.name,
  }));

  const nodeMap = new Map<string, NodeObject>(
    nodes.map((node) => [node.id as string, node]),
  );

  const edges = graph
    .getNodes()
    .flatMap((node) =>
      graph
        .edgesFromNode(graph.nodeId(node))
        .map((edge) => ({ source: node, target: edge.target })),
    );

  const links = edges.map<LinkObject>((edge) => ({
    source: nodeMap.get(edge.source.name) as string | number | NodeObject,
    target: nodeMap.get(edge.target.name) as string | number | NodeObject,
  }));
  debugger;

  return { nodes, links };
}
// Replace the useRef with useState
export function useChainMachine() {
  const [chainMachine, setChainMachine] = useState<ChainMachine | null>(
    new SimulatedChainMachine(),
  );

  // Instead of the forceUpdate function, the setChainMachine function will be used
  return {
    chainMachine,
    setChainMachine,
  };
}

export function useDAGSimulation() {
  const [dag, setDag] = useState(new DirectedAcyclicGraph<ChainMachineNode>());
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const executeNode = async (nodeId: string, node: ChainMachineNode) => {
    console.log(`Executing node ${node.name}`);
    const subtasks = await node.execution();
    const childNodesExecution = subtasks.map(async (result) => {
      if (node.type !== "taskReview") {
        const reviewNode: ChainMachineNode = {
          name: `review-${node.name}`,
          type: "taskReview",
          execution: async () => {
            if (Math.random() <= 0.15) {
              throw new Error(`Review task review-${node.name} failed`);
            }
            return [result];
          },
        };

        const reviewNodeId = dag.nodeId(reviewNode);
        if (!dag.getNode(reviewNodeId)) {
          dag.insert(reviewNode);
          dag.addEdge(nodeId, reviewNodeId);
        }
        await executeNode(reviewNodeId, reviewNode);
      } else {
        try {
          await node.execution();
        } catch (error) {
          handleCancellation(dag, nodeId, node, error);
        }
      }
    });
    await Promise.allSettled(childNodesExecution);
  };

  const execute = async () => {
    const rootNodeId = "root-plan";
    let root = dag.getNode(rootNodeId);

    if (!root) {
      root = {
        name: rootNodeId,
        type: "plan" as NodeType,
        execution: async () => {
          const verbs = ["search", "download", "process", "analyze", "store"];
          const nouns = [
            "data",
            "images",
            "videos",
            "documents",
            "information",
          ];
          const taskCount = Math.floor(Math.random() * 5);
          const tasks: Task[] = [];

          for (let i = 0; i < taskCount; i++) {
            const verb = verbs[Math.floor(Math.random() * verbs.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const taskId = Math.random().toString(36).substring(2, 6);
            const task: Task = { name: `${verb}-${noun}-${taskId}` };
            tasks.push(task);
          }

          return tasks;
        },
      };
      dag.insert(root);
    }

    await executeNode(rootNodeId, root);
    setDag(dag);
    setGraphData(dagToGraphData(dag));
  };

  const handleCancellation = (
    graph: DirectedAcyclicGraph<ChainMachineNode>,
    nodeId: string,
    node: ChainMachineNode,
    error: Error,
  ) => {
    console.log(
      `Node ${node.name} cancelled due to an error: ${error.message}`,
    );
    graph
      .getSubGraphStartingFrom(nodeId)
      .getNodes()
      .forEach((childNode) =>
        console.log(`Cancelled child node: ${childNode.name}`),
      );
  };

  return { dag, graphData, execute };
}
