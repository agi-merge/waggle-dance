// // lib/chainMachine.ts

import React, { useCallback, useState } from "react";
import { Button } from "@mui/joy";
import { DirectedGraph, DirectedAcyclicGraph as G } from "typescript-graph";

import { useSimulation } from "~/hooks/useSimulation";
import ForceTree, { GraphData, LinkObject, NodeObject } from "./ForceTree";

// types.ts
type NodeType = "task" | "review";

// type Graph = G<TaskNode>;

class ChainMachineDAG<T> extends G<T> {
  /**
   * Removes the specified node from the graph along with all its connected edges
   *
   * @param nodeIdentity The identity string of the node to remove.
   */
  removeNodeAndConnectedEdges(nodeIdentity: string): void {
    if (!this.nodes.has(nodeIdentity)) {
      throw new Error(`Node with identity "${nodeIdentity}" does not exist.`);
    }

    // Remove connected edges
    for (let i = 0; i < this.adjacency.length; i++) {
      this.adjacency[i]?.splice(i, 1);
    }

    const nodeIndex = Array.from(this.nodes.keys()).indexOf(nodeIdentity);
    if (nodeIndex !== -1) {
      this.adjacency.splice(nodeIndex, 1);
    }

    // Remove the node
    this.nodes.delete(nodeIdentity);
  }

  toGraphData(): GraphData {
    const nodes: NodeObject[] = [];
    const links: LinkObject[] = [];

    // Iterate through all nodes and create NodeObjects
    this.nodes.forEach((value, key) => {
      nodes.push(Object.assign({ id: key }, value));
    });

    // Iterate through all adjacency entries and create LinkObjects
    this.adjacency.forEach((edges, sourceIndex) => {
      edges.forEach((edge, targetIndex) => {
        if (edge === 1) {
          links.push({
            source: this.getIdFromIndex(sourceIndex),
            target: this.getIdFromIndex(targetIndex),
          });
        }
      });
    });

    return { nodes, links };
  }

  private getIdFromIndex(index: number): string | undefined {
    let result;
    this.nodes.forEach((currentIndex, key, map) => {
      if (currentIndex === index) {
        result = key;
      }
    });
    return result;
  }

  addEdge(node1Identity: string, node2Identity: string): void {
    // const node1Index = Array.from(this.nodes.keys()).indexOf(node1Identity);
    // const node2Index = Array.from(this.nodes.keys()).indexOf(node2Identity);

    const node1 = this.nodes[node1Identity];
    const node2 = this.nodes[node2Identity];
    // if (node1Index === -1 || node2Index === -1) {
    //   throw new Error("At least one of the nodes does not exist.");
    // }
    if (!node1) {
      throw new Error(
        `addEdge: from node ${node1} does not exist (to node ${node2}).`,
      );
    }
    if (!node2) {
      throw new Error(
        `addEdge: to node ${node2} does not exist. (from node ${node1})`,
      );
    }
    // Initialize adjacency matrix if undefined
    if (!this.adjacency[node1Index]) {
      this.adjacency[node1Index] = [];
    }

    // Set the edge value in adjacency matrix
    this.adjacency[node1Index][node2Index] = 1;
  }
}
type Graph = ChainMachineDAG<TaskNode>;

export interface Task {
  id: string;
  type: NodeType;
  name: string;
  execute: () => Promise<ExecutionResult>;
  cancel: (graph: Graph) => Graph;
  addChild: (nodeName: string, graph: Graph) => Promise<Graph>;
}

export interface Review extends Task {
  targetNode: Task;
}

export interface ExecutionResult {
  success: boolean;
  message?: string;
}

export interface TaskNode {
  type: "plan" | "task" | "review";
  id: string;
  name: string;
  task: string;
  execution?: () => Promise<ExecutionResult>;
}

// helpers

const getRandomTasks = (maxTasks: number = 5) => {
  const randomCount = Math.floor(Math.random() * maxTasks);
  return Array.from(
    { length: randomCount },
    () => `task-${crypto.randomUUID().split("-")[1]}`,
  );
};

export const createExecution =
  (node: TaskNode) => async (): Promise<ExecutionResult> => {
    // if (node.type === "review") {
    //   const isSuccess = Math.random() > 0.15; // 15% chance of failure
    //   if (!isSuccess) {
    //     return { success: false, message: "Review failed" };
    //   }
    // }
    return { success: true };
  };

