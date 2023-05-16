import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { app } from "~/constants";

export enum GoalInputState {
  start,
  refine,
  configure,
  run,
  done,
}

export interface GoalState {
  goal: string;
  setGoal: (newState: string) => void;
  goalInputState: GoalInputState;
  setGoalInputState: (newState: GoalInputState) => void;
}

const useGoal = create(
  persist(
    (set, _get) => ({
      goal: "",
      setGoal: (newState: string) => set({ goal: newState }),
      goalInputState: GoalInputState.start,
      setGoalInputState: (newState: GoalInputState) => set({ goalInputState: newState }),
    }),
    {
      name: app.localStorageKeys.goal,
      storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
    }
  )
)

export default useGoal;