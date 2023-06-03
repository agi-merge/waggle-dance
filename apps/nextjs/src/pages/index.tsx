// pages/index.tsx

import React from "react";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useRouter } from "next/router";
import { Card, Stack } from "@mui/joy";
import { useSession } from "next-auth/react";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import { app } from "~/constants";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import HistoryTabber, {
  HistoryTab,
} from "~/features/WaggleDance/components/HistoryTabber";
import useGoal from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

const tabsDebug: HistoryTab[] = [
  {
    index: 0,
    label: "First tab",
    selectedByDefault: true,
  },
  {
    index: 1,
    label: "Second tab",
  },
  {
    index: 2,
    label: "Third tab",
  },
];

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
  const { data: sessionData } = useSession();

  console.log("👋 Hey there!", sessionData);

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
      <Stack
        direction="row"
        gap="0.5rem"
        className="items-left justify-left mb-2 flex"
      >
        <HistoryTabber tabs={tabsDebug} />
      </Stack>
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
