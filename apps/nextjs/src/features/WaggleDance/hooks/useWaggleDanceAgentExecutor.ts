// features/WaggleDance/hooks/useWaggleDance.ts

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { isAbortError } from "next/dist/server/pipe-readable";
import { type GraphData } from "react-force-graph-2d";
import { v4 } from "uuid";
// import { type GraphData } from "../components/ForceGraph";
import { stringify } from "yaml";

import {
  getMostRelevantOutput,
  rootPlanId,
  rootPlanNode,
  TaskState,
  type AgentPacket,
} from "@acme/agent";
import { type DraftExecutionNode, type ExecutionPlusGraph } from "@acme/db";

import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import { api } from "~/utils/api";
import { type GraphDataState, type WaggleDanceResult } from "../types/types";
import WaggleDanceAgentExecutor from "../types/WaggleDanceAgentExecutor";
import { dagToGraphData } from "../utils/conversions";

export type LogMessage = {
  message: string;
  type: "info" | "error";
  timestamp: Date;
  id: string;
};

const useWaggleDanceAgentExecutor = () => {
  const { setIsRunning, agentSettings, execution, graph, setGraph } =
    useWaggleDanceMachineStore();
  const { setError } = useApp();

  const graphDataStateRef: MutableRefObject<GraphDataState> = useRef([
    graph,
    setGraph,
  ]);
  graphDataStateRef.current = [graph, setGraph];

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
          id: r.nodeId || v4(), // FIXME: is this ok?
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
      const taskStateB = agentPacketsMap[dagNode.id] ?? resultsMap[dagNode.id];
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
        artifactUrls: taskStateB?.artifactUrls ?? [],
      };
      return new TaskState(merged);
    });
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
      if (aid === bid) {
        return 1; // natural order maintained
      }
      if (!aid) {
        return -1;
      }
      if (!bid) {
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
      return 0;
    });
    return sortedTaskStates;
  }, [taskStates]);

  useEffect(() => {
    setAgentPackets(resultsMap);
  }, [resultsMap]);

  const [logs, _setLogs] = useState<LogMessage[]>([]);
  const [abortController, setAbortController] = useState(
    () => new AbortController(),
  );

  // TODO: either remove this or make it drastically more useful
  const log = useCallback((...args: (string | number | object)[]) => {
    const message = args
      .map((arg) => {
        if (typeof arg === "string") {
          return arg;
        } else {
          return stringify(arg);
        }
      })
      .join(", ");

    // _setLogs((prevLogs) => [
    //   ...prevLogs,
    //   { message, type: "info", timestamp: new Date(), id: v4() },
    // ]);

    // Log to the console (optional)
    console.debug(message);
  }, []);
  const injectAgentPacket = useCallback(
    (agentPacket: AgentPacket, node: DraftExecutionNode) => {
      if (!node || !node.id) {
        throw new Error("a node does not exist to receive data");
      }
      setAgentPackets((prevAgentPackets) => {
        const existingTask = prevAgentPackets[node.id] || resultsMap[node.id];

        log(
          `injectAgentPacket: ${existingTask?.value.type} -> ${agentPacket.type}`,
          JSON.stringify(agentPacket),
        );
        if (!existingTask) {
          // its for a brand new task
          const taskState = new TaskState({
            ...node,
            packets: [agentPacket] as AgentPacket[],
            value: agentPacket,
            updatedAt: new Date(),
            nodeId: node.id,
            artifactUrls: [],
          });

          return {
            ...prevAgentPackets,
            [node.id]: taskState,
          };
        } else {
          // append to existing packets
          const updatedTask = new TaskState({
            ...existingTask,
            value: agentPacket,
            packets: [...existingTask.packets, agentPacket],
            updatedAt: new Date(),
            artifactUrls: [],
          });
          return {
            ...prevAgentPackets,
            [node.id]: updatedTask,
          };
        }
      });
    },
    [log, resultsMap],
  );

  const reset = useCallback(() => {
    console.warn("resetting waggle dance machine");
    setGraph(
      {
        nodes: [rootPlanNode(goal?.prompt ?? "")],
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
    setGraphData(dagToGraphData(graph, agentPacketsMap));
  }, [graph, agentPacketsMap, setGraphData]);

  const stop = useCallback(() => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  }, [abortController]);

  // main entrypoint
  const run = useCallback(
    async (execution: ExecutionPlusGraph) => {
      const ac = new AbortController();
      // if (!abortController.signal.aborted) {
      //   abortController.abort();
      // }
      setAbortController(ac);

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
        const agentExecutor = new WaggleDanceAgentExecutor(
          agentSettings,
          goal.prompt,
          goalId,
          executionId,
          ac,
          graphDataStateRef,
          injectAgentPacket,
          log,
        );
        result = await agentExecutor.run();
        console.debug("result", result);
      } catch (error) {
        if (error instanceof Error) {
          result = error;
        } else {
          const packet = error as AgentPacket;
          if (packet) {
            result = new Error(getMostRelevantOutput(packet).output);
          } else {
            result = new Error(
              `Unexpected error ${stringify(
                error,
                Object.getOwnPropertyNames(error),
              )}`,
            );
          }
        }
      }

      console.debug("waggleDanceMachine.run result", result);

      setIsRunning(false);
      if (!ac.signal.aborted) {
        ac.abort();
      }

      if (isAbortError(result)) {
        console.error("Error in WaggleDanceMachine's run:", result);
        updateExecutionState({ executionId, state: "CANCELLED" });
        return;
      } else if (result instanceof Error) {
        console.error("Error in WaggleDanceMachine's run:", result);
        updateExecutionState({ executionId, state: "ERROR" });
        setError(result);
        return;
      } else {
        console.debug("result", result);
        result ? setAgentPackets(result) : undefined;
        updateExecutionState({ executionId, state: "DONE" });
        return result;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      abortController,
      agentSettings,
      goal?.id,
      graph,
      injectAgentPacket,
      log,
      setGraph,
      setIsRunning,
      updateExecutionState,
    ],
  );

  return {
    graph,
    graphData,
    stop,
    run,
    reset,
    logs,
    agentPacketsMap,
    results,
    resultsMap,
    sortedTaskStates,
  };
};

export default useWaggleDanceAgentExecutor;
