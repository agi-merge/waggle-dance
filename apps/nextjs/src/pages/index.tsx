// pages/index.tsx

import React, { useEffect } from "react";
import type { InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { api } from "~/utils/api";
import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import { app } from "~/constants";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import HistoryTabber from "~/features/WaggleDance/components/HistoryTabber";
import useGoal from "~/stores/goalStore";
import useHistory from "~/stores/historyStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
  onChange: (goal: string) => void;
}

export async function getStaticProps() {
  const startDate = new Date();

  const openAIUsage: CombinedResponse | null = await getOpenAIUsage(
    startDate,
  ).catch(() => null);

  return {
    props: {
      openAIUsage,
    },
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 10 seconds
    revalidate: 300, // In seconds
  };
}

export default function Home({
  openAIUsage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { setIsAutoStartEnabled } = useWaggleDanceMachineStore();
  const router = useRouter();
  const { goal, setGoal } = useGoal();
  const { data: sessionData } = useSession();
  const { historyData, initializeHistoryData } = useHistory();
  const { data: historicGoals, refetch } = api.goal.topByUser.useQuery(
    undefined,
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        console.log("Success!", data);
      },
    },
  );

  // Initialize history data based on whether the user is logged in or not
  // If not, the + button will ask the user to log in
  useEffect(() => {
    const handleHistoricGoals = async () => {
      if (!historicGoals) await refetch();
      initializeHistoryData(sessionData, historicGoals);
    };
    void handleHistoricGoals();
  }, [sessionData, historicGoals, initializeHistoryData, refetch]);

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
      <HistoryTabber tabs={historyData.tabs}>
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
      </HistoryTabber>
    </MainLayout>
  );
}
