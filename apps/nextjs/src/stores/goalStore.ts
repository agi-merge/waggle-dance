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

const getNewSelection = (get: () => GoalStore, newTabIndex: number) => {
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

    const tabIndex = getNewSelection(get, newIndex);
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
    const prevTab = getNewSelection(get, tabIndex);

    // Prevent empty tabs
    if (goalList.length === 0) {
      set({
        goalList: [baseTab],
        ...prevTab,
      });
      return;
    }

    // Update the index of the remaining goals
    // goalList.forEach((goal, index) => {
    //   goal.index = index;
    // });

    const prevSelectedGoal = get().prevSelectedGoal;
    const prevIndex = goalList.findIndex(goal => goal.id === prevSelectedGoal?.id);

    set({
      goalList,
      currentTabIndex: prevIndex !== -1 ? prevIndex : 0,
    });
  },
  selectTab: (index: number) => {
    const goalList = get().goalList;
    const tabIndex = getNewSelection(get, index);
    set({
      goalList,
      ...tabIndex,
    });
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
      const goalList = historicGoals.map((goal) => ({
        id: goal.id,
        prompt: goal.prompt,
        createdAt: now,
        updatedAt: now,
        userId: goal.userId,
      }));
      const tabIndex = getNewSelection(get, 0);
      set({
        goalList,
        ...tabIndex,
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