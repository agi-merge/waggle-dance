// useWaggleDanceMachine.ts

import { useCallback, useEffect, useMemo, useState } from "react";

import { type ChainPacket, LLM, llmResponseTokenLimit } from "@acme/chain";

import DAG from "../DAG";
import WaggleDanceMachine, { initialEdges, initialNodes } from "../WaggleDanceMachine";
import { type GraphData } from "../components/ForceGraph";
import { dagToGraphData } from "../utils/conversions";
import useApp from "~/stores/appStore";
import { useDebounce } from "use-debounce";

interface UseWaggleDanceMachineProps {
  goal: string;
}

export type LogMessage = {
  message: string;
  type: "info" | "error";
  timestamp: Date;
};

type TaskState = {
  id: string;
  act: string;
  params: object;
  name: string;
  status: string;
  result: string | null;
};

function reduceTaskStates(
  logMessages: LogMessage[],
  chainPackets: ChainPacket[],
  dag: DAG
): TaskState[] {
  const taskStates: Record<string, TaskState> = {};

  // Initialize taskStates from DAG nodes
  dag.nodes.forEach((node) => {
    taskStates[node.id] = {
      id: node.id,
      act: node.act,
      params: node.params,
      name: node.name,
      status: "idle",
      result: null,
    };
  });

  // Update taskStates with LogMessages
  logMessages.forEach((logMessage) => {
    const nodeIdPattern = /task (\w+) -/i;
    const match = logMessage.message.match(nodeIdPattern);
    if (match && match[1] && taskStates[match[1]]) {
      taskStates[match[1]].status = logMessage.type;
    }
  });

  // Update taskStates with ChainPackets
  chainPackets.forEach((chainPacket) => {
    if (chainPacket.type === "return" && taskStates[chainPacket.nodeId]) {
      taskStates[chainPacket.nodeId].status = "completed";
      taskStates[chainPacket.nodeId].result = chainPacket.value;
    }
    if (chainPacket.type === "error" && taskStates[chainPacket.nodeId]) {
      taskStates[chainPacket.nodeId].status = "error";
    }
  });

  return Object.values(taskStates);
}

const useWaggleDanceMachine = ({
  goal,
}:
  UseWaggleDanceMachineProps) => {
  const [waggleDanceMachine] = useState(() => new WaggleDanceMachine());
  const { isRunning } = useApp();
  const [dag, setDAG] = useState<DAG>(new DAG([], []));
  const [isDonePlanning, setIsDonePlanning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [chainPackets, setChainPackets] = useState<ChainPacket[]>([]);

  const taskStates = useMemo(() => {
    return { logs, chainPackets, dag }
  }, [logs, chainPackets, dag]);
  const [debouncedTaskStates, _state] = useDebounce(taskStates, 250);

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
      [chainPackets, setChainPackets],
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
  }, [goal, dag, setDAG, waggleDanceMachine, isRunning, setIsDonePlanning, log, chainPackets, setChainPackets]);

  return { waggleDanceMachine, dag, graphData, run, setIsDonePlanning, isDonePlanning, logs };
};

export default useWaggleDanceMachine;
