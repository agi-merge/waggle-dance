// useWaggleDanceMachine.ts

import { useCallback, useState } from "react";

import { LLM, LLMTokenLimit } from "@acme/chain";

import WaggleDanceMachine from "../WaggleDanceMachine";
import { type GraphData } from "../components/ForceGraph";

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
    const result = await waggleDanceMachine.run(
      {
        goal,
        creationProps: {
          modelName: LLM.smartLarge,
          temperature: 0,
          maxTokens: LLMTokenLimit(LLM.smartLarge), // TODO: make this === available tokens after prompt
          maxConcurrency: 6,
          streaming: true,
          verbose: true,
        },
      },
      [graphData, setGraphData],
    );

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
