import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Card } from "@mui/joy";

import GoalInput from "~/components/GoalInput";
import Title from "~/features/MainLayout/components/PageTitle";
import useGoal, { GoalInputState } from "~/stores/goalStore";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
  onChange: (goal: string) => void;
}

const Home: NextPage = () => {
  const router = useRouter();
  const { goal, setGoal, goalInputState, setGoalInputState } = useGoal();

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    if (goal.trim().length > 0) {
      void router.push("/add-documents");
      setGoalInputState(GoalInputState.refine);
    } else {
      setGoalInputState(GoalInputState.start);
    }

    setGoal(goal);
  };

  const handleInputChange = (goal: string) => {
    setGoal(goal);
  };

  return (
    <Card variant="soft" className="mb-3">
      <Title
        title="🐝 Your goal"
        description="Don't be afraid of being ambitious. We will refine it later."
        hideGoal={true}
      />
      <GoalInput
        state={goalInputState}
        startingValue={goal}
        callbacks={{
          setGoal: handleSetGoal,
          onChange: handleInputChange,
          onStop: () => {
            setGoalInputState(GoalInputState.start);
          },
        }}
      />
    </Card>
  );
};

export default Home;
