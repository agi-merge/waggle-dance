// stores/waggleDanceStore.ts

import { v4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  defaultAgentSettings,
  generateHookupEdges,
  initialNodes,
  rootPlanId,
  type AgentSettings,
} from "@acme/agent";
import {
  type DraftExecutionGraph,
  type Execution,
  type ExecutionPlusGraph,
  type GoalPlusExe,
} from "@acme/db";

import { app } from "~/constants";

export interface WaggleDanceMachineStore {
  isRunning: boolean;
  setIsRunning: (newState: boolean) => void;
  isAutoStartEnabled: boolean;
  setIsAutoStartEnabled: (newState: boolean) => void;
  agentSettings: Record<"plan" | "review" | "execute", AgentSettings>;
  setAgentSettings: (
    type: "plan" | "review" | "execute",
    newValue: Partial<AgentSettings>,
  ) => void;
  execution: ExecutionPlusGraph | null;
  setExecution: (
    newExecution: ExecutionPlusGraph | undefined | null,
    goal: string,
  ) => void;
  graph: DraftExecutionGraph;
  setGraph: (newGraph: DraftExecutionGraph, goal: string) => void;
}

export const draftExecutionPrefix = "draft-";
export const newDraftExecutionId = () => `${draftExecutionPrefix}${v4()}`;

export function createDraftExecution(selectedGoal: GoalPlusExe) {
  const executionId = newDraftExecutionId();
  const goalId = selectedGoal.id;
  const draftExecution: Execution = {
    id: executionId,
    goalId,
    userId: "guest",
    state: "EXECUTING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return draftExecution;
}

const hookRootUpToServerGraph = (
  graph: DraftExecutionGraph,
  executionId: string,
  goal: string,
) => {
  if (graph.executionId != executionId) {
    debugger;
  }
  const hookupEdges = generateHookupEdges(graph, executionId, rootPlanId);
  const graphWithRoot = {
    ...graph,
    nodes: [...initialNodes(goal), ...graph.nodes],
    edges: [...graph.edges, ...hookupEdges],
    executionId: executionId ?? graph.executionId,
  };
  return graphWithRoot;
};

const useWaggleDanceMachineStore = create(
  persist<WaggleDanceMachineStore>(
    (set, _get) => ({
      isRunning: false,
      setIsRunning: (newState) => set({ isRunning: newState }),
      isAutoStartEnabled: false,
      setIsAutoStartEnabled: (newState) =>
        set({ isAutoStartEnabled: newState }),
      agentSettings: defaultAgentSettings,
      setAgentSettings: (type, newValue) =>
        set((state) => ({
          agentSettings: {
            ...state.agentSettings,
            [type]: { ...state.agentSettings[type], ...newValue },
          },
        })),
      execution: null,
      setExecution: (newExecution, goal) => {
        console.debug("setExecution", newExecution);
        set((state) => ({
          execution: newExecution || null,
          graph:
            (newExecution?.graph &&
              hookRootUpToServerGraph(
                newExecution.graph,
                newExecution.id,
                goal,
              )) ||
            state.graph,
        }));
      },
      graph: {
        nodes: [],
        edges: [],
        executionId: "",
      } as DraftExecutionGraph,
      setGraph: (graph, goal) => {
        set((state) => ({
          graph:
            graph.nodes[0]?.id === rootPlanId
              ? graph
              : hookRootUpToServerGraph(graph, state.execution?.id ?? "", goal),
        }));
      },
    }),
    {
      name: app.localStorageKeys.waggleDance,
      storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
      partialize: (state: WaggleDanceMachineStore) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !["isRunning"].includes(key)),
        ) as WaggleDanceMachineStore,
    },
  ),
);

export default useWaggleDanceMachineStore;
