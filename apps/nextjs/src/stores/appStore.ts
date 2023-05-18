import { create } from "zustand";

export interface AppState {
  isRunning: boolean;
  setIsRunning: (newState: boolean) => void;
  isPageLoading: boolean;
  setIsPageLoading: (newState: boolean) => void;
}

const useApp = create<AppState>((set) => ({
  isRunning: false,
  setIsRunning: (newState) => set({ isRunning: newState }),
  isPageLoading: false,
  setIsPageLoading: (newState) => set({ isPageLoading: newState }),
}))

export default useApp;