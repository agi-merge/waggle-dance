// useWaggleDanceMachine.ts

import { useCallback, useEffect, useMemo, useState } from "react";

import { type ChainPacket, LLM, llmResponseTokenLimit } from "@acme/chain";

import DAG, { type DAGNode } from "../DAG";
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

export enum TaskStatus {
  idle = "idle",
  work = "work",
  done = "done",
  wait = "wait",
  error = "error",
}

export type TaskState = DAGNode & {
  status: string;
  result: string | null;
  packets: ChainPacket[];
};

const useWaggleDanceMachine = ({
  goal,
}: UseWaggleDanceMachineProps) => {
  const [waggleDanceMachine] = useState(() => new WaggleDanceMachine());
  const { isRunning } = useApp();
  const [dag, setDAG] = useState<DAG>(new DAG([], []));
  const [isDonePlanning, setIsDonePlanning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [chainPackets, setChainPackets] = useState<Record<string, TaskState>>({});

  const mapPacketTypeToStatus = (packetType: string): TaskStatus => {
    switch (packetType) {
      case "handleLLMNewToken":
      case "handleLLMStart":
      case "handleChainStart":
      case "handleToolStart":
      case "handleAgentAction":
        return TaskStatus.work;
      case "return":
        return TaskStatus.done;
      case "error":
        return TaskStatus.error;
      case "scheduled":
        return TaskStatus.work;
      case "requestHumanInput":
        return TaskStatus.wait;
      default:
        return TaskStatus.idle;
    }
  };

  const reduceTaskStates = useCallback(
    (dagNodes: DAGNode[]): TaskState[] => {
      return dagNodes.map(node => ({
        ...node,
        status: chainPackets[node.id]?.status ?? TaskStatus.idle,
        result: chainPackets[node.id]?.result ?? null,
        packets: chainPackets[node.id]?.packets ?? [],
      }));
    },
    [chainPackets]
  );

  const taskStates = useMemo(() => {
    return reduceTaskStates(dag.nodes);
  }, [dag, reduceTaskStates]);

  const log = useCallback(
    (...args: (string | number | object)[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === "string") {
            return arg;
          } else {
            return JSON.stringify(arg);
          }
        })
        .join(", ");

      setLogs((prevLogs) => [
        ...prevLogs,
        { message, type: "info", timestamp: new Date() },
      ]);

      // Log to the console (optional)
      console.log(message);
    },
    [setLogs]
  );

  const sendChainPacket = useCallback((chainPacket: ChainPacket, node: DAGNode) => {
    const existingTask = chainPackets[chainPacket.nodeId];
    if (!existingTask) {
      if (!node) {
        log(`Warning: node ${chainPacket.nodeId} not found in the dag during state update`);
        return;
      } else {
        const newChainPackets = {
          ...chainPackets,
          [chainPacket.nodeId]: {
            ...node,
            status: TaskStatus.idle,
            result: null,
            packets: [chainPacket],
          },
        };
        console.log("newChainPackets1", newChainPackets)
        setChainPackets(newChainPackets);
      }
    } else {
      let updatedTask
      if (existingTask.packets) {
        updatedTask = {
          ...existingTask,
          status: mapPacketTypeToStatus(chainPacket.type),
          result: chainPacket.type === "return" ? chainPacket.value : chainPacket.type === "error" ? chainPacket.message : null,
          packets: [...existingTask.packets, chainPacket],
        };
      } else {
        // Handle the case where existingTask.packets is undefined
        updatedTask = {
          ...existingTask,
          status: mapPacketTypeToStatus(chainPacket.type),
          result: chainPacket.type === "return" ? chainPacket.value : chainPacket.type === "error" ? chainPacket.message : null,
          packets: [chainPacket],
        };
      }

      const newChainPackets = {
        ...chainPackets,
        [chainPacket.nodeId]: updatedTask,
      };
      console.log("newChainPackets", newChainPackets)
      setChainPackets(newChainPackets);
    }
  }, [chainPackets, setChainPackets, log]);

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
          verbose: false,
        },
      },
      [dag, setDAG],
      [isDonePlanning, setIsDonePlanning],
      sendChainPacket,
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
  }, [goal, dag, setDAG, waggleDanceMachine, isRunning, setIsDonePlanning, log, isDonePlanning, sendChainPacket]);

  return { waggleDanceMachine, dag, graphData, run, setIsDonePlanning, isDonePlanning, logs, taskStates };
};

export default useWaggleDanceMachine;
