import { type Goal } from ".prisma/client";
import { type Session } from "@acme/auth";
import { v4 } from "uuid";
import { create } from "zustand";
import { type GoalTab } from "~/features/WaggleDance/components/GoalTabs";

export type GoalList = GoalTab[];

export interface GoalStore {
  goalList: GoalList;
  prevSelectedGoal: GoalTab | undefined;
  newGoal: (userId: string) => string;
  deleteGoal: (tab: GoalTab) => void;
  selectTab: (index: number) => void;
  mergeGoals: (sessionData?: Session | null, historicGoals?: Goal[]) => void;
  currentTabIndex: number;
  getSelectedGoal: (slug?: string | undefined) => GoalTab | undefined;
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

const getCurrentGoal = (get: () => GoalStore, slug?: string): GoalTab | undefined => {
  const goalList = get().goalList;
  if (slug) {
    const currentGoal = goalList.find(goal => goal.id === slug);
    if (currentGoal?.id !== slug) {
      return undefined
    }
    return currentGoal;
  } else {
    const currentTabIndex = get().currentTabIndex;
    return goalList.sort((a, b) => a.index - b.index)[currentTabIndex];
  }
};

const setCurrentTabIndex = (get: () => GoalStore, newTabIndex: number) => {
  const goalList = get().goalList;
  const prevSelectedGoal = goalList[get().currentTabIndex];

  return {
    prevSelectedGoal,
    currentTabIndex: newTabIndex,
  };
}

const useGoalStore = create<GoalStore>((set, get) => ({
  goalList: [baseTab],
  prevSelectedGoal: undefined,
  newGoal(userId: string) {
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
      userId,
    };
    const newGoalList = [...goalList, newGoal];

    const tabIndex = setCurrentTabIndex(get, newIndex);
    set({
      goalList: newGoalList,
      ...tabIndex,
    });

    return newGoal.id;
  },
  deleteGoal(tab: GoalTab) {
    const goalList = get().goalList;
    goalList.splice(tab.index, 1)
    const newGoalList = Array.from(goalList) //goalList.filter(goal => goal.id !== tab.id);

    // Prevent empty tabs
    if (newGoalList.length === 0) {
      set({
        goalList: [baseTab],
        currentTabIndex: 0,
      });
      return;
    }

    // Update the index of the remaining goals
    goalList.forEach((goal, index) => {
      goal.index = index;
    });

    const prevSelectedGoal = get().prevSelectedGoal;
    const prevIndex = newGoalList.findIndex(goal => goal.id === prevSelectedGoal?.id);

    set({
      goalList: newGoalList,
      currentTabIndex: prevIndex !== -1 ? prevIndex : 0,
    });
  },
  selectTab: (index: number) => {
    const goalList = get().goalList;
    const tabIndex = setCurrentTabIndex(get, index);
    set({
      goalList,
      ...tabIndex,
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
  getSelectedGoal(slug: string | undefined = undefined) {
    const currentGoal = getCurrentGoal(get, slug);

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