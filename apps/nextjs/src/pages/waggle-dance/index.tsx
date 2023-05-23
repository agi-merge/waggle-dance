// WaggleDance.tsx
import React, { useEffect } from "react";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useRouter } from "next/router";
import { Card } from "@mui/joy";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import MainLayout from "~/features/MainLayout";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoal from "~/stores/goalStore";

export async function getServerSideProps(context: GetServerSidePropsContext) {
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

  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      void router.push("/");
    }
  }, [goal, router]);

  return (
    <MainLayout openAIUsage={openAIUsage}>
      <Card variant="soft" className="mb-3">
        <WaggleDanceGraph />
      </Card>
    </MainLayout>
  );
}
