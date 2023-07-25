// stores/waggleDanceStore.ts

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  AgentPromptingMethod,
  LLM_ALIASES,
  Temperature,
  type LLM,
} from "@acme/chain/src/utils/llms";

import { app } from "~/constants";

export interface AgentSettings {
  modelName: LLM;
  temperature: Temperature;
  agentPromptingMethod: AgentPromptingMethod;
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
          modelName: LLM_ALIASES["smart"],
          temperature: Temperature.Stable,
          agentPromptingMethod: AgentPromptingMethod.ZeroShotReAct,
          maxConcurrency: 1,
        },
        review: {
          modelName: LLM_ALIASES["fast"],
          temperature: Temperature.Stable,
          agentPromptingMethod: AgentPromptingMethod.ChatZeroShotReAct,
          maxConcurrency: 2,
        },
        execute: {
          modelName: LLM_ALIASES["fast-large"],
          temperature: Temperature.Balanced,
          agentPromptingMethod: AgentPromptingMethod.ChatConversationalReAct,
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
