// WaggleDance.tsx
import React, { useEffect, useMemo } from "react";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useRouter } from "next/router";
import { TabPanel } from "@mui/joy";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import MainLayout from "~/features/MainLayout";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";

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

export default function WaggleDance({
  openAIUsage,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { goalMap, getSelectedGoal } = useGoalStore();
  const goals = useMemo(() => Array.from(goalMap.values()), [goalMap]);

  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (getSelectedGoal()?.prompt.length ?? 0 == 0) {
      void router.push("/");
    }
  }, [getSelectedGoal, router]);

  return (
    <MainLayout openAIUsage={openAIUsage}>
      {goals.map((tab, index) => (
        <TabPanel key={tab.id} value={index}>
          <WaggleDanceGraph />
        </TabPanel>
      ))}
      {goals.length < 1 && <WaggleDanceGraph />}
    </MainLayout>
  );
}
