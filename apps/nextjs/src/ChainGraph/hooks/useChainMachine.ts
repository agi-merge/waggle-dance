import { useState } from "react";

import ChainMachine from "../ChainMachine";
import ChainMachineSimulation from "../ChainMachineSimulation";
// import ChainMachineSimulation from "../ChainMachineSimulation";
import { LinkObject, NodeObject } from "../components/ForceGraph";
import { GraphData } from "../types";

const useChainMachine = (isSimulated: boolean = false) => {
  const [chainMachine] = useState(() =>
    isSimulated ? new ChainMachineSimulation() : new ChainMachine(),
  );

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const run = async () => {
    const result = await chainMachine.run({
      onTaskCreated: (newNode: NodeObject, newLink?: LinkObject) => {
        setGraphData((prevGraphData) => ({
          nodes: [...prevGraphData.nodes, newNode],
          links: newLink
            ? [...prevGraphData.links, newLink]
            : prevGraphData.links,
        }));
      },
      onReviewFailure: (target: string, error: Error) => {
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

  return { chainMachine, graphData, run };
};

export default useChainMachine;
