import { useState } from "react";

import { LLM } from "@acme/chain";

import WaggleDanceMachine from "../WaggleDanceMachine";
// import ChainMachineSimulation from "../ChainMachineSimulation";
import { type LinkObject, type NodeObject } from "../components/ForceGraph";
import { type GraphData } from "../types";

interface UseChainMachineProps {
  goal: string;
  isSimulated?: boolean;
}
const useChainMachine = ({
  goal,
}: // _isSimulated = false,
UseChainMachineProps) => {
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
      const gd = graphData;
      gd.nodes = [{ id: `plan-${goal}` }];
      setGraphData(gd);
    }
    const result = await waggleDanceMachine.run({
      goal,
      creationProps: {
        modelName: LLM.smartLarge,
        temperature: 0,
        maxTokens: 1000, // TODO: make this === available tokens after prompt
        maxConcurrency: 6,
        streaming: true,
        verbose: true,
      },
    });
    console.log("result", result);
    // const graphData = dagToGraphData((result as WaggleDanceResult).results[0]);
    // setGraphData((prevGraphData) => {
    //   graphData;
    // });
    return result;
  };

  return { chainMachine: waggleDanceMachine, graphData, run };
};

export default useChainMachine;
