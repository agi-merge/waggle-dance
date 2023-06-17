// stores/waggleDanceStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { app } from "~/constants";
import { LLM } from "@acme/chain/src/utils/types";

export interface WaggleDanceMachineStore {
  isRunning: boolean;
  setIsRunning: (newState: boolean) => void;
  isAutoStartEnabled: boolean;
  setIsAutoStartEnabled: (newState: boolean) => void;
  executionMethod: string;
  setExecutionMethod: (newValue: string) => void;
  temperatureOption: string;
  setTemperatureOption: (newValue: string) => void;
  llmOption: string;
  setLLMOption: (newValue: string) => void;
}

const useWaggleDanceMachineStore = create(
  persist<WaggleDanceMachineStore>(
    (set, _get) => ({
      isRunning: false,
      setIsRunning: (newState) => set({ isRunning: newState }),
      isAutoStartEnabled: true,
      setIsAutoStartEnabled: (newState) => set({ isAutoStartEnabled: newState }),
      executionMethod: "Faster, less accurate",
      setExecutionMethod: (newValue) => set({ executionMethod: newValue }),
      temperatureOption: "Stable",
      setTemperatureOption: (newValue) => set({ temperatureOption: newValue }),
      llmOption: LLM.fast,
      setLLMOption: (newValue) => set({ llmOption: newValue }),
    }),
    {
      name: app.localStorageKeys.waggleDance,
      storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
      partialize: (state: WaggleDanceMachineStore) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !['isRunning'].includes(key))
        ) as WaggleDanceMachineStore,
    }
  )
)

export default useWaggleDanceMachineStore;