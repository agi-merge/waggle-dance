import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { app } from "~/constants";

export interface GoalState {
  goal: string;
  setGoal: (newState: string) => void;
}

const useGoal = create(
  persist<GoalState>(
    (set, _get) => ({
      goal: "",
      setGoal: (newState: string) => set({ goal: newState }),
    }),
    {
      name: app.localStorageKeys.goal,
      storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
    }
  )
)

export default useGoal;