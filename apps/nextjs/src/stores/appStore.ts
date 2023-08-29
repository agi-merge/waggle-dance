import { create } from "zustand";

export interface AppState {
  isPageLoading: boolean;
  setIsPageLoading: (newState: boolean) => void;
  isAutoScrollToBottom: boolean;
  setIsAutoScrollToBottom: (newState: boolean) => void;
  isAutoRefineEnabled: boolean;
  setIsAutoRefineEnabled: (newState: boolean) => void;
  error: Error | null;
  setError: (newState: Error | null) => void;
}

const useApp = create<AppState>((set) => ({
  isPageLoading: false,
  setIsPageLoading: (newState) => set({ isPageLoading: newState }),
  isAutoScrollToBottom: true,
  setIsAutoScrollToBottom: (newState) =>
    set({ isAutoScrollToBottom: newState }),
  isAutoRefineEnabled: true,
  setIsAutoRefineEnabled: (newState) => set({ isAutoRefineEnabled: newState }),
  error: null,
  setError: (newState) => set({ error: newState }),
}));

export default useApp;
