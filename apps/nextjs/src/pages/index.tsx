// pages/index.tsx

import React from "react";
import type { InferGetStaticPropsType } from "next";
import { get } from "@vercel/edge-config";

import { type CombinedResponse } from "~/utils/openAIUsageAPI";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";

export const getStaticProps = async () => {
  try {
    const openAIUsage = (await get("openAIUsage")) as CombinedResponse;

    return {
      props: {
        openAIUsage,
      },
      // Next.js will attempt to re-generate the page:
      // - When a request comes in
      // - At most once every 60 seconds
      revalidate: 60, // In seconds
    };
  } catch (e) {
    return {
      props: {
        openAIUsage: null,
      },
      revalidate: 1,
    };
  }
};

export default function Home({
  openAIUsage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <MainLayout openAIUsage={openAIUsage}>
      <Title title="🐝 Goal solver" description="" />
      <GoalInput />
    </MainLayout>
  );
}
