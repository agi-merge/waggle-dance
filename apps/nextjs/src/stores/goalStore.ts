// stores/goalStore.ts

import { v4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type GoalPlusExe } from "@acme/db";

import routes from "~/utils/routes";
import { app } from "~/constants";

export interface GoalStore {
  getState: () => GoalStore;
  goalMap: Record<string, GoalPlusExe>;
  selectedGoal: GoalPlusExe | undefined;
  prevSelectedGoal: GoalPlusExe | undefined;
  newGoal: () => string;
  deleteGoal: (id: string) => void;
  selectGoal: (id: string) => void;
  upsertGoal: (goal: GoalPlusExe, replaceDraftId?: string | null) => void;
  upsertGoals: (goals: Record<string, GoalPlusExe> | GoalPlusExe[]) => void;
  getGoalInputValue: () => string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

export const draftGoalPrefix = "draft-";
export const newDraftGoal = () => `${draftGoalPrefix}${v4()}`;
export const newDraftGoalRoute = () => routes.goal(newDraftGoal());

const baseGoal = {
  id: newDraftGoal(),
  prompt: "",
  tooltip: "",
  executions: [],
  results: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "",
} as GoalPlusExe;

const useGoalStore = () =>
  create(
    persist<GoalStore>(
      (set, get) => ({
        getState: get,
        goalMap: { [baseGoal.id]: baseGoal },
        selectedGoal: baseGoal,
        prevSelectedGoal: undefined,
        newGoal() {
          return newGoalInner(set);
        },
        deleteGoal(id: string) {
          set((state) => {
            const { [id]: _, ...goalMap } = state.goalMap;
            const selectedGoal =
              state.selectedGoal?.id === id
                ? state.prevSelectedGoal
                : state.selectedGoal;
            return {
              goalMap,
              selectedGoal,
              prevSelectedGoal:
                state.prevSelectedGoal?.id === id
                  ? undefined
                  : state.prevSelectedGoal,
            };
          });
        },
        selectGoal(id: string) {
          const goalMap = get().goalMap;
          const goal = goalMap[id];
          if (!goal) {
            if (Object.values(goalMap).length > 0) {
              set((state) => ({
                selectedGoal: Object.values(state.goalMap)[0]?.id
                  ? state.goalMap[Object.values(state.goalMap)[0]!.id]
                  : undefined,
                prevSelectedGoal: undefined,
              }));
            } else {
              set({ prevSelectedGoal: undefined });
              newGoalInner(set);
            }
          } else {
            set((state) => ({
              selectedGoal: goal,
              prevSelectedGoal: state.selectedGoal,
            }));
          }
        },
        upsertGoal(goal: GoalPlusExe, replaceDraftId?: string | null) {
          set((state) => {
            const goalMap = { ...state.goalMap, [goal.id]: goal };

            // If replaceDraftId is provided, remove it from the goalMap
            if (replaceDraftId) {
              delete goalMap[replaceDraftId];
            }

            return {
              goalMap,
              selectedGoal: replaceDraftId
                ? goal
                : state.selectedGoal?.id === goal.id
                ? goal
                : state.selectedGoal,
              prevSelectedGoal:
                state.prevSelectedGoal?.id === goal.id
                  ? goal
                  : state.prevSelectedGoal,
            };
          });
        },
        upsertGoals(goals: Record<string, GoalPlusExe> | GoalPlusExe[]) {
          set((state) => {
            let newGoalsMap: Record<string, GoalPlusExe>;

            // Use type guard to check if goals is an array or map
            if (Array.isArray(goals)) {
              newGoalsMap = goals.reduce(
                (map, goal) => {
                  map[goal.id] = goal;
                  return map;
                },
                {} as Record<string, GoalPlusExe>,
              );
            } else {
              newGoalsMap = goals;
            }

            const goalMap = {
              ...newGoalsMap,
              ...Object.fromEntries(
                Object.entries(state.goalMap).filter(([id]) =>
                  id.startsWith(draftGoalPrefix),
                ),
              ),
            };
            return {
              goalMap,
              selectedGoal: state.selectedGoal?.id
                ? goalMap[state.selectedGoal.id]
                : undefined,
              prevSelectedGoal: state.prevSelectedGoal?.id
                ? goalMap[state.prevSelectedGoal.id]
                : undefined,
            };
          });
        },
        getGoalInputValue() {
          return get().selectedGoal?.prompt || "";
        },
        setGoalInputValue(newGoalInputValue: string) {
          set((state) => {
            if (state.selectedGoal) {
              const goal = state.goalMap[state.selectedGoal.id];
              if (goal) {
                const updatedGoal = {
                  ...goal,
                  prompt: newGoalInputValue,
                };
                return {
                  goalMap: { ...state.goalMap, [updatedGoal.id]: updatedGoal },
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
        name: app.localStorageKeys.goal,
        storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
      },
    ),
  )();

export default useGoalStore;
function newGoalInner(
  set: (
    partial:
      | GoalStore
      | Partial<GoalStore>
      | ((state: GoalStore) => GoalStore | Partial<GoalStore>),
    replace?: boolean | undefined,
  ) => void,
) {
  const id = newDraftGoal();
  const newGoal = {
    ...baseGoal,
    id,
  };
  set((state) => ({
    goalMap: { ...state.goalMap, [id]: newGoal },
    selectedGoal: newGoal,
    prevSelectedGoal: state.selectedGoal,
  }));
  return id;
}