const ChainMachine: React.FC = () => {
  const [dag, setDag] = useState(new ChainMachineDAG<TaskNode>());
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  }); // Added new function for adding child nodes
  const addChild = async (
    nodeName: string,
    graph: Graph,
    parentId: string,
  ): Promise<Graph> => {
    const childNode: TaskNode = {
      id: nodeName,
      name: nodeName,
      type: "task",
      task: `Task for ${nodeName}`,
    };
    childNode.execution = createExecution(childNode);
    graph.insert(childNode);
    graph.addEdge(parentId, childNode.id);
    return graph;
  };

  const advanceSimulation = useCallback(async () => {
    const rootNode: TaskNode = {
      id: "root",
      name: "root",
      type: "plan",
      task: "come up w/ a plan for goal XYZ",
    };
    // Add root node and spawn random tasks
    let rootId = dag.upsert(rootNode);

    getRandomTasks().forEach((taskName) => addChild(taskName, dag, rootId));

    const tpSortedNodes = dag.topologicallySortedNodes();
    await processNodes(tpSortedNodes);

    setDag(dag);
    setGraphData(dag.toGraphData());
  }, [dag]);

  const processNodes = async (nodes: TaskNode[]) => {
    const executions = nodes.map(async (node) => {
      if (!node.execution) return;
      try {
        await node.execution();
        if (node.type === "review") {
          dag.removeNodeAndConnectedEdges(node.id);
        } else {
          const childNodeName = `child-${node.name}`;
          await addChild(childNodeName, dag, node.id);

          const reviewNode: TaskNode = {
            id: `review-${node.id}`,
            name: `review-${node.name}`,
            type: "review",
            task: `review-${node.task}`,
            execution: createExecution(node),
          };
          dag.upsert(reviewNode);
          dag.addEdge(childNodeName, reviewNode.id);
        }
      } catch (error) {
        console.error(error);
        // onCancel(node.id);
      }
    });

    await Promise.allSettled(executions);

    const remainingNodes = dag.topologicallySortedNodes();
    if (remainingNodes.length === 0) {
      onComplete();
      return;
    }

    // Traverse remaining nodes to check if all child nodes have been executed
    // remainingNodes.forEach((node) => {
    //   const childNodes = dag.adjacency.get(node.id);
    //   if (childNodes.length === 0) {
    //     onComplete(node);
    //   }
    // });
  };

  const onCancel = (nodeId: string) => {
    console.warn(`Node ${nodeId} canceled`);
    const dagClone = G.fromDirectedGraph<TaskNode>(dag) as Graph;
    dagClone.removeNodeAndConnectedEdges(nodeId);
    setDag(dagClone);
  };

  const onComplete = (node?: TaskNode) => {
    if (node) {
      console.log("Node completed:", node); // You may add custom logic when a node is completed
    } else {
      console.log("Simulation completed");
    }
  };

  return (
    <div>
      <Button onClick={advanceSimulation}>Advance Simulation</Button>
      <ForceTree data={graphData} />
    </div>
  );
};

export default ChainMachine;

// ChainMachine.tsx
// import React, { useCallback, useState } from "react";
// import { DirectedAcyclicGraph as G } from "typescript-graph";

// interface TaskNode {
//   name: string;
//   type: "plan" | "task" | "review";
//   execution?: () => Promise<any>;
// }

// export const createExecution = (node: TaskNode) => async () => {
//   if (node.type === "review") {
//     const isSuccess = Math.random() > 0.15; // 15% chance of failure
//     if (!isSuccess) {
//       throw new Error("Review failed");
//     }
//   }
//   return { result: "success" };
// };

// const ChainMachine: React.FC = () => {
//   const [dag, setDag] = useState(new Graph<TaskNode>());

//   const onAdvanceSimulation = useCallback(async () => {
//     const rootNode: TaskNode = { name: "root", type: "plan" };
//     const rootId = dag.insert(rootNode);
//     dag.topologicallySortedNodes().forEach(async (node) => {
//       if (node.execution) {
//         try {
//           await node.execution();
//           // onSuccess have custom logic to continue
//           if (node.type !== "review") {
//             const reviewNode: TaskNode = {
//               name: `review-${node.name}`,
//               type: "review",
//               execution: createExecution(node),
//             };
//             dag.insert(reviewNode);
//           }
//         } catch {
//           // onCancel() - Custom callback for cancel event
//           onCancel();
//         }
//       }
//     });
//     setDag(dag);
//   }, [dag]);

//   return (
//     <div>
//       <button onClick={onAdvanceSimulation}>Advance Simulation</button>
//     </div>
//   );
// };

// export default ChainMachine;
