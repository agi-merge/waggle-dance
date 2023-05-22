import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Card } from "@mui/joy";

import { app } from "~/constants";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import Title from "~/features/MainLayout/components/PageTitle";
import useApp from "~/stores/appStore";
import useGoal, { GoalInputState } from "~/stores/goalStore";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
  onChange: (goal: string) => void;
}

const Home: NextPage = () => {
  const { setIsAutoStartEnabled } = useApp();
  const router = useRouter();
  const { goal, setGoal, goalInputState, setGoalInputState } = useGoal();

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    if (goal.trim().length > 0) {
      setIsAutoStartEnabled(true);
      void router.push(app.routes.waggle);
      setGoalInputState(GoalInputState.run);
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
        description="Input a goal or task 🍯 that you would like to automate. 🤔 Browse templates below for examples!"
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
