// useWaggleDanceMachine.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { stringify } from "yaml";

import { type DraftExecutionNode, type ExecutionPlusGraph } from "@acme/db";

import { api } from "~/utils/api";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import {
  initialNodes,
  rootPlanId,
  TaskState,
  TaskStatus,
  type AgentPacket,
} from "../../../../../../packages/agent";
import { type GraphData } from "../components/ForceGraph";
import { type WaggleDanceResult } from "../types/types";
import { dagToGraphData } from "../utils/conversions";
import { runWaggleDanceMachine } from "../WaggleDanceMachine";

export type LogMessage = {
  message: string;
  type: "info" | "error";
  timestamp: Date;
};

const useWaggleDanceMachine = () => {
  const { setIsRunning, agentSettings, execution, graph, setGraph } =
    useWaggleDanceMachineStore();
  const { selectedGoal: goal } = useGoalStore();

  const { mutate: updateExecutionState } =
    api.execution.updateState.useMutation({
      onSettled: () => {},
    });

  const results = useMemo(() => {
    return (
      execution?.results?.map((r) => {
        const result = r.value as AgentPacket;

        const taskState = new TaskState({
          ...r,
          packets: r.packets as AgentPacket[],
          value: result,
          id: r.nodeId,
        });

        return taskState;
      }) || []
    );
  }, [execution?.results]);

  const resultsMap = useMemo(() => {
    const resultsMap =
      results?.reduce(
        (acc: Record<string, TaskState>, cur: TaskState) => {
          return { ...acc, [cur.id]: cur };
        },
        {} as Record<string, TaskState>,
      ) || {};
    console.debug("resultsMap", resultsMap);
    return resultsMap;
  }, [results]);

  const [agentPacketsMap, setAgentPackets] =
    useState<Record<string, TaskState>>(resultsMap);

  const taskStates: TaskState[] = useMemo(() => {
    const taskStates = graph.nodes.map((dagNode) => {
      const taskStateB = resultsMap[dagNode.id] ?? agentPacketsMap[dagNode.id];
      // console.log("dagNode", dagNode.id, "taskStateB", taskStateB?.id);
      // Object.values(agentPacketsMap).find((ts) => ts.nodeId === taskStateA.id);
      const updatedAt = new Date();
      const merged = {
        id: taskStateB?.id ?? dagNode.id,
        packets: taskStateB?.packets ?? [],
        value: taskStateB?.value ?? {
          type: "idle",
          nodeId: taskStateB?.nodeId ?? dagNode.id ?? "",
        },
        nodeId: taskStateB?.nodeId ?? dagNode.id,
        updatedAt: updatedAt,
      };
      return new TaskState(merged);
    });
    console.debug("taskStates", taskStates);
    return taskStates || Object.values(resultsMap);
  }, [graph, resultsMap, agentPacketsMap]);

  const sortedTaskStates = useMemo(() => {
    const sortedTaskStates = taskStates.sort((a: TaskState, b: TaskState) => {
      const aid = a.nodeId;
      const bid = b.nodeId;
      // console.debug("aid", aid, "bid", bid);
      if (aid === rootPlanId) {
        return -1;
      }
      if (bid === rootPlanId) {
        return 1;
      }
      if (aid === rootPlanId) {
        return -1;
      }
      if (bid === rootPlanId) {
        return 1;
      }
      if (a.status === b.status) {
        // Split the IDs into parts and parse them into numbers
        const aIdParts = aid.split("-").map(Number);
        const bIdParts = bid.split("-").map(Number);

        // Compare the parts
        for (let i = 0; i < aIdParts.length && i < bIdParts.length; i++) {
          if (aIdParts[i] !== bIdParts[i]) {
            return (aIdParts[i] ?? 0) - (bIdParts[i] ?? 0); // Wrap the subtraction in parentheses
          }
        }

        // If all parts are equal, the one with fewer parts should come first
        return aIdParts.length - bIdParts.length;
      }
      if (a.status === TaskStatus.done) return -1;
      if (b.status === TaskStatus.done) return 1;
      if (a.status === TaskStatus.error) return -1;
      if (b.status === TaskStatus.error) return 1;
      if (a.status === TaskStatus.working) return -1;
      if (b.status === TaskStatus.working) return 1;
      if (a.status === TaskStatus.starting) return -1;
      if (b.status === TaskStatus.starting) return 1;
      if (a.status === TaskStatus.idle) return -1;
      if (b.status === TaskStatus.idle) return 1;
      // unhandled use alphabetical
      return 1;
    });
    console.debug("sortedTaskStates", sortedTaskStates);
    return sortedTaskStates;
  }, [taskStates]);

  useEffect(() => {
    setAgentPackets(resultsMap);
  }, [resultsMap]);

  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [abortController, setAbortController] = useState(
    () => new AbortController(),
  );
  const [isDonePlanning, setIsDonePlanning] = useState(false);

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
    [setLogs],
  );

  // Since agents stream packets, as well as return packets as their final result, we need to pass this callback around so that we can update state
  const injectAgentPacket = useCallback(
    (agentPacket: AgentPacket, node: DraftExecutionNode) => {
      if (!node || !node.id) {
        throw new Error("a node does not exist to receive data");
      }
      const existingTask = resultsMap[node.id];
      if (!existingTask) {
        if (!node) {
          log(
            `Warning: node not found in the dag during chain packet update: ${agentPacket.type}`,
          );
          return;
        } else {
          // its for a brand new task
          const taskState = new TaskState({
            ...node,
            packets: [agentPacket] as AgentPacket[],
            value: agentPacket,
            updatedAt: new Date(),
            nodeId: node.id,
          });

          setAgentPackets((prevAgentPackets) => ({
            ...prevAgentPackets,
            [node.id]: taskState,
          }));
        }
      } else {
        // append to existing packets
        const updatedTask = new TaskState({
          ...existingTask,
          value: agentPacket,
          packets: [...existingTask.packets, agentPacket],
          updatedAt: new Date(),
        });
        setAgentPackets((prevAgentPackets) => ({
          ...prevAgentPackets,
          [node.id]: updatedTask,
        }));
      }
    },
    [resultsMap, log],
  );

  const reset = useCallback(() => {
    console.warn("resetting waggle dance machine");
    setIsDonePlanning(false);
    setGraph(
      {
        nodes: initialNodes(goal?.prompt ?? ""),
        edges: [],
        executionId: execution?.id ?? "",
      },
      goal?.prompt ?? "",
    );
    setAgentPackets({});
  }, [execution?.id, goal?.prompt, setGraph]);

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    setGraphData(dagToGraphData(graph, results));
  }, [graph, results, setGraphData]);

  const stop = useCallback(() => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  }, [abortController]);

  // main entrypoint
  const run = useCallback(
    async (execution: ExecutionPlusGraph) => {
      const ac = new AbortController();
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      setAbortController(ac);
      reset();

      const prompt = goal?.prompt;
      if (!prompt) {
        throw new Error("Prompt not set");
      }

      const goalId = goal?.id;
      if (!prompt || !goalId) {
        throw new Error("Goal not set");
      }

      const executionId = execution?.id;
      if (!executionId) {
        throw new Error("Execution not set");
      }

      let result: WaggleDanceResult | Error;
      try {
        result = await runWaggleDanceMachine({
          goal: prompt,
          goalId,
          executionId,
          agentSettings,
          graphDataState: [graph, setGraph],
          isDonePlanningState: [isDonePlanning, setIsDonePlanning],
          injectAgentPacket,
          log,
          abortController: ac,
        });
      } catch (error) {
        if (error instanceof Error) {
          result = error;
        } else {
          result = new Error(`Unknown error ${JSON.stringify(error)}`);
        }
      }

      console.log("waggleDanceMachine.run result", result);

      setIsRunning(false);
      if (!ac.signal.aborted) {
        ac.abort();
      }

      if (result instanceof Error) {
        console.error("Error in WaggleDanceMachine's run:", result);
        updateExecutionState({ executionId, state: "ERROR" });
        return;
      } else {
        console.log("result", result);
        const res = result.taskResults;
        res ? setAgentPackets(res) : undefined;
        updateExecutionState({ executionId, state: "DONE" });
        return result;
      }
    },
    [
      abortController,
      reset,
      goal?.prompt,
      goal?.id,
      setIsRunning,
      agentSettings,
      graph,
      setGraph,
      isDonePlanning,
      injectAgentPacket,
      log,
      updateExecutionState,
    ],
  );

  return {
    dag: graph,
    graphData,
    stop,
    run,
    reset,
    isDonePlanning,
    logs,
    agentPacketsMap,
    results,
    resultsMap,
    sortedTaskStates,
  };
};

export default useWaggleDanceMachine;
