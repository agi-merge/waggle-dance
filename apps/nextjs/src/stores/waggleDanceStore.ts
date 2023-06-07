// stores/waggleDanceStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { app } from "~/constants";

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
      llmOption: "gpt-4-0314",
      setLLMOption: (newValue) => set({ llmOption: newValue }),
    }),
    {
      name: app.localStorageKeys.goal,
      storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
    }
  )
)

export default useWaggleDanceMachineStore;