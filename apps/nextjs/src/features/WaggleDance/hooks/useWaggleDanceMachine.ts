// useWaggleDanceMachine.ts

import { useCallback, useEffect, useState } from "react";

import { LLM, llmResponseTokenLimit } from "@acme/chain";

import DAG from "../DAG";
import WaggleDanceMachine from "../WaggleDanceMachine";
import { type GraphData } from "../components/ForceGraph";
import { dagToGraphData } from "../utils/conversions";

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

  const [dag, setDAG] = useState<DAG>(new DAG([], [], { predicate: "", params: {} }, { predicate: "", params: {} }));

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    setGraphData(dagToGraphData(dag));
  }, [dag]);

  const run = useCallback(async () => {
    const maxTokens = llmResponseTokenLimit(LLM.smart)
    const result = await waggleDanceMachine.run(
      {
        goal,
        creationProps: {
          modelName: LLM.smart,
          temperature: 0,
          maxConcurrency: 6,
          maxTokens,
          streaming: true,
          verbose: true,
        },
      },
      [dag, setDAG],
    );

    console.log("waggleDanceMachine.run result", result);

    if (result instanceof Error) {
      console.error("Error in WaggleDanceMachine's run:", result);
      return;
    }

    console.log("result", result);
    return result;
  }, [goal, dag, setDAG, waggleDanceMachine]);

  return { chainMachine: waggleDanceMachine, dag, graphData, run };
};

export default useWaggleDanceMachine;
