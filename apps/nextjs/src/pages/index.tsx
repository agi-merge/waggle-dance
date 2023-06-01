// pages/index.tsx

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
import useGoal from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
  onChange: (goal: string) => void;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  context.res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=300",
  );
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
  const { setIsAutoStartEnabled } = useWaggleDanceMachineStore();
  const router = useRouter();
  const { goal, setGoal } = useGoal();

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    if (goal.trim().length > 0) {
      setIsAutoStartEnabled(true);
      void router.push(app.routes.waggle);
    }

    setGoal(goal.trim().replaceAll("{", "(").replaceAll("}", ")"));
  };

  const handleInputChange = (goal: string) => {
    setGoal(goal);
  };

  return (
    <MainLayout openAIUsage={openAIUsage}>
      <Card variant="soft">
        <Title
          title="🐝 Goal solver"
          description="Input a goal or task 🍯 that you would like to automate. 🤔 Browse templates below for examples!"
          hideGoal={true}
        />
        <GoalInput
          startingValue={goal}
          callbacks={{
            setGoal: handleSetGoal,
            onChange: handleInputChange,
            onStop: () => {
              /* do nothing */
            },
          }}
        />
      </Card>
    </MainLayout>
  );
}
