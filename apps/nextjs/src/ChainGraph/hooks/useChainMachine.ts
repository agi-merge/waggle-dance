import { useState } from "react";
import { CallbackManager } from "langchain/callbacks";

import { LLM } from "@acme/chain";

import { useAppContext } from "~/pages/_app";
import ChainMachine from "../ChainMachine";
// import ChainMachineSimulation from "../ChainMachineSimulation";
import { LinkObject, NodeObject } from "../components/ForceGraph";
import { GraphData } from "../types";

interface UseChainMachineProps {
  goal: string;
  isSimulated?: boolean;
}
const useChainMachine = ({
  goal,
  isSimulated: boolean = false,
}: UseChainMachineProps) => {
  // const [chainMachine] = useState(() =>
  //   isSimulated ? new ChainMachineSimulation() : new ChainMachine(),
  // );
  const [chainMachine] = useState(() => new ChainMachine());

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const run = async () => {
    if (graphData.nodes.length === 0) {
      var gd = graphData;
      gd.nodes = [{ id: `plan-${goal}` }];
      setGraphData(gd);
    }
    const result = await chainMachine.run(
      goal,
      {
        // customApiKey: string;
        modelName: LLM.gpt4,
        temperature: 0,
        // customMaxLoops: number;
        maxTokens: 1024,
        streaming: true,
        // callbacks?: CallbackManager;
        verbose: true,
      },
      {
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
      },
    );
  };

  return { chainMachine, graphData, run };
};

export default useChainMachine;
