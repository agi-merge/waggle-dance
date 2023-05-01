import { useEffect, useState } from "react";
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

type NodeType = "plan" | "taskReview";

interface AgenticAIModel {
  name: string;
  type: NodeType;
  execution: () => Promise<Task>;
}

export function useSimulation() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    simulate().then((graph) => {
      const data = graphToGraphData(graph);
      setGraphData(data);
    });
  }, []);

  async function simulate(): Promise<DirectedAcyclicGraph<AgenticAIModel>> {
    const root = {
      name: "root",
      type: "plan" as NodeType,
      execution: async () => {
        const childTask: Task = { name: "task1" };
        return childTask;
      },
    };

    const graph = new DirectedAcyclicGraph<AgenticAIModel>();
    const rootNodeId = graph.insert(root);
    await executeNode(graph, rootNodeId, root);

    return graph;
  }

  async function executeNode(
    graph: DirectedAcyclicGraph<AgenticAIModel>,
    nodeId: string,
    node: AgenticAIModel,
  ) {
    if (node.type !== "taskReview") {
      const reviewNode: AgenticAIModel = {
        name: `review-${node.name}`,
        type: "taskReview",
        execution: async () => {
          // Simulate a 15% chance of failing
          if (Math.random() <= 0.15) {
            throw new Error("Review task failed");
          }
          return { name: node.name };
        },
      };

      const reviewNodeId = graph.insert(reviewNode);
      graph.addEdge(nodeId, reviewNodeId);

      try {
        await executeNode(graph, reviewNodeId, reviewNode);
      } catch (error) {
        // Handle late cancellation of the node and its child nodes
        handleCancellation(graph, nodeId, node, error);
      }
    }

    const result = await node.execution();

    if (node.type === "plan") {
      const childNode: AgenticAIModel = {
        name: result.name,
        type: "taskReview",
        execution: async () => {
          // Simulate a 15% chance of failing
          if (Math.random() <= 0.15) {
            throw new Error("Review task failed");
          }
          return result;
        },
      };

      const childNodeId = graph.insert(childNode);
      graph.addEdge(nodeId, childNodeId);
      await executeNode(graph, childNodeId, childNode);
    }
  }

  function handleCancellation(
    graph: DirectedAcyclicGraph<AgenticAIModel>,
    nodeId: string,
    node: AgenticAIModel,
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

  function graphToGraphData(
    graph: DirectedAcyclicGraph<AgenticAIModel>,
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
          .edgesFromNode(graph.nodeIdentity(node))
          .map((edge) => ({ source: node, target: edge.target })),
      );

    const links = edges.map<LinkObject>((edge) => ({
      source: nodeMap.get(edge.source.name) as string | number | NodeObject,
      target: nodeMap.get(edge.target.name) as string | number | NodeObject,
    }));

    return { nodes, links };
  }

  return graphData;
}
