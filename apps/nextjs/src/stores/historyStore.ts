import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { create } from "zustand";
import { type HistoryTab } from "~/features/WaggleDance/components/HistoryTabber";

export interface HistoryData {
  tabs: HistoryTab[];
}

export interface HistoryState {
  isLoading: boolean;
  setIsLoading: (newState: boolean) => void;
  historyData: HistoryData;
  setHistoryData: (newData: HistoryData) => void;
  initializeHistoryData: (sessionData?: Session | null, historicGoals?: Goal[]) => void;
}

const useHistory = create<HistoryState>((set) => ({
  isLoading: false,
  setIsLoading: (newState) => set({ isLoading: newState }),
  historyData: {
    tabs: [],
  },
  setHistoryData: (newData) => set({ historyData: newData }),
  initializeHistoryData: (sessionData, historicGoals) => {
    // Default to static auth tabs array
    let authTabs: HistoryTab[] = [];

    // If actual data is passed in then use that
    if (sessionData && historicGoals) {
      authTabs = historicGoals.map((goal, index) => {
        return {
          index: index,
          label: goal.prompt,
          handler: () => {
            console.log("🐝 WaggleDance: HistoryTabber: Goal clicked:", goal);
          },
          closeHandler: () => {
            console.log("close", goal);

            authTabs.splice(index, 1)
            set({
              historyData: {
                tabs: authTabs,
              },
            })
          }
        } as HistoryTab;
      });

      // Add the + message at end
      authTabs.push({
        index: authTabs.length,
        label: "+",
        tooltip: "🐝 Start wagglin' and your history will be saved!",
        handler: () => {
          const tabs = (sessionData ? authTabs : [])
          const plus = tabs.pop();
          tabs.push({
            index: tabs.length,
            label: "New Tab",
          })
          plus && tabs.push(plus)
          set({
            historyData: {
              tabs,
            },
          })
        },
      });
    }

    // If no session data/historic goals
    set({
      historyData: {
        tabs: sessionData ? authTabs : [],
      },
    })
  },
}));

export default useHistory;
