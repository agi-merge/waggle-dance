// pages/index.tsx

import React from "react";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";

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

export const getStaticProps: GetStaticProps<{
  openAIUsage: CombinedResponse | null;
}> = async () => {
  const startDate = new Date();

  try {
    const openAIUsage: CombinedResponse | null = await getOpenAIUsage(
      startDate,
    );

    return {
      props: {
        openAIUsage,
      },
      // Next.js will attempt to re-generate the page:
      // - When a request comes in
      // - At most once every 10 seconds
      revalidate: 300, // In seconds
    };
  } catch (e) {
    return {
      props: {
        openAIUsage: null,
      },
      revalidate: 0,
    };
  }
};

export default function Home({
  openAIUsage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
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
      <Title title="🐝 Goal solver" description="" hideGoal={true} />
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
    </MainLayout>
  );
}
