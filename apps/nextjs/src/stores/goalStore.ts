import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { v4 } from "uuid";
import { create } from "zustand";
import { type HistoryTab as GoalTab } from "~/features/WaggleDance/components/HistoryTabber";

export interface GoalMap {
  [key: string]: GoalTab;
}

export interface GoalStore {
  isLoading: boolean;
  setIsLoading: (newState: boolean) => void;
  goalMap: GoalMap;
  setGoalMap: (newData: GoalMap) => void;
  getSelectedGoal: () => GoalTab | undefined;
  initializeHistoryData: (sessionData?: Session | null, historicGoals?: Goal[]) => void;
  currentTabIndex: number;
  setCurrentTabIndex: (newTabIndex: number) => void;
  goalInputValue: string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

const useGoalStore = create<GoalStore>((set, get) => ({
  isLoading: false,
  setIsLoading: (newState) => set({ isLoading: newState }),
  goalMap: {
    "tempgoal-1": {
      id: "tempgoal-1",
      prompt: "",
      index: 0,
      selectedByDefault: true,
      tooltip: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "",
    },
  },
  setGoalMap: (newData) => set({ goalMap: newData }),
  getSelectedGoal: () => { return Object.values(get().goalMap)[get().currentTabIndex] },
  initializeHistoryData: (sessionData, historicGoals) => {

    // If actual data is passed in then use that
    if (sessionData && historicGoals) {
      // const tabs: Record<string, GoalTab> = historicGoals.map((goal, index) => {
      //   return {
      //     id: goal.id,
      //     index,
      //     tooltip: goal.prompt,
      //     prompt: goal.prompt,
      //     selectedByDefault: true,
      //     createdAt: new Date(),
      //     updatedAt: new Date(),
      //     userId: "",
      //   } as GoalTab
      // });

      // always have at least one tempGoal
      const id = `tempgoal-${v4()}`
      const goalMap = {
        id: {
          id,
          prompt: "",
          index: 0,
          selectedByDefault: false,
          tooltip: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "",
        },
      } as Record<string, GoalTab>;
      for (const goal of historicGoals) {
        goalMap[goal.id] = {
          id: goal.id,
          index: 0,
          tooltip: goal.prompt,
          prompt: goal.prompt,
          selectedByDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "",
        }
      }

      set({
        goalMap
      })
    } else {
      set({
        goalMap: {
          "tempgoal-1": {
            id: "tempgoal-1",
            prompt: "",
            index: 0,
            selectedByDefault: true,
            tooltip: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: "",
          },
        },
      })
    }
  },
  currentTabIndex: 0,
  setCurrentTabIndex: (newTabIndex) => set({ currentTabIndex: newTabIndex }),
  goalInputValue: "",
  setGoalInputValue: (newGoalInputValue) => set({ goalInputValue: newGoalInputValue }),
}));

export default useGoalStore;
