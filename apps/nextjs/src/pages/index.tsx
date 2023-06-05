// pages/index.tsx

import React, { useEffect } from "react";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useRouter } from "next/router";
import { Card, Stack } from "@mui/joy";
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
      {historyData.tabs.length > 1 && ( // would be zero, except faked "+" as a tab
        <Stack
          direction="row"
          gap="0.5rem"
          className="items-left justify-left mb-2 flex"
        >
          <HistoryTabber tabs={historyData.tabs} />
        </Stack>
      )}
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
