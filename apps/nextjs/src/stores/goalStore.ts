import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { v4 } from "uuid";
import { create } from "zustand";
import { type HistoryTab as GoalTab } from "~/features/WaggleDance/components/HistoryTabber";

export type GoalMap = Map<string, GoalTab>;

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

const uuid = v4();
const useGoalStore = create<GoalStore>((set, get) => ({
  isLoading: false,
  setIsLoading: (newState) => set({ isLoading: newState }),
  goalMap: new Map<string, GoalTab>(),
  setGoalMap: (newData) => set({ goalMap: newData }),
  getSelectedGoal: () => {
    const g = get()
    if (g.goalMap.size === 0) {
      return undefined;
    }
    const currentTabIndex = g.currentTabIndex;
    const values = g.goalMap !== undefined && g.goalMap.values !== undefined && g.goalMap.values();
    if (!values) {
      return undefined;
    }
    const array = Array.from(values);
    return array.find((goal) => goal.index === currentTabIndex);
  },
  initializeHistoryData: (sessionData, historicGoals) => {

    const id = `tempgoal-${uuid}`
    // If actual data is passed in then use that
    if (sessionData && historicGoals) {
      // always have at least one tempGoal
      const goalMap = new Map<string, GoalTab>();
      const newTab = {
        id,
        prompt: "",
        index: 0,
        selectedByDefault: false,
        tooltip: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "",
      } as GoalTab;
      goalMap.set(id, newTab)

      let index = 0;
      for (const goal of historicGoals) {
        goalMap.set(goal.id, {
          id: goal.id,
          index,
          tooltip: goal.prompt,
          prompt: goal.prompt,
          selectedByDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: goal.userId,
        });
        index += 1;
      }

      set({
        goalMap: { ...goalMap }
      })
    } else {
      const tempGoal = {
        id,
        prompt: "",
        index: 0,
        selectedByDefault: true,
        tooltip: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "",
      } as GoalTab;
      const goalMap = new Map<string, GoalTab>();
      goalMap.set(tempGoal.id, tempGoal)
      set({
        goalMap: { ...goalMap }
      })
    }
  },
  currentTabIndex: 0,
  setCurrentTabIndex: (newTabIndex) => set({ currentTabIndex: newTabIndex }),
  goalInputValue: "",
  setGoalInputValue: (newGoalInputValue) => set({ goalInputValue: newGoalInputValue }),
}));

export default useGoalStore;
