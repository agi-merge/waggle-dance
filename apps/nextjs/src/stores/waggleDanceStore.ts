// stores/waggleDanceStore.ts

import { v4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AgentSettings } from "@acme/agent";
import {
  defaultAgentSettings,
  hookRootUpToServerGraph,
  rootPlanId,
} from "@acme/agent";
import type {
  DraftExecutionGraph,
  Execution,
  ExecutionPlusGraph,
  GoalPlusExe,
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
    goalPrompt: string,
  ) => void;
  graph: DraftExecutionGraph;
  setGraph: (newGraph: DraftExecutionGraph, goalPrompt: string) => void;
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
      setExecution: (newExecution, goalPrompt) => {
        console.debug("setExecution", newExecution);
        set(() => ({
          execution: newExecution ?? null,
          graph:
            (newExecution?.graph &&
              hookRootUpToServerGraph(
                newExecution.graph,
                rootPlanId,
                newExecution.id,
                goalPrompt,
              )) ??
            hookRootUpToServerGraph(
              {
                nodes: [],
                edges: [],
                executionId: "",
              },
              rootPlanId,
              goalPrompt,
            ),
        }));
      },
      graph: {
        nodes: [],
        edges: [],
        executionId: "",
      } as DraftExecutionGraph,
      setGraph: (graph, goalPrompt) => {
        set((state) => ({
          graph: hookRootUpToServerGraph(
            graph,
            rootPlanId,
            goalPrompt,
            state.execution?.id,
          ),
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
