import { type Goal } from ".prisma/client";
import { type Execution } from "@acme/db";
import { v4 } from "uuid";
import { create } from "zustand";

export type GoalPlusExe = Goal & { executions: Execution[] };
export type GoalTabList = GoalPlusExe[];

export interface GoalStore {
  goalList: GoalTabList;
  prevSelectedGoal: Goal | undefined;
  newGoal: () => string;
  deleteGoal: (tab: Goal) => string | undefined;
  selectTab: (index: number) => void;
  upsertGoal: (goal: GoalPlusExe, oldId?: string) => void;
  replaceGoals: (goalList: GoalPlusExe[]) => void;
  currentTabIndex: number;
  getSelectedGoal: (slug?: string | undefined) => GoalPlusExe | undefined;
  getGoalInputValue: () => string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

const baseTab = {
  id: `tempgoal-${v4()}`,
  prompt: "",
  index: 0,
  tooltip: "",
  executions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "",
} as GoalPlusExe;

// Helper function to get the current goal
// If a slug is provided, it will return the goal with that slug
// Otherwise, it will return the goal at the currentTabIndex
// If the slug is invalid, it will return undefined
const getCurrentGoal = (get: () => GoalStore, slug?: string): GoalPlusExe | undefined => {
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
    console.log("newGoal")
    const goalList = get().goalList;
    const id = `tempgoal-${v4()}`;
    const newIndex = goalList.length;
    const newGoal = {
      id,
      prompt: "",
      index: newIndex,
      tooltip: "",
      executions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "",
    } as GoalPlusExe;
    const newGoalList = [...goalList, newGoal];

    const newSelection = getNewSelection(get, newIndex);
    set({
      goalList: newGoalList,
      ...newSelection,
    });

    return newGoal.id;
  },
  deleteGoal(tab: Goal) {
    const goalList = Array.from(get().goalList);
    const tabIndex = goalList.findIndex((g) => g.id === tab.id);
    goalList.splice(tabIndex, 1)
    const newSelection = getNewSelection(get, tabIndex);

    // Prevent empty tabs
    if (goalList.length === 0) {
      set({
        goalList: [baseTab],
        ...newSelection,
      });
      return newSelection.prevSelectedGoal?.id ?? get().prevSelectedGoal?.id ?? (goalList[0] && goalList[0].id);
    }

    const prevSelectedGoal = get().prevSelectedGoal;
    const prevIndex = goalList.findIndex(goal => goal.id === prevSelectedGoal?.id);
    const currentTabIndex = prevIndex === -1 ? tabIndex : prevIndex;
    set({
      goalList,
      currentTabIndex,
    });
    return prevSelectedGoal?.id ?? get().prevSelectedGoal?.id ?? (goalList[0] && goalList[0].id);
  },
  selectTab: (index: number) => {
    const goalList = get().goalList;
    const tabIndex = getNewSelection(get, index);
    set({
      goalList,
      ...tabIndex,
    });
  },
  upsertGoal(goal: GoalPlusExe, oldId?: string) {
    const goalList = get().goalList;
    const tabIndex = goalList.findIndex((g) => g.id === goal.id || g.id === oldId);
    const newGoalList = Array.from(goalList);
    if (tabIndex === -1) {
      newGoalList.push(goal);
    } else {
      newGoalList[tabIndex] = goal;
    }
    const newSelection = getNewSelection(get, tabIndex);

    set({
      goalList: newGoalList,
      ...newSelection,
    });
  },
  replaceGoals(historicGoals) {
    const now = new Date();

    if (historicGoals && historicGoals.length > 0) {
      const goalList = historicGoals.map((goal) => ({
        id: goal.id,
        prompt: goal.prompt,
        executions: goal.executions,
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