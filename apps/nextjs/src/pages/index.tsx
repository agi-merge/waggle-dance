import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";

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
  const router = useRouter();
  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    console.log("Goal set:", goal);
    if (goal.trim().length > 0) {
      router.push("/add-documents");
      setGoalInputState(GoalInputState.refine);
      setNewGoal(goal);
    } else {
      setGoalInputState(GoalInputState.start);
    }
    // Do something with the goal, e.g., setState or call an API
  };
  return (
    <MainLayout>
      {/* {goalInputState === GoalInputState.start && ( */}
      <GoalInput
        state={goalInputState}
        callbacks={{
          setGoal: handleSetGoal,
          onStop: () => {
            setGoalInputState(GoalInputState.start);
          },
        }}
      />
      {/* )} */}
    </MainLayout>
  );
};

export default Home;
