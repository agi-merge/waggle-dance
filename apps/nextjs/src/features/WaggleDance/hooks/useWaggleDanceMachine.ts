// useWaggleDanceMachine.ts

import { useCallback, useEffect, useState } from "react";

import { LLM, llmResponseTokenLimit } from "@acme/chain";

import DAG from "../DAG";
import WaggleDanceMachine, { initialEdges, initialNodes } from "../WaggleDanceMachine";
import { type GraphData } from "../components/ForceGraph";
import { dagToGraphData } from "../utils/conversions";
import useApp from "~/stores/appStore";

interface UseWaggleDanceMachineProps {
  goal: string;
}

export type LogMessage = {
  message: string;
  type: "info" | "error";
  timestamp: Date;
};

const useWaggleDanceMachine = ({
  goal,
}:
  UseWaggleDanceMachineProps) => {
  const [waggleDanceMachine] = useState(() => new WaggleDanceMachine());
  const { isRunning } = useApp();
  const [dag, setDAG] = useState<DAG>(new DAG([], []));
  const [isDonePlanning, setIsDonePlanning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);


  const log = useCallback((...args: (string | number | object)[]) => {
    const message = args.map((arg) => {
      if (arg as string) {
        return arg as string;
      } else {
        return JSON.stringify(arg)
      }
    }).join(", ");

    console.log("logs", logs.length);
    const newLogs = logs
    newLogs.push({ message, type: "info", timestamp: new Date() })
    setLogs(newLogs);
    console.log("logs", newLogs.length);

    // Log to the console (optional)
    console.log(message);
  }, [setLogs, logs])

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    setGraphData(dagToGraphData(dag));
  }, [dag]);

  const run = useCallback(async () => {
    const maxTokens = llmResponseTokenLimit(LLM.smart)

    setDAG(new DAG(initialNodes(goal, LLM.smart), initialEdges()/*, initialCond, initialCond*/));

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
      log,
      isRunning,
    );

    console.log("waggleDanceMachine.run result", result);

    if (result instanceof Error) {
      console.error("Error in WaggleDanceMachine's run:", result);
      return;
    }

    console.log("result", result);
    return result;
  }, [goal, dag, setDAG, waggleDanceMachine, isRunning, setIsDonePlanning, log]);

  return { waggleDanceMachine, dag, graphData, run, setIsDonePlanning, isDonePlanning, logs };
};

export default useWaggleDanceMachine;
