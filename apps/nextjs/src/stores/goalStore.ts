import { create } from "zustand";

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

const useGoal = create<GoalState>((set) => ({
  goal: "",
  setGoal: (newState) => set({ goal: newState }),
  goalInputState: GoalInputState.start,
  setGoalInputState: (newState) => set({ goalInputState: newState }),
}))

export default useGoal;