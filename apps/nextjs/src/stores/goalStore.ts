import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { v4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { app } from "~/constants";
import { type GoalTab } from "~/features/WaggleDance/components/GoalTabs";

export type GoalMap = Map<string, GoalTab>;

export interface GoalStore {
  goalMap: GoalMap;
  prevSelectedGoal: GoalTab | undefined;
  newGoal: () => void;
  deleteGoal: (tab: GoalTab) => void;
  mergeGoals: (sessionData?: Session | null, historicGoals?: Goal[]) => void;
  currentTabIndex: number;
  setCurrentTabIndex: (newTabIndex: number) => void;
  getSelectedGoal: () => GoalTab | undefined;
  getGoalInputValue: () => string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

const baseTab = {
  id: `tempgoal-${v4()}`,
  prompt: "",
  index: 0,
  tooltip: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "",
} as GoalTab;

const useGoalStore = create<GoalStore>((set, get) => ({
  goalMap: new Map<string, GoalTab>([[baseTab.id, baseTab]]),
  prevSelectedGoal: undefined,
  newGoal() {
    const goalMap = get().goalMap;
    const id = `tempgoal-${v4()}`;
    const index = goalMap.size;
    const newGoalMap = new Map(goalMap);
    newGoalMap.set(id, {
      id,
      prompt: "",
      index,
      tooltip: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "",
    });

    set({
      goalMap: newGoalMap,
      currentTabIndex: index,
    })
  },
  deleteGoal: (tab: GoalTab) => {
    const newGoalMap = new Map(get().goalMap);
    const prevSelectedGoal = get().prevSelectedGoal;
    newGoalMap.delete(tab.id);

    // if (newGoalMap.size == 0) {
    //   // do not allow deleting the last tab
    //   set({ currentTabIndex: 0 })
    //   return;
    // }

    const goals = Array.from(newGoalMap.values()).sort((a, b) => a.index - b.index);

    // Update the index of the remaining goals
    goals.forEach((goal, index) => {
      newGoalMap.set(goal.id, {
        ...goal,
        index,
      });
    });

    // Set the current tab index to the previous one if available, otherwise set it to 0
    const prevIndex = goals.findIndex(
      (goal) => goal.id === prevSelectedGoal?.id,
    );
    set({
      goalMap: newGoalMap,
      currentTabIndex: prevIndex !== -1 ? prevIndex : 0,
    })
  },
  mergeGoals: (sessionData, historicGoals) => {

    const now = new Date()
    // If actual data is passed in then use that
    if (historicGoals && historicGoals.length > 0) {
      console.log("historicGoals.length", historicGoals.length)

      // always have at least one tempGoal
      const goalMap = new Map<string, GoalTab>();

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
      console.log("goalMap", goalMap)
      set({
        goalMap,
      })
    }
  },
  currentTabIndex: 0,
  setCurrentTabIndex: (newTabIndex) => {
    const goalMap = get().goalMap;
    const goals = Array.from(goalMap.values()).sort((a, b) => a.index - b.index)
    const prevId = goals[get().currentTabIndex]?.id
    const prevGoal = goals.find((goal) => goal.id === prevId)
    set({ prevSelectedGoal: prevGoal, currentTabIndex: newTabIndex })
  },
  getSelectedGoal: () => {
    const goalMap = new Map(get().goalMap);
    const goals = Array.from(goalMap.values()).sort((a, b) => a.index - b.index)
    const prevId = goals[get().currentTabIndex]?.id;
    const goal = goals.find((goal) => goal.id === prevId);
    return goal;
  },
  // FIXME: the usages of Array.from(...) could become a perf issue
  // change to array indexed values 
  getGoalInputValue: () => {
    const goalMap = new Map(get().goalMap);
    const goals = Array.from(goalMap.values()).sort((a, b) => a.index - b.index)
    const prevId = goals[get().currentTabIndex]?.id
    const prompt = goals.find((goal) => goal.id === prevId)?.prompt || ""
    return prompt
  },
  setGoalInputValue: (newGoalInputValue) => {
    const goalMap = new Map(get().goalMap);
    const goals = Array.from(goalMap.values()).sort((a, b) => a.index - b.index)
    const prevId = goals[get().currentTabIndex]?.id
    const goal = goals.find((goal) => goal.id === prevId)
    const newGoal = { ...goal, prompt: newGoalInputValue } as GoalTab
    goal?.id && goalMap.set(goal.id, newGoal);
    console.log("setGoalInputValue", newGoalInputValue, newGoal, goalMap)
    set({
      goalMap,
    })
  }
}),);

export default useGoalStore;
