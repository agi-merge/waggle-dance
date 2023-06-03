import { Goal } from ".prisma/client";
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
    tooltip: "🪵 Log in to save your history!",
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
  initializeHistoryData: (sessionData?: any, historicGoals?: Goal[]) => void;
}

const useHistory = create<HistoryState>((set) => ({
  isLoading: false,
  setIsLoading: (newState) => set({ isLoading: newState }),
  historyData: {
    tabs: ANON_USER_TABS,
  },
  setHistoryData: (newData) => set({ historyData: newData }),
  initializeHistoryData: (sessionData, historicGoals) => {
    // Default to static auth tabs array
    let authTabs: HistoryTab[] = AUTH_USER_TABS;

    // If actual data is passed in then use that
    if (sessionData && historicGoals) {
      authTabs = historicGoals.map((goal, index) => {
        return {
          index: index,
          label: goal.prompt,
        } as HistoryTab;
      });

      // Add the + message at end
      authTabs.push({
        index: authTabs.length,
        label: "+",
        tooltip: "🐝 Start wagglin' and your history will be saved!",
      });
    }

    // If no session data/historic goals
    set({
      historyData: {
        tabs: sessionData ? authTabs : ANON_USER_TABS,
      },
    })
  },
}));

export default useHistory;
