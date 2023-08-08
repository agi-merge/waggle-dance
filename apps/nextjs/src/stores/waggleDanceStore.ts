// stores/waggleDanceStore.ts

import { type NextRouter } from "next/router";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type Execution } from "@acme/db";

import routes from "~/utils/routes";
import { app } from "~/constants";
import {
  AgentPromptingMethod,
  LLM_ALIASES,
  Temperature,
  type LLM,
} from "../../../../packages/agent/src/utils/llms";

export interface AgentSettings {
  modelName: LLM;
  temperature: Temperature;
  agentPromptingMethod: AgentPromptingMethod | null;
  // see: https://platform.openai.com/docs/api-reference/chat/create
  topP?: number | undefined;
  maxConcurrency: number;
  frequencyPenalty?: number | undefined;
  presencePenalty?: number | undefined;
  logitBias?: Record<string, number> | undefined;
}

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
  execution: Execution | null;
  setExecution: (
    newExecution: Execution | null,
    routeToGoal?: { goalId: string; router: NextRouter } | undefined,
  ) => Promise<void>;
}

const useWaggleDanceMachineStore = create(
  persist<WaggleDanceMachineStore>(
    (set, _get) => ({
      isRunning: false,
      setIsRunning: (newState) => set({ isRunning: newState }),
      isAutoStartEnabled: false,
      setIsAutoStartEnabled: (newState) =>
        set({ isAutoStartEnabled: newState }),
      agentSettings: {
        plan: {
          modelName: LLM_ALIASES["fast"],
          temperature: Temperature.Stable,
          agentPromptingMethod: null,
          maxConcurrency: 1,
        },
        review: {
          modelName: LLM_ALIASES["fast"],
          temperature: Temperature.Stable,
          agentPromptingMethod: AgentPromptingMethod.ChatZeroShotReAct,
          maxConcurrency: 2,
        },
        execute: {
          modelName: LLM_ALIASES["fast"],
          temperature: Temperature.Stable,
          agentPromptingMethod: AgentPromptingMethod.ChatZeroShotReAct,
          maxConcurrency: 4,
        },
      },
      setAgentSettings: (type, newValue) =>
        set((state) => ({
          agentSettings: {
            ...state.agentSettings,
            [type]: { ...state.agentSettings[type], ...newValue },
          },
        })),
      execution: null,
      setExecution: async (newExecution, routeToGoal) => {
        set({ execution: newExecution });
        await routeToGoal?.router.replace(
          routes.goal(routeToGoal?.goalId, newExecution?.id),
        );
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
