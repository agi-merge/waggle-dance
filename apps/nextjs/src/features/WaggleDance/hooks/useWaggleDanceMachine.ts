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
  working = "working",
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
        return TaskStatus.working;
      case "done":
        return TaskStatus.done;
      case "error":
        return TaskStatus.error;
      case "working":
        return TaskStatus.working;
      case "requestHumanInput":
        return TaskStatus.wait;
      default:
        return TaskStatus.idle;
    }
  };

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

  const taskStates = useMemo(() => {
    const reduceTaskStates = (dagNodes: DAGNode[], chainPackets: Record<string, TaskState>): TaskState[] => {
      return dagNodes.map(node => {
        const chainPacket = chainPackets[node.id]
        const packets = chainPacket?.packets ?? []
        const status = packets[packets.length - 1]?.type ?? "idle"
        const result = chainPacket?.result ?? null
        return {
          ...node,
          status,
          result,
          packets,
        }
      });
    };
    const taskStates = reduceTaskStates(dag.nodes, chainPackets);
    return taskStates;
  }, [chainPackets, dag.nodes]);

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
        log("newChainPackets1", newChainPackets)
        setChainPackets((prevChainPackets) => ({
          ...prevChainPackets,
          [chainPacket.nodeId]: {
            ...node,
            status: TaskStatus.idle,
            result: null,
            packets: [chainPacket],
          },
        }));
        log("After setChainPackets:", chainPackets);
      }
    } else {
      const updatedTask = {
        ...existingTask,
        status: mapPacketTypeToStatus(chainPacket.type),
        result: chainPacket.type === "done" ? chainPacket.value : chainPacket.type === "error" ? chainPacket.message : null,
        packets: [...existingTask.packets, chainPacket],
      } as TaskState;

      const newChainPackets = {
        ...chainPackets,
        [chainPacket.nodeId]: updatedTask,
      };
      log("newChainPackets", newChainPackets)
      setChainPackets((prevChainPackets) => ({
        ...prevChainPackets,
        [chainPacket.nodeId]: updatedTask,
      }));
      log("After setChainPackets:", chainPackets);
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

    if (!isDonePlanning) {
      setDAG(new DAG(initialNodes(goal, LLM.smart), initialEdges()));
    }
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
