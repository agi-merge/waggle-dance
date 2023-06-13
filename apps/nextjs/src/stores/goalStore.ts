import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { v4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { app } from "~/constants";
import { type GoalTab } from "~/features/WaggleDance/components/GoalTabs";

export type GoalMap = Map<string, GoalTab>;

export interface GoalStore {
  isLoading: boolean;
  setIsLoading: (newState: boolean) => void;
  goalMap: GoalMap;
  setGoalMap: (newData: GoalMap) => void;
  prevSelectedGoal: GoalTab | undefined;
  mergeGoals: (sessionData?: Session | null, historicGoals?: Goal[]) => void;
  currentTabIndex: number;
  setCurrentTabIndex: (newTabIndex: number) => void;
  getGoalInputValue: () => string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

const uuid = v4();
const useGoalStore = create(
  persist<GoalStore>((set, get) => ({
    isLoading: true,
    setIsLoading: (newState) => set({ isLoading: newState }),
    goalMap: new Map<string, GoalTab>(),
    setGoalMap: (newData) => {
      set({ goalMap: newData })
    },
    prevSelectedGoal: undefined,
    mergeGoals: (sessionData, historicGoals) => {

      const id = `tempgoal-${uuid}`
      const now = new Date()
      debugger;
      // If actual data is passed in then use that
      if (historicGoals && historicGoals.length > 0) {

        // always have at least one tempGoal
        const goalMap = new Map<string, GoalTab>();
        // const newTab = {
        //   id,
        //   prompt: "",
        //   index: 0,
        //   tooltip: "",
        //   createdAt: now,
        //   updatedAt: now,
        //   userId: sessionData.user.id,
        // } as GoalTab;
        // goalMap.set(id, newTab)

        let index = 0;
        for (const goal of historicGoals) {
          goalMap.set(goal.id, {
            id: goal.id,
            index,
            tooltip: goal.prompt,
            prompt: goal.prompt,
            createdAt: now,
            updatedAt: now,
            userId: goal.userId,
          });
          index += 1;
        }

        set({
          goalMap
        })
      } else {
        console.log("no historic goals, creating a temp goal")
        const tempGoal = {
          id,
          prompt: "",
          index: 0,
          tooltip: "",
          createdAt: now,
          updatedAt: now,
          userId: sessionData?.user.id,
        } as GoalTab;
        const goalMap = new Map<string, GoalTab>();
        goalMap.set(tempGoal.id, tempGoal)
        set({
          goalMap,
        })
      }
    },
    currentTabIndex: 0,
    setCurrentTabIndex: (newTabIndex) => {
      const goalMap = get().goalMap;
      const goals = Array.from(goalMap.values());
      const prevId = goals[get().currentTabIndex]?.id
      const prevGoal = goals.find((goal) => goal.id === prevId)
      set({ prevSelectedGoal: prevGoal, currentTabIndex: newTabIndex })
    },
    // FIXME: the usages of Array.from(...) could become a perf issue
    // change to array indexed values 
    getGoalInputValue: () => {
      const goalMap = new Map(get().goalMap);
      const goals = Array.from(goalMap.values());
      const prevId = goals[get().currentTabIndex]?.id
      const prompt = goals.find((goal) => goal.id === prevId)?.prompt || ""
      return prompt
    },
    setGoalInputValue: (newGoalInputValue) => {
      const goalMap = new Map(get().goalMap);
      const goals = Array.from(goalMap.values());
      const prevId = goals[get().currentTabIndex]?.id
      const goal = goals.find((goal) => goal.id === prevId)
      const newGoal = { ...goal, prompt: newGoalInputValue } as GoalTab
      goal?.id && goalMap.set(goal.id, newGoal);
      set({
        goalMap,
      })
    }
  }), {
    name: app.localStorageKeys.goal,
    // see: https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md#how-do-i-use-it-with-map-and-set
    storage: {
      getItem: (name) => {
        const str = sessionStorage.getItem(name)
        if (!str) return null;
        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          state: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...JSON.parse(str).state,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            goalMap: new Map(JSON.parse(str).state.goalMap),
          },
        }
      },
      setItem: (name, newValue) => {
        const str = JSON.stringify({
          state: {
            ...newValue.state,
            goalMap: Array.from(newValue.state.goalMap.entries()),
          },
        })
        sessionStorage.setItem(name, str)
      },
      removeItem: (name) => sessionStorage.removeItem(name),
    },
  }));

export default useGoalStore;
