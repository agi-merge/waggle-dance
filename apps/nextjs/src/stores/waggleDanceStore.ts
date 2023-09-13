// stores/waggleDanceStore.ts

import { v4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  defaultAgentSettings,
  makeServerIdIfNeeded,
  type AgentSettings,
} from "@acme/agent";
import type DAG from "@acme/agent/src/prompts/types/DAG";
import { type ExecutionPlusGraph, type GoalPlusExe } from "@acme/db";

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
  setExecution: (newExecution: ExecutionPlusGraph | undefined | null) => void;
}

export const draftExecutionPrefix = "draft-";
export const newDraftExecutionId = () => `${draftExecutionPrefix}${v4()}`;

export function createDraftExecution(selectedGoal: GoalPlusExe, dag: DAG) {
  const executionId = newDraftExecutionId();
  const graphId = newDraftExecutionId();
  const goalId = selectedGoal.id;
  const nodes = dag.nodes.map((node) => {
    return { ...node, graphId, id: makeServerIdIfNeeded(node.id, executionId) };
  });
  const edges = dag.edges.map((edge) => {
    return {
      ...edge,
      graphId,
      sId: makeServerIdIfNeeded(edge.sId, executionId),
      tId: makeServerIdIfNeeded(edge.tId, executionId),
    };
  });
  const draftExecution: ExecutionPlusGraph = {
    id: executionId,
    goalId,
    userId: "guest",
    graph: {
      id: graphId,
      executionId,
      nodes,
      edges,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    state: "EXECUTING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return draftExecution;
}

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
      setExecution: (newExecution) => {
        set({ execution: newExecution || null });
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
