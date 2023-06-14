// pages/index.tsx

import React from "react";
import type { InferGetStaticPropsType } from "next";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";

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
  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    <MainLayout openAIUsage={openAIUsage}>
      <Title title="🐝 Goal solver" description="" />
      <GoalInput />
    </MainLayout>
  );
}
