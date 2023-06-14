import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { v4 } from "uuid";
import { create } from "zustand";
import { type GoalTab } from "~/features/WaggleDance/components/GoalTabs";

export type GoalList = GoalTab[];

export interface GoalStore {
  goalList: GoalList;
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

const getCurrentGoal = (get: () => GoalStore): GoalTab | undefined => {
  const goalList = get().goalList;
  const currentTabIndex = get().currentTabIndex;
  return goalList[currentTabIndex];
};

const useGoalStore = create<GoalStore>((set, get) => ({
  goalList: [baseTab],
  prevSelectedGoal: undefined,
  newGoal() {
    const goalList = get().goalList;
    const id = `tempgoal-${v4()}`;
    const newIndex = goalList.length;
    const newGoal = {
      id,
      prompt: "",
      index: newIndex,
      tooltip: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "",
    };
    const newGoalList = [...goalList, newGoal];

    set({
      prevSelectedGoal: goalList[get().currentTabIndex],
      goalList: newGoalList,
      currentTabIndex: newIndex,
    });
  },
  deleteGoal(tab: GoalTab) {
    const goalList = get().goalList;
    const newGoalList = goalList.filter(goal => goal.id !== tab.id);

    // Prevent empty tabs
    if (newGoalList.length === 0) {
      set({
        goalList: [baseTab],
        currentTabIndex: 0,
      });
      return;
    }

    // Update the index of the remaining goals
    newGoalList.forEach((goal, index) => {
      goal.index = index;
    });

    const prevSelectedGoal = get().prevSelectedGoal;
    const prevIndex = newGoalList.findIndex(goal => goal.id === prevSelectedGoal?.id);

    set({
      goalList: newGoalList,
      currentTabIndex: prevIndex !== -1 ? prevIndex : 0,
    });
  },
  mergeGoals(sessionData, historicGoals) {
    const now = new Date();

    if (historicGoals && historicGoals.length > 0) {
      const goalList = historicGoals.map((goal, index) => ({
        id: goal.id,
        index,
        tooltip: goal.prompt,
        prompt: goal.prompt,
        createdAt: now,
        updatedAt: now,
        userId: goal.userId,
      }));

      set({
        currentTabIndex: 0,
        goalList,
      });
    }
  },
  currentTabIndex: 0,
  setCurrentTabIndex(newTabIndex) {
    const goalList = get().goalList;
    const prevSelectedGoal = goalList[get().currentTabIndex];

    set({
      prevSelectedGoal,
      currentTabIndex: newTabIndex,
    });
  },
  getSelectedGoal() {
    const currentGoal = getCurrentGoal(get)

    return currentGoal;
  },
  getGoalInputValue() {
    const currentGoal = getCurrentGoal(get)
    return currentGoal ? currentGoal.prompt : "";
  },
  setGoalInputValue(newGoalInputValue) {
    const goalList = get().goalList;
    const currentTabIndex = get().currentTabIndex;
    const currentGoal = getCurrentGoal(get)

    if (currentGoal) {
      const newGoal = { ...currentGoal, prompt: newGoalInputValue };
      const newGoalList = [
        ...goalList.slice(0, currentTabIndex),
        newGoal,
        ...goalList.slice(currentTabIndex + 1),
      ];

      set({
        goalList: newGoalList,
      });
    }
  },
}));

export default useGoalStore;