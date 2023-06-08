// pages/index.tsx

import React from "react";
import type { InferGetStaticPropsType } from "next";
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
  onChange: (goal: string) => void;
}

export const getStaticProps = async () => {
  const startDate = new Date();

  try {
    const openAIUsage: CombinedResponse | null = await getOpenAIUsage(
      startDate,
    );

    return {
      props: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        openAIUsage: JSON.parse(JSON.stringify(openAIUsage)),
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    <MainLayout openAIUsage={openAIUsage}>
      <Title title="🐝 Goal solver" description="" hideGoal={true} />
      <GoalInput
        startingValue={goal}
        callbacks={{
          setGoal: handleSetGoal,
          onChange: handleInputChange,
        }}
      />
    </MainLayout>
  );
}
