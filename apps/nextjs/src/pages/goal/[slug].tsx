// pages/goal/[tabId].tsx

import React, { useEffect, useMemo } from "react";
import type {
  GetStaticPaths,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from "next";
import { useRouter } from "next/router";
import { getSession, useSession } from "next-auth/react";

import { appRouter } from "@acme/api";
import { prisma } from "@acme/db";

import { getOpenAIUsage } from "~/utils/openAIUsageAPI";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export const getStaticProps = async ({}: GetStaticPropsContext) => {
  const startDate = new Date();
  const session = await getSession();

  const caller = appRouter.createCaller({ session, prisma });
  try {
    const openAIUsagePromise = getOpenAIUsage(startDate);
    const goalsPromise = caller.goal.topByUser();
    const [openAIUsageSettled, savedGoalsSettled] = await Promise.allSettled([
      openAIUsagePromise,
      goalsPromise,
    ]);
    // if (!savedGoals.find((goal) => goal.id === slug)) {
    //   return { notFound: true };
    // }
    const savedGoals =
      savedGoalsSettled.status === "fulfilled" ? savedGoalsSettled.value : null;
    const openAIUsage =
      openAIUsageSettled.status === "fulfilled"
        ? openAIUsageSettled.value
        : null;
    return {
      props: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        openAIUsage: JSON.parse(JSON.stringify(openAIUsage)),
        savedGoals,
      },
      // Next.js will attempt to re-generate the page:
      // - When a request comes in
      // - At most once every 10 seconds
      revalidate: 10, // In seconds
    };
  } catch (e) {
    console.error(e);
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
  const { isRunning } = useWaggleDanceMachineStore();
  const { data: sessionData } = useSession();
  const { slug } = router.query;
  const { getSelectedGoal, newGoal, goalList } = useGoalStore();
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
    if (cleanedSlug === "new") {
      return "input";
    }
    return (selectedGoal?.executions?.length ?? 0 > 0) ||
      (selectedGoal?.userId.trim().length ?? 0 !== 0)
      ? "graph"
      : "input";
  }, [cleanedSlug, selectedGoal?.executions?.length, selectedGoal?.userId]);

  useEffect(() => {
    if (cleanedSlug === "new") {
      // do nothing
    } else {
      if (!selectedGoal?.id && cleanedSlug !== selectedGoal?.id) {
        const anySelectedGoal = getSelectedGoal()?.id;
        if (anySelectedGoal) {
          void router.replace(`/goal/${anySelectedGoal}`);
        } else if (goalList.length ?? 0 !== 0) {
          void router.replace(`/goal/${goalList?.[0]?.id}`);
        } else if (savedGoals?.length ?? 0 !== 0) {
          void router.replace(`/goal/${savedGoals?.[0]?.id}`);
        } else {
          const newId = newGoal();
          void router.replace(`/goal/${newId}`);
        }
      }
    }
  }, [
    cleanedSlug,
    getSelectedGoal,
    newGoal,
    goalList,
    router,
    savedGoals,
    selectedGoal?.id,
    sessionData?.user.id,
  ]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    <MainLayout openAIUsage={openAIUsage}>
      <>
        {state === "input" ? (
          <>
            <Title title="🐝 Goal solver" description="" />
            <GoalInput />
          </>
        ) : (
          <>
            <Title
              title={isRunning ? "💃 Waggling!" : "💃 Waggle"}
              description={
                isRunning
                  ? "Please 🐝 patient. Planning may take several minutes to fully complete."
                  : "Press start/resume to waggle or add data."
              }
            />

            <WaggleDanceGraph
              key={cleanedSlug}
              savedGoals={savedGoals}
              selectedGoal={selectedGoal}
            />
          </>
        )}
      </>
    </MainLayout>
  );
}
