// pages/goal/[tabId].tsx

import React, { useEffect, useMemo } from "react";
import type { GetStaticPaths, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import { getSession } from "next-auth/react";

import { appRouter } from "@acme/api";
import { prisma, type Goal } from "@acme/db";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";

export const getStaticProps = async (): Promise<{
  props: {
    openAIUsage: CombinedResponse | null;
    savedGoals: Goal[] | null;
  };
  revalidate: number;
}> => {
  const startDate = new Date();
  const session = await getSession();

  const caller = appRouter.createCaller({ session, prisma });
  try {
    const openAIUsagePromise = getOpenAIUsage(startDate);
    const goalsPromise = caller.goal.topByUser();
    const [openAIUsage, savedGoals] = await Promise.all([
      openAIUsagePromise,
      goalsPromise,
    ]);
    return {
      props: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        openAIUsage: JSON.parse(JSON.stringify(openAIUsage)),
        savedGoals,
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
        savedGoals: null,
      },
      revalidate: 1,
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
  savedGoals,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const { slug } = router.query;
  const { getSelectedGoal } = useGoalStore();
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
    if (!selectedGoal?.id && cleanedSlug !== selectedGoal?.id) {
      const anySelectedGoal = getSelectedGoal()?.id;
      if (anySelectedGoal) {
        void router.replace(`/goal/${anySelectedGoal}`);
      } else if (savedGoals && savedGoals[0]) {
        void router.replace(`/goal/${savedGoals[0].id}`);
      } else {
        void router.replace(`/goal/new`);
      }
    }
  }, [cleanedSlug, getSelectedGoal, router, savedGoals, selectedGoal?.id]);

  return (
    <MainLayout openAIUsage={openAIUsage}>
      <>
        {state === "input" ? (
          <>
            <Title title="🐝 Goal solver" description="" />
            <GoalInput />
          </>
        ) : (
          <>
            <Title title="💃 Waggling!" description="" />
            <WaggleDanceGraph key={cleanedSlug} />
          </>
        )}
      </>
    </MainLayout>
  );
}
