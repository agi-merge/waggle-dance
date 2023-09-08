// useWaggleDanceMachine.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { stringify } from "yaml";

import { type ExecutionEdge, type ExecutionPlusGraph } from "@acme/db";

import { api } from "~/utils/api";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import {
  TaskStatus,
  type AgentPacket,
  type DAGNode,
  type TaskState,
} from "../../../../../../packages/agent";
import { type GraphData } from "../components/ForceGraph";
import DAG, { type DAGNodeClass } from "../types/DAG";
import {
  findNodesWithNoIncomingEdges,
  initialNodes,
  rootPlanId,
} from "../types/initialNodes";
import { type WaggleDanceResult } from "../types/types";
import { dagToGraphData } from "../utils/conversions";
import WaggleDanceMachine from "../WaggleDanceMachine";

export type LogMessage = {
  message: string;
  type: "info" | "error";
  timestamp: Date;
};

const wdm = new WaggleDanceMachine();

const useWaggleDanceMachine = () => {
  const [waggleDanceMachine] = useState(wdm);
  const { setIsRunning, agentSettings, execution } =
    useWaggleDanceMachineStore();
  const { selectedGoal: goal } = useGoalStore();

  const [dag, setDAG] = useState<DAG>(execution?.graph ?? new DAG([], []));

  useEffect(() => {
    const graph = execution?.graph;
    if (graph && goal?.prompt) {
      const hookupEdges: ExecutionEdge[] = findNodesWithNoIncomingEdges(
        graph,
      ).map((node) => {
        return {
          id: node.id,
          sId: rootPlanId,
          tId: node.id,
          graphId: graph.id,
        };
      });
      const rootAddedToGraph = new DAG(
        [...initialNodes(goal.prompt), ...graph.nodes],
        // connect our initial nodes to the DAG: gotta find them and create edges
        [...graph.edges, ...hookupEdges],
      );
      setDAG(rootAddedToGraph);
    } else {
      setDAG(new DAG([], []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, execution?.graph]);

  const { mutate: updateExecutionState } =
    api.execution.updateState.useMutation({
      onSettled: () => {},
    });

  const results = useMemo(() => {
    return goal?.results?.map((r) => {
      const result = r.value as AgentPacket;
      return {
        status: result.type,
        result,
        packets: r.packets as AgentPacket[],
      } as TaskState;
    });
  }, [goal?.results]);
  // map results to Record<string, TaskState>
  // correct Typescript:
  const resultsMap = useMemo(
    () =>
      results?.reduce(
        (acc: Record<string, TaskState>, cur: TaskState) => {
          return { ...acc, [cur.id]: cur };
        },
        {} as Record<string, TaskState>,
      ),
    [results],
  );

  const [isDonePlanning, setIsDonePlanning] = useState(false);
  const [taskResults, setTaskResults] = useState<Record<string, TaskState>>(
    resultsMap ?? {},
  );
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [agentPackets, setAgentPackets] = useState<Record<string, TaskState>>(
    {},
  );
  const [abortController, setAbortController] = useState(
    () => new AbortController(),
  );

  // takes a AgentPacket type and maps it to an appropriate TaskStatus, or idle if it does not match or is undefined
  const mapPacketTypeToStatus = (
    packetType: AgentPacket["type"] | undefined,
  ): TaskStatus => {
    switch (packetType) {
      case "token":
      case "handleLLMStart":
      case "handleChainStart":
      case "handleToolStart":
      case "handleAgentAction":
        return TaskStatus.working;
      case "done":
      case "handleAgentEnd":
        return TaskStatus.done;
      case "error":
      case "handleLLMError":
      case "handleChainError":
      case "handleToolError":
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
    [setLogs],
  );

  const taskStates = useMemo(() => {
    const reduceTaskStates = (
      dagNodes: DAGNode[],
      agentPackets: Record<string, TaskState>,
    ): TaskState[] => {
      return dagNodes.map((node) => {
        const agentPacket = agentPackets[node.id];
        const packets = agentPacket?.packets ?? [];
        const status = mapPacketTypeToStatus(packets[packets.length - 1]?.type);
        const result = agentPacket?.result ?? null;

        // Get the existing task state
        const existingTaskState = taskResults[node.id];

        // If the task state is not changed, return the existing state
        if (
          existingTaskState &&
          existingTaskState.status === status &&
          existingTaskState.result === result &&
          existingTaskState.packets.length === packets.length
        ) {
          return existingTaskState;
        }

        // Otherwise, return a new state with updated 'updatedAt'
        return {
          ...node,
          status,
          result,
          fromPacketType: packets[packets.length - 1]?.type ?? "idle",
          updatedAt: new Date(),
          packets,
        };
      });
    };
    const taskStates = reduceTaskStates(dag.nodes, agentPackets);
    return taskStates;
  }, [agentPackets, dag.nodes, taskResults]);

  const sendAgentPacket = useCallback(
    (agentPacket: AgentPacket, node: DAGNode | DAGNodeClass) => {
      if (!node || !node.id) {
        throw new Error("a node does not exist to receive data");
      }
      const existingTask = agentPackets[node.id];
      if (!existingTask) {
        if (!node) {
          log(
            `Warning: node not found in the dag during chain packet update: ${agentPacket.type}`,
          );
          return;
        } else {
          setAgentPackets((prevAgentPackets) => ({
            ...prevAgentPackets,
            [node.id]: {
              ...node,
              status: TaskStatus.idle,
              fromPacketType: agentPacket.type,
              result:
                agentPacket.type === "done"
                  ? agentPacket.value
                  : agentPacket.type === "error"
                  ? agentPacket.message
                  : null,
              packets: [
                ...(prevAgentPackets[node.id]?.packets ?? []),
                agentPacket,
              ],
              updatedAt: new Date(),
            },
          }));
        }
      } else {
        const updatedTask = {
          ...existingTask,
          status: mapPacketTypeToStatus(agentPacket.type),
          fromPacketType: agentPacket.type,
          result:
            agentPacket.type === "done"
              ? agentPacket.value
              : agentPacket.type === "error"
              ? agentPacket.message
              : null,
          packets: [...existingTask.packets, agentPacket],
          updatedAt: new Date(),
        };
        setAgentPackets((prevAgentPackets) => ({
          ...prevAgentPackets,
          [node.id]: updatedTask,
        }));
      }
    },
    [agentPackets, setAgentPackets, log],
  );

  const reset = useCallback(() => {
    setIsDonePlanning(false);
    setDAG(new DAG(initialNodes(goal?.prompt ?? ""), []));
    setAgentPackets({});
    setTaskResults({});
  }, [goal?.prompt]);

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
  const run = useCallback(
    async (execution: ExecutionPlusGraph) => {
      const ac = new AbortController();
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      setAbortController(ac);

      setIsDonePlanning(false);
      setAgentPackets({});
      setTaskResults({});
      setDAG(new DAG(initialNodes(goal?.prompt ?? ""), []));

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
        result = await waggleDanceMachine.run({
          goal: prompt,
          goalId,
          executionId,
          agentSettings,
          graphDataState: [dag, setDAG],
          isDonePlanningState: [isDonePlanning, setIsDonePlanning],
          taskResultsState: [taskResults, setTaskResults],
          sendAgentPacket,
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
        const res = result.results[0] as Record<string, TaskState>;
        res && setTaskResults(res);
        updateExecutionState({ executionId, state: "DONE" });
        return result;
      }
    },
    [
      abortController,
      goal?.prompt,
      goal?.id,
      setIsRunning,
      waggleDanceMachine,
      agentSettings,
      dag,
      isDonePlanning,
      taskResults,
      sendAgentPacket,
      log,
      updateExecutionState,
    ],
  );

  return {
    waggleDanceMachine,
    dag,
    graphData,
    stop,
    run,
    reset,
    isDonePlanning,
    logs,
    taskStates,
    taskResults,
  };
};

export default useWaggleDanceMachine;
