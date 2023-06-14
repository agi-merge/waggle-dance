// pages/goal/[tabId].tsx

import React, { useEffect } from "react";
import type { GetStaticPaths, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import MainLayout from "~/features/MainLayout";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";

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
export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  return {
    paths: [], //indicates that no page needs be created at build time
    fallback: "blocking", //indicates the type of fallback
  };
};
export default function GoalTab({
  openAIUsage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const { tabId } = router.query;
  const { goalList } = useGoalStore();

  // useEffect(() => {
  //   // Redirect if the goal is undefined or empty
  //   if (!tabId || goalList.length === 0) {
  //     void router.push("/");
  //   }
  // }, [tabId, goalList, router]);

  return (
    <MainLayout openAIUsage={openAIUsage}>
      <WaggleDanceGraph />
    </MainLayout>
  );
}
