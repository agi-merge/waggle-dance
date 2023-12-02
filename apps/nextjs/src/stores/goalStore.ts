// stores/goalStore.ts

import { v4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { GoalPlusExe } from "@acme/db";

import { app } from "~/constants";
import routes from "~/utils/routes";

export interface GoalStore {
  goalMap: Record<string, GoalPlusExe>;
  selectedGoal: GoalPlusExe | undefined;
  prevSelectedGoal: GoalPlusExe | undefined;
  newDraftGoalId: () => string;
  deleteGoalId: (id: string) => void;
  selectGoalId: (id: string) => void;
  upsertGoal: (goal: GoalPlusExe, replaceDraftId?: string | null) => void;
  upsertGoals: (goals: Record<string, GoalPlusExe> | GoalPlusExe[]) => void;
  getGoalInputValue: () => string;
  setGoalInputValue: (newGoalInputValue: string) => void;
}

export const draftGoalPrefix = "draft-";
export const newDraftGoalId = () => `${draftGoalPrefix}${v4()}`;
export const newDraftGoalRoute = () => routes.goal({ id: newDraftGoalId() });

const baseGoal = () => {
  return {
    id: newDraftGoalId(),
    prompt: "",
    tooltip: "",
    executions: [],
    results: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "",
  } as GoalPlusExe;
};

const defaultGoal1 = baseGoal();
const defaultGoal2 = baseGoal();

const useGoalStore = () =>
  create(
    persist<GoalStore>(
      (set, get) => ({
        goalMap: {
          [defaultGoal1.id]: defaultGoal1,
          [defaultGoal2.id]: defaultGoal2,
        },
        selectedGoal: defaultGoal1,
        prevSelectedGoal: undefined,
        newDraftGoalId() {
          return newGoalInner(set);
        },
        deleteGoalId(id: string) {
          set((state) => {
            const { [id]: _, ...goalMap } = state.goalMap;
            let selectedGoal =
              state.selectedGoal?.id === id
                ? state.prevSelectedGoal
                : state.selectedGoal;
            if (Object.keys(goalMap).length === 0) {
              const newId = newGoalInner(set);
              selectedGoal = goalMap[newId];
            }
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
        selectGoalId(id: string) {
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

            // if server goals are not empty,
            // if the goal map only contains the initial nodes,
            // then we are adding goals from the server, and can remove those nodes
            if (
              Object.keys(goals).length > 0 &&
              state.goalMap[defaultGoal1.id] &&
              state.goalMap[defaultGoal2.id] &&
              Object.keys(state.goalMap).length === 2
            ) {
              delete state.goalMap[defaultGoal1.id];
              delete state.goalMap[defaultGoal2.id];
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
          return get().selectedGoal?.prompt ?? "";
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
  const id = newDraftGoalId();
  const newGoal = {
    ...baseGoal(),
    id,
  };
  set((state) => ({
    goalMap: { ...state.goalMap, [id]: newGoal },
    selectedGoal: newGoal,
    prevSelectedGoal: state.selectedGoal,
  }));
  return id;
}
