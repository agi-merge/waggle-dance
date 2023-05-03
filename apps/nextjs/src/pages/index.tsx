import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";

import GoalInput from "~/components/GoalInput";
import MainLayout from "~/MainLayout";
import { GoalInputState, useAppContext } from "./_app";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

const Home: NextPage = () => {
  const router = useRouter();
  const { setGoal, goalInputState, setGoalInputState } = useAppContext();

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    if (goal.trim().length > 0) {
      router.push("/add-documents");
      setGoalInputState(GoalInputState.refine);
    } else {
      setGoalInputState(GoalInputState.start);
    }

    setGoal(goal);
  };
  return (
    <>
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
    </>
  );
};

export default Home;
