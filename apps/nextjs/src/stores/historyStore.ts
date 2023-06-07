import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { create } from "zustand";
import { type HistoryTab } from "~/features/WaggleDance/components/HistoryTabber";
import { api } from "~/utils/api";

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

    // If actual data is passed in then use that
    if (sessionData && historicGoals) {
      const tabs: HistoryTab[] = historicGoals.map((goal, index) => {
        return {
          index,
          label: goal.prompt,
          // handler: () => {
          //   console.log("🐝 WaggleDance: HistoryTabber: Goal clicked:", goal);
          // },
          // closeHandler: () => {
          //   console.log("close", goal);
          //   const tabsCopy = [...tabs];
          //   tabsCopy.splice(index, 1);
          //   const delApi = api.goal.delete;
          //   const _data = delApi.mutate(goal.id, { onSuccess: () => { }, onError: () => { } });
          //   set({
          //     historyData: {
          //       tabs: tabsCopy,
          //     },
          //   })
          // }
        } as HistoryTab;
      });
      set({
        historyData: {
          tabs,
        },
      })
    } else {
      set({
        historyData: {
          tabs: [],
        },
      })
    }
  },
}));

export default useHistory;
