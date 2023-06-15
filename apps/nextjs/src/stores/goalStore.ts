import { type Goal } from ".prisma/client";
import { v4 } from "uuid";
import { create } from "zustand";

export type GoalTabList = Goal[];

export interface GoalStore {
  goalList: GoalTabList;
  prevSelectedGoal: Goal | undefined;
  newGoal: (userId: string) => string;
  deleteGoal: (tab: Goal) => void;
  selectTab: (index: number) => void;
  upsertGoal: (goal: Goal) => void;
  replaceGoals: (goalList: Goal[]) => void;
  mergeGoals: (historicGoals?: Goal[]) => void;
  currentTabIndex: number;
  getSelectedGoal: (slug?: string | undefined) => Goal | undefined;
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
} as Goal;

// Helper function to get the current goal
// If a slug is provided, it will return the goal with that slug
// Otherwise, it will return the goal at the currentTabIndex
// If the slug is invalid, it will return undefined
const getCurrentGoal = (get: () => GoalStore, slug?: string): Goal | undefined => {
  const goalList = get().goalList;
  if (slug) {
    const currentGoal = goalList.find(goal => goal.id === slug);
    if (currentGoal?.id !== slug) {
      return undefined
    }
    return currentGoal;
  } else {
    const currentTabIndex = get().currentTabIndex;
    return goalList[currentTabIndex];
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

    const tabIndex = setCurrentTabIndex(get, newIndex);
    set({
      goalList: newGoalList,
      ...tabIndex,
    });

    return newGoal.id;
  },
  deleteGoal(tab: Goal) {
    const goalList = get().goalList;
    const tabIndex = goalList.indexOf(tab);
    goalList.splice(tabIndex, 1)
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
    // goalList.forEach((goal, index) => {
    //   goal.index = index;
    // });

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
  mergeGoals(savedGoals) {
    // const now = new Date();
    const goalList = get().goalList;
    if (savedGoals && savedGoals.length > 0) {

      const combinedGoals = [...savedGoals]
      const goalIds = new Set(savedGoals.map((goal) => goal.id));

      for (const goal of goalList) {
        goalIds.has(goal.id) && combinedGoals.push(goal)
      }

      // const newGoalList = Array.from(goalList).map((goal, index) => {
      //   // if (goal) {
      //   //   index = (goal).index
      //   // }
      //   return { ...goal, index, tooltip: goal.prompt }
      // });

      set({
        goalList: combinedGoals,
      });
    }
  },
  upsertGoal(goal: Goal) {
    const goalList = get().goalList;
    const tabIndex = goalList.findIndex((g) => g.id === goal.id);
    const newGoalList = Array.from(goalList);
    if (tabIndex === -1) {
      newGoalList.push(goal);
    } else {
      newGoalList[tabIndex] = goal;
    }

    set({
      goalList: newGoalList,
    });
  },
  replaceGoals(historicGoals) {
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
    return getCurrentGoal(get, slug);;
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