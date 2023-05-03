import { useState } from "react";

import { LLM } from "@acme/chain";

import WaggleDanceMachine from "../WaggleDanceMachine";
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
  const [waggleDanceMachine] = useState(() => new WaggleDanceMachine());

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
    const result = await waggleDanceMachine.run(
      goal,
      {
        // customApiKey: string;
        modelName: LLM.gpt3_5_turbo,
        temperature: 0,
        // customMaxLoops: number;
        maxTokens: 400,
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
    return result;
  };

  return { chainMachine: waggleDanceMachine, graphData, run };
};

export default useChainMachine;
