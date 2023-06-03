import Router from "next/router";
import { create } from "zustand";
import { HistoryTab } from "~/features/WaggleDance/components/HistoryTabber";

const ANON_USER_TABS: HistoryTab[] = [
  {
    index: 0,
    label: "Current Goal",
  },
  {
    index: 1,
    label: "+",
    tooltip: "🪵 Login to save your history!",
    handler: () => Router.push("/auth/signin"),
  },
];

const AUTH_USER_TABS: HistoryTab[] = [
  {
    index: 0,
    label: "Current Goal",
  },
  {
    index: 1,
    label: "+",
    tooltip: "🐝 Start wagglin' and your history will be saved!",
  },
];

export interface HistoryData {
  tabs: HistoryTab[];
}

export interface HistoryState {
  isLoading: boolean;
  setIsLoading: (newState: boolean) => void;
  historyData: HistoryData;
  setHistoryData: (newData: HistoryData) => void;
  initializeHistoryData: (sessionData?: any) => void;
}

const useHistory = create<HistoryState>((set) => ({
  isLoading: false,
  setIsLoading: (newState) => set({ isLoading: newState }),
  historyData: {
    tabs: ANON_USER_TABS,
  },
  setHistoryData: (newData) => set({ historyData: newData }),
  initializeHistoryData: (sessionData) =>
    set({
      historyData: {
        tabs: sessionData ? AUTH_USER_TABS : ANON_USER_TABS,
      },
    }),
}));

export default useHistory;
