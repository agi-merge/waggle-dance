import { create } from "zustand";

export interface WaggleDanceMachineStore {
  isRunning: boolean;
  setIsRunning: (newState: boolean) => void;
  isAutoStartEnabled: boolean;
  setIsAutoStartEnabled: (newState: boolean) => void;
}

const useWaggleDanceMachineStore = create<WaggleDanceMachineStore>((set) => ({
  isRunning: false,
  setIsRunning: (newState) => set({ isRunning: newState }),
  isAutoStartEnabled: false,
  setIsAutoStartEnabled: (newState) => set({ isAutoStartEnabled: newState }),
}))

export default useWaggleDanceMachineStore;