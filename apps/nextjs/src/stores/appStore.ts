import { create } from "zustand";

export interface AppState {
  isPageLoading: boolean;
  setIsPageLoading: (newState: boolean) => void;
}

const useApp = create<AppState>((set) => ({
  isPageLoading: false,
  setIsPageLoading: (newState) => set({ isPageLoading: newState }),
}))

export default useApp;