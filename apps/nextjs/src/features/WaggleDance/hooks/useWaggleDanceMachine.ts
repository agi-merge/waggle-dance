// useWaggleDanceMachine.ts

import { useCallback, useEffect, useMemo, useState } from "react";

import { type ChainPacket, LLM, llmResponseTokenLimit } from "@acme/chain";

import DAG, { type DAGNode } from "../DAG";
import WaggleDanceMachine, { initialEdges, initialNodes } from "../WaggleDanceMachine";
import { type GraphData } from "../components/ForceGraph";
import { dagToGraphData } from "../utils/conversions";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import { env } from "~/env.mjs";
import { stringify } from "yaml";
import { type GoalPlusExe } from "~/stores/goalStore";

interface UseWaggleDanceMachineProps {
  goal: GoalPlusExe | undefined;
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
  const [waggleDanceMachine] = useState(new WaggleDanceMachine());
  const { isRunning, setIsRunning, temperatureOption, llmOption, executionMethod } = useWaggleDanceMachineStore();
  const [dag, setDAG] = useState<DAG>(new DAG([], []));
  const [isDonePlanning, setIsDonePlanning] = useState(false);
  const [taskResults, setTaskResults] = useState<Record<string, TaskState>>({});
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [chainPackets, setChainPackets] = useState<Record<string, TaskState>>({});
  const [abortController, setAbortController] = useState<AbortController>(new AbortController());
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
            return stringify(arg);
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
        // log(`Warning: node ${chainPacket.nodeId} not found in the dag during state update`);
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
        setChainPackets((prevChainPackets) => ({
          ...prevChainPackets,
          [chainPacket.nodeId]: {
            ...node,
            status: TaskStatus.idle,
            result: chainPacket.type === "done" ? chainPacket.value : null,
            packets: [chainPacket],
          },
        }));
        console.log("After setChainPackets:", chainPackets);
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
      console.log("newChainPackets", newChainPackets)
      setChainPackets((prevChainPackets) => ({
        ...prevChainPackets,
        [chainPacket.nodeId]: updatedTask,
      }));
      console.log("After setChainPackets:", chainPackets);
    }
  }, [chainPackets, setChainPackets]);

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    setGraphData(dagToGraphData(dag, taskStates));
  }, [dag, taskStates, setGraphData]);

  const stop = useCallback(() => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  }, [abortController]);

  // main entrypoint
  const run = useCallback(async () => {
    setAbortController(new AbortController());

    const maxTokens = llmResponseTokenLimit(LLM.smart)

    if (!isDonePlanning) {
      setDAG(new DAG(initialNodes(goal?.prompt ?? "", LLM.smart), initialEdges()));
    }

    const prompt = goal?.prompt
    const goalId = goal?.id
    if (!prompt || !goalId) {
      throw new Error("Goal not set");
    }

    const result = await waggleDanceMachine.run(
      {
        goal: prompt,
        goalId,
        creationProps: {
          modelName: llmOption === LLM.smart ? LLM.smart : LLM.fast,
          temperature: temperatureOption === "Stable" ? 0 : temperatureOption === "Balanced" ? 0.4 : 0.9,
          maxTokens,
          maxConcurrency: 4,
          frequencyPenalty: 0.4,
          topP: 0.95,
          streaming: true,
          verbose: env.NEXT_PUBLIC_LANGCHAIN_VERBOSE === "true",
        },
      },
      [dag, setDAG],
      [isDonePlanning, setIsDonePlanning],
      sendChainPacket,
      log,
      executionMethod,
      isRunning,
      abortController.signal
    );

    console.log("waggleDanceMachine.run result", result);

    if (result instanceof Error) {
      console.error("Error in WaggleDanceMachine's run:", result);
      return;
    }

    console.log("result", result);
    setIsRunning(false);
    const res = result.results[0] as Record<string, TaskState>;
    res && setTaskResults(res)
    return result;
  }, [isDonePlanning, waggleDanceMachine, goal, llmOption, temperatureOption, dag, sendChainPacket, log, executionMethod, isRunning, abortController, setIsRunning]);

  return { waggleDanceMachine, dag, graphData, stop, run, setIsDonePlanning, isDonePlanning, logs, taskStates, taskResults };
};

export default useWaggleDanceMachine;
