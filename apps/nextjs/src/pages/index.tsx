import React from "react";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useRouter } from "next/router";
import { Card } from "@mui/joy";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import { app } from "~/constants";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import useApp from "~/stores/appStore";
import useGoal, { GoalInputState } from "~/stores/goalStore";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
  onChange: (goal: string) => void;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  console.log("getServerSideProps", context.req.headers.cookie);
  const startDate = new Date();

  const openAIUsage: CombinedResponse | null = await getOpenAIUsage(
    startDate,
  ).catch(() => null);

  return {
    props: {
      openAIUsage,
    },
  };
}

export default function Home({
  openAIUsage,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
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
    <MainLayout openAIUsage={openAIUsage}>
      <Card variant="soft">
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
    </MainLayout>
  );
}
