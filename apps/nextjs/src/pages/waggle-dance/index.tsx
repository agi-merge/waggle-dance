// WaggleDance.tsx
import React, { useEffect } from "react";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useRouter } from "next/router";
import { TabPanel } from "@mui/joy";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import MainLayout from "~/features/MainLayout";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoal from "~/stores/goalStore";
import useHistory from "~/stores/historyStore";

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
  const { goal } = useGoal();
  const { historyData } = useHistory();

  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      void router.push("/");
    }
  }, [goal, router]);

  return (
    <MainLayout openAIUsage={openAIUsage}>
      {historyData.tabs.map((tab, index) => (
        <TabPanel key={tab.id} value={index}>
          <WaggleDanceGraph />
        </TabPanel>
      ))}
    </MainLayout>
  );
}
