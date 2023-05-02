import React from "react";
import type { NextPage } from "next";

import GoalInput from "~/components/GoalInput";
import GoalWorkspace from "~/components/GoalWorkspace";
import MainLayout from "~/MainLayout";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

export enum GoalInputState {
  start,
  refine,
  configure,
  run,
  done,
}

const Home: NextPage = () => {
  const [goalInputState, setGoalInputState] = React.useState(
    GoalInputState.start,
  );
  const [newGoal, setNewGoal] = React.useState("");

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    console.log("Goal set:", goal);
    if (goal.trim().length > 0) {
      setGoalInputState(GoalInputState.refine);
      setNewGoal(goal);
    } else {
      setGoalInputState(GoalInputState.start);
    }
    // Do something with the goal, e.g., setState or call an API
  };
  return (
    <MainLayout>
      {goalInputState !== GoalInputState.start && (
        <GoalWorkspace goal={newGoal} />
      )}
      {goalInputState === GoalInputState.start && (
        <GoalInput
          state={goalInputState}
          callbacks={{
            setGoal: handleSetGoal,
            onStop: () => {
              setGoalInputState(GoalInputState.start);
            },
          }}
        />
      )}
    </MainLayout>
  );
};

export default Home;
