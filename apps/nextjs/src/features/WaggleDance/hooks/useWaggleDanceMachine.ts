// useWaggleDanceMachine.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { stringify } from "yaml";

import DAG from "@acme/agent/src/prompts/types/DAG";
import { type ExecutionEdge, type ExecutionPlusGraph } from "@acme/db";

import { api } from "~/utils/api";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import {
  findNodesWithNoIncomingEdges,
  initialNodes,
  makeServerIdIfNeeded,
  rootPlanId,
  TaskState,
  TaskStatus,
  type AgentPacket,
  type DAGNode,
  type DAGNodeClass,
} from "../../../../../../packages/agent";
import { type GraphData } from "../components/ForceGraph";
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

  const [dag, setDAG] = useState<DAG>(
    execution?.graph ?? new DAG(initialNodes(goal?.prompt ?? ""), []),
  );

  const getDAG = useCallback(() => {
    return dag;
  }, [dag]);

  useEffect(() => {
    const graph = execution?.graph;
    if (graph && goal?.prompt) {
      const hookupEdges: ExecutionEdge[] = findNodesWithNoIncomingEdges(
        graph,
      ).map((node) => {
        return {
          id: makeServerIdIfNeeded(node.id, execution.id),
          sId: rootPlanId,
          tId: makeServerIdIfNeeded(node.id, execution.id),
          graphId: graph.id,
        };
      });
      const rootAddedToGraph = new DAG(
        [...initialNodes(goal.prompt), ...graph.nodes],
        // connect our initial nodes to the DAG: gotta find them and create edges
        [...graph.edges, ...hookupEdges],
      );
      setDAG(rootAddedToGraph);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, execution?.graph]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

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
    const taskStates = dag.nodes.map((dagNode) => {
      const taskStateB = resultsMap[dagNode.id] ?? agentPacketsMap[dagNode.id];
      console.log("dagNode", dagNode.id, "taskStateB", taskStateB?.id);
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
    return taskStates;
  }, [dag.nodes.length, agentPacketsMap, resultsMap]);

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
    (agentPacket: AgentPacket, node: DAGNode | DAGNodeClass) => {
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
    setIsDonePlanning(false);
    setDAG(new DAG(initialNodes(goal?.prompt ?? ""), []));
    setAgentPackets({});
  }, [goal?.prompt]);

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    setGraphData(dagToGraphData(dag, results));
  }, [dag, results, setGraphData]);

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
        result = await waggleDanceMachine.run({
          goal: prompt,
          goalId,
          executionId,
          agentSettings,
          graphDataState: [getDAG, setDAG],
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
      waggleDanceMachine,
      agentSettings,
      getDAG,
      isDonePlanning,
      injectAgentPacket,
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
    agentPacketsMap,
    results,
    resultsMap,
    sortedTaskStates,
  };
};

export default useWaggleDanceMachine;
