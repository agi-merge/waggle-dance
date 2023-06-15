// pages/goal/[tabId].tsx

import React, { useEffect, useMemo } from "react";
import type { GetStaticPaths, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";

export const getStaticProps = async (): Promise<{
  props: {
    openAIUsage: CombinedResponse | null;
  };
  revalidate: number;
}> => {
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
export const getStaticPaths: GetStaticPaths<{ slug: string }> = () => {
  return {
    paths: [], //indicates that no page needs be created at build time
    fallback: "blocking", //indicates the type of fallback
  };
};
export default function GoalTab({
  openAIUsage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const { slug } = router.query;
  const { getSelectedGoal, prevSelectedGoal, goalList } = useGoalStore();
  const cleanedSlug = useMemo(() => {
    if (typeof slug === "string") {
      return slug;
    } else if (Array.isArray(slug)) {
      return slug[0];
    } else {
      return slug;
    }
    return "";
  }, [slug]) as string;
  const selectedGoal = useMemo(
    () => getSelectedGoal(cleanedSlug),
    [getSelectedGoal, cleanedSlug],
  );

  const state = useMemo(() => {
    return selectedGoal?.userId && selectedGoal?.userId.trim().length > 0
      ? "graph"
      : "input";
  }, [selectedGoal?.userId]);

  useEffect(() => {
    if (!selectedGoal) {
      console.log("no selectedGoal but prevGoal", prevSelectedGoal?.id);
      if (prevSelectedGoal?.id) {
        void router.replace(`/goal/${prevSelectedGoal?.id}`);
      }
    }
  }, [goalList, selectedGoal, prevSelectedGoal?.id, router]);

  return (
    <MainLayout openAIUsage={openAIUsage}>
      <>
        {(selectedGoal?.userId &&
          selectedGoal.userId.trim().length > 0 &&
          selectedGoal.userId) ||
          "N/A"}
        {state === "input" ? (
          <>
            <Title title="🐝 Goal solver" description="" />
            <GoalInput />
          </>
        ) : (
          <WaggleDanceGraph key={cleanedSlug} />
        )}
      </>
    </MainLayout>
  );
}
