// useWaggleDanceMachine.ts

import { useCallback, useEffect, useState } from "react";

import { LLM, llmResponseTokenLimit } from "@acme/chain";

import DAG from "../DAG";
import WaggleDanceMachine, { initialCond, initialEdges, initialNodes } from "../WaggleDanceMachine";
import { type GraphData } from "../components/ForceGraph";
import { dagToGraphData } from "../utils/conversions";
import useApp from "~/stores/appStore";

interface UseWaggleDanceMachineProps {
  goal: string;
}
const useWaggleDanceMachine = ({
  goal,
}:
  UseWaggleDanceMachineProps) => {
  const [waggleDanceMachine] = useState(() => new WaggleDanceMachine());
  const { isRunning } = useApp();
  const [dag, setDAG] = useState<DAG>(new DAG([], [], initialCond, initialCond));
  const [isDonePlanning, setIsDonePlanning] = useState(false);

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    setGraphData(dagToGraphData(dag));
  }, [dag]);

  const run = useCallback(async () => {
    const maxTokens = llmResponseTokenLimit(LLM.smart)

    setDAG(new DAG(initialNodes(goal, LLM.smart), initialEdges(), initialCond, initialCond));

    const result = await waggleDanceMachine.run(
      {
        goal,
        creationProps: {
          modelName: LLM.smart,
          temperature: 0,
          maxTokens,
          maxConcurrency: 16,
          streaming: true,
          verbose: process.env.NODE_ENV === "development",
        },
      },
      [dag, setDAG],
      [false, setIsDonePlanning],
      isRunning,
    );

    console.log("waggleDanceMachine.run result", result);

    if (result instanceof Error) {
      console.error("Error in WaggleDanceMachine's run:", result);
      return;
    }

    console.log("result", result);
    return result;
  }, [goal, dag, setDAG, waggleDanceMachine, isRunning, setIsDonePlanning]);

  return { waggleDanceMachine, dag, graphData, run, setIsDonePlanning, isDonePlanning };
};

export default useWaggleDanceMachine;
