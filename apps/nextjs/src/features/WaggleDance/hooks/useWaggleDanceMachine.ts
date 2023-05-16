// useWaggleDanceMachine.ts

import { useCallback, useState } from "react";

import { LLM, LLMTokenLimit } from "@acme/chain";

import WaggleDanceMachine from "../WaggleDanceMachine";
import { type GraphData } from "../types";

interface UseWaggleDanceMachineProps {
  goal: string;
  isSimulated?: boolean;
}
const useWaggleDanceMachine = ({
  goal,
}: // _isSimulated = false,
UseWaggleDanceMachineProps) => {
  // const [chainMachine] = useState(() =>
  //   isSimulated ? new ChainMachineSimulation() : new ChainMachine(),
  // );
  const [waggleDanceMachine] = useState(() => new WaggleDanceMachine());

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const run = useCallback(async () => {
    if (graphData.nodes.length === 0) {
      const gd = { ...graphData };
      gd.nodes = [{ id: `plan-${goal}` }];
      setGraphData(gd);
    }
    const result = await waggleDanceMachine.run({
      goal,
      creationProps: {
        modelName: LLM.smartLarge,
        temperature: 0,
        maxTokens: LLMTokenLimit(LLM.smartLarge), // TODO: make this === available tokens after prompt
        maxConcurrency: 6,
        streaming: true,
        verbose: true,
      },
    });

    console.log("waggleDanceMachine.run result", result);

    if (result instanceof Error) {
      console.error("Error in WaggleDanceMachine's run:", result);
      return;
    }

    // result.results;

    // const computedGraphData = dagToGraphData(result);
    // setGraphData((prevGraphData) => {
    //   return { ...prevGraphData, ...computedGraphData };
    // });

    console.log("result", result);
    return result;
  }, [goal, graphData, setGraphData, waggleDanceMachine]);

  return { chainMachine: waggleDanceMachine, graphData, run };
};

export default useWaggleDanceMachine;
