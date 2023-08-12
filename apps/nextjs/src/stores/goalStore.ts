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
  selectedGoal: GoalPlusExe | undefined;
  prevSelectedGoal: GoalPlusExe | undefined;
  newGoal: () => string;
  deleteGoal: (id: string) => void;
  selectGoal: (id: string) => void;
  upsertGoal: (goal: GoalPlusExe) => void;
  replaceGoals: (goalList: GoalPlusExe[]) => void;
  getGoalInputValue: () => string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

export const draftGoalPrefix = "draft-";
export const newDraftGoal = () => `${draftGoalPrefix}${v4()}`;
export const newDraftGoalRoute = () => routes.goal(newDraftGoal());

const baseTab = {
  id: newDraftGoal(),
  prompt: "",
  tooltip: "",
  executions: [],
  results: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "",
} as GoalPlusExe;

const useGoalStore = (name?: string) =>
  create(
    persist<GoalStore>(
      (set, get) => ({
        goalList: [baseTab],
        selectedGoal: baseTab,
        prevSelectedGoal: undefined,
        newGoal() {
          const id = newDraftGoal();
          const newGoal = {
            ...baseTab,
            id,
            index: get().goalList.length,
          };
          set((state) => ({
            goalList: [...state.goalList, newGoal],
            selectedGoal: newGoal,
            prevSelectedGoal: state.selectedGoal,
          }));
          return id;
        },
        deleteGoal(id: string) {
          set((state) => {
            const goalList = state.goalList.filter((g) => g.id !== id);
            const selectedGoal =
              state.selectedGoal?.id === id
                ? state.prevSelectedGoal
                : state.selectedGoal;
            return {
              goalList,
              selectedGoal,
              prevSelectedGoal:
                state.prevSelectedGoal?.id === id
                  ? undefined
                  : state.prevSelectedGoal,
            };
          });
        },
        selectGoal(id: string) {
          const goal = get().goalList.find((g) => g.id === id);
          if (!goal) {
            throw new Error("Invalid goal ID");
          }
          set((state) => ({
            selectedGoal: goal,
            prevSelectedGoal: state.selectedGoal,
          }));
        },
        upsertGoal(goal: GoalPlusExe) {
          set((state) => {
            const goalList = state.goalList;
            const index = goalList.findIndex((g) => g.id === goal.id);
            if (index > -1) {
              goalList[index] = goal;
            } else {
              goalList.push(goal);
            }
            return {
              goalList,
              selectedGoal:
                state.selectedGoal?.id === goal.id ? goal : state.selectedGoal,
              prevSelectedGoal:
                state.prevSelectedGoal?.id === goal.id
                  ? goal
                  : state.prevSelectedGoal,
            };
          });
        },
        replaceGoals(newGoals: GoalPlusExe[]) {
          set((state) => {
            const goalList = [
              ...newGoals,
              ...state.goalList.filter((g) => g.id.startsWith(draftGoalPrefix)),
            ];
            return {
              goalList,
              selectedGoal: goalList.find(
                (g) => g.id === state.selectedGoal?.id,
              ),
              prevSelectedGoal: goalList.find(
                (g) => g.id === state.prevSelectedGoal?.id,
              ),
            };
          });
        },
        getGoalInputValue() {
          return get().selectedGoal?.prompt || "";
        },
        setGoalInputValue(newGoalInputValue: string) {
          set((state) => {
            if (state.selectedGoal) {
              const goalList = [...state.goalList];
              const index = goalList.findIndex(
                (g) => g.id === state.selectedGoal?.id,
              );
              if (index > -1 && index < goalList.length) {
                const goal = goalList[index]!;
                const updatedGoal = {
                  ...goal,
                  prompt: newGoalInputValue,
                };
                goalList[index] = updatedGoal;
                return {
                  goalList,
                  selectedGoal: updatedGoal,
                  prevSelectedGoal:
                    state.prevSelectedGoal?.id === updatedGoal.id
                      ? updatedGoal
                      : state.prevSelectedGoal,
                };
              }
            }
            return state;
          });
        },
      }),
      {
        name: name ?? app.localStorageKeys.goal,
        storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
      },
    ),
  )();

export default useGoalStore;
