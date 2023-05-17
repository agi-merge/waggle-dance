import { create } from "zustand";

export interface AppState {
  isRunning: boolean;
  setIsRunning: (newState: boolean) => void;
  isPageLoading: boolean;
  setIsPageLoading: (newState: boolean) => void;
  isDemoAlertOpen: boolean,
  setIsDemoAlertOpen: (newState: boolean) => void;
}

const useApp = create<AppState>((set) => ({
  isRunning: false,
  setIsRunning: (newState) => set({ isRunning: newState }),
  isPageLoading: false,
  setIsPageLoading: (newState) => set({ isPageLoading: newState }),
  isDemoAlertOpen: true,
  setIsDemoAlertOpen: (newState) => set({ isDemoAlertOpen: newState }),
}))

export default useApp;