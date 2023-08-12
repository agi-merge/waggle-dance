import { create } from "zustand";

export interface AppState {
  isPageLoading: boolean;
  setIsPageLoading: (newState: boolean) => void;
  isAutoScrollToBottom: boolean;
  setIsAutoScrollToBottom: (newState: boolean) => void;
}

const useApp = create<AppState>((set) => ({
  isPageLoading: false,
  setIsPageLoading: (newState) => set({ isPageLoading: newState }),
  isAutoScrollToBottom: true,
  setIsAutoScrollToBottom: (newState) =>
    set({ isAutoScrollToBottom: newState }),
}));

export default useApp;
