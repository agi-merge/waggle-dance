import { useState } from "react";

import TaskSimulation from "../TaskSimulation";
import { LinkObject, NodeObject } from "../components/ForceGraph";
import { GraphData } from "../types";

const useTaskSimulation = () => {
  const [simulation] = useState(() => new TaskSimulation());
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const runSimulation = async () => {
    const result = await simulation.runSimulation({
      onTaskCreated: (newNode: NodeObject, newLink?: LinkObject) => {
        setGraphData((prevGraphData) => ({
          nodes: [...prevGraphData.nodes, newNode],
          links: newLink
            ? [...prevGraphData.links, newLink]
            : prevGraphData.links,
        }));
      },
      onReviewFailure: (target: string) => {
        setGraphData((prevGraphData) => {
          const newNodes = prevGraphData.nodes.filter(
            (node) => node.id !== target,
          );
          const newLinks = prevGraphData.links.filter(
            (link) => link.source !== target && link.target !== target,
          );
          return { nodes: newNodes, links: newLinks };
        });
      },
    });
  };

  return { simulation, graphData, runSimulation };
};

export default useTaskSimulation;
