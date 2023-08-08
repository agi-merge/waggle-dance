// stores/goalStore.ts

import { v4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type Execution, type Goal, type Result } from "@acme/db";

import routes from "~/utils/routes";
import { app } from "~/constants";

export type GoalPlusExe = Goal & { executions: Execution[]; results: Result[] };

export interface GoalStore {
  goalList: GoalPlusExe[];
  prevSelectedGoal: Goal | undefined;
  newGoal: () => string;
  deleteGoal: (
    tab: Goal,
  ) => { prevId: string | undefined; goalList: GoalPlusExe[] } | undefined;
  selectTab: (index: number) => void;
  selectGoal: (id?: string | undefined) => void;
  upsertGoal: (goal: GoalPlusExe, oldId?: string) => void;
  replaceGoals: (goalList: GoalPlusExe[]) => void;
  currentTabIndex: number;
  getSelectedGoal: (slug?: string | undefined) => GoalPlusExe | undefined;
  getGoalInputValue: () => string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

export const draftGoalPrefix = "draft-";
export const newDraftGoal = () => `${draftGoalPrefix}${v4()}`;
export const newDraftGoalRoute = () => routes.goal(newDraftGoal());

const baseTab = {
  id: newDraftGoal(),
  prompt: "",
  index: 0,
  tooltip: "",
  executions: [],
  results: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "",
} as GoalPlusExe;

// Helper function to get the current goal
// If a slug is provided, it will return the goal with that slug
// Otherwise, it will return the goal at the currentTabIndex
// If the slug is invalid, it will return undefined
const getCurrentGoal = (
  get: () => GoalStore,
  slug?: string,
): GoalPlusExe | undefined => {
  const goalList = get().goalList;
  if (slug) {
    const currentGoal = goalList.find((goal) => goal.id === slug);
    if (currentGoal?.id !== slug) {
      return undefined;
    }
    return currentGoal;
  } else {
    const currentTabIndex = get().currentTabIndex;
    return goalList[currentTabIndex];
  }
};

const getNewSelection = (get: () => GoalStore, newTabIndex: number) => {
  const store = get();
  const goalList = store.goalList;
  const prevSelectedGoal = goalList[store.currentTabIndex];

  return {
    prevSelectedGoal,
    currentTabIndex: newTabIndex,
  };
};

const useGoalStore = (name?: string) =>
  create(
    persist<GoalStore>(
      (set, get) => ({
        goalList: [baseTab],
        prevSelectedGoal: undefined,
        newGoal() {
          console.log("newGoal");
          const goalList = get().goalList;
          const id = newDraftGoal();
          const newIndex = goalList.length;
          const newGoal = {
            id,
            prompt: "",
            index: newIndex,
            tooltip: "",
            executions: [],
            results: [],
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
          const goalList = get().goalList;
          const tabIndex = goalList.findIndex((g) => g.id === tab.id);
          goalList.splice(tabIndex, 1);
          const newSelection = getNewSelection(get, tabIndex);

          // Prevent empty tabs
          if (goalList.length === 0) {
            set({
              goalList: [baseTab],
              currentTabIndex: 0,
              prevSelectedGoal: undefined,
            });
            return {
              prevId:
                newSelection.prevSelectedGoal?.id ??
                get().prevSelectedGoal?.id ??
                (goalList[0] && goalList[0].id),
              goalList: [baseTab],
            };
          }

          const prevSelectedGoal = get().prevSelectedGoal;
          const prevIndex = goalList.findIndex(
            (goal) => goal.id === prevSelectedGoal?.id,
          );
          const currentTabIndex = prevIndex === -1 ? tabIndex : prevIndex;
          set({
            goalList,
            currentTabIndex,
          });
          return {
            prevId:
              prevSelectedGoal?.id ??
              get().prevSelectedGoal?.id ??
              (goalList[0] && goalList[0].id),
            goalList,
          };
        },
        selectTab: (index: number) => {
          const tabIndex = getNewSelection(get, index);
          set({
            ...tabIndex,
          });
        },
        selectGoal(id?: string) {
          const goalList = get().goalList;
          const tabIndex = goalList.findIndex((g) => g.id === id);
          const newTabIndex = getNewSelection(get, tabIndex);
          set({
            ...newTabIndex,
          });
        },
        upsertGoal(goal: GoalPlusExe, oldId?: string) {
          const goalList = get().goalList;
          const tabIndex = goalList.findIndex(
            (g) => g.id === goal.id || g.id === oldId,
          );
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
          const goalList = get().goalList;
        replaceGoals(newGoals) {
          const drafts = goalList.filter((goal) =>
            goal.id.startsWith(draftGoalPrefix),
          );

            const goalList = historicGoals.concat(drafts);
          if (newGoals && newGoals.length > 0) {
            const { prevSelectedGoal } = getNewSelection(get, 0);

            const prevGoalIfStillHere = goalList.findIndex(
              (g) => g.id == prevSelectedGoal?.id,
            );

            if (goalList)
              set({
                goalList,
                currentTabIndex:
                  prevGoalIfStillHere > -1 ? prevGoalIfStillHere : 0,
              });
          }
        },
        currentTabIndex: 0,
        getSelectedGoal(slug: string | undefined = undefined) {
          return getCurrentGoal(get, slug);
        },
        getGoalInputValue() {
          const currentGoal = getCurrentGoal(get);
          return currentGoal ? currentGoal.prompt : "";
        },
        setGoalInputValue(newGoalInputValue) {
          const goalList = get().goalList;
          const currentTabIndex = get().currentTabIndex;
          const currentGoal = getCurrentGoal(get);

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
      }),
      {
        name: name ?? app.localStorageKeys.goal,
        storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
      },
    ),
  )();

export default useGoalStore;
