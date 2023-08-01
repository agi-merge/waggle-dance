// pages/goal/[slug].tsx

import { useEffect, useMemo } from "react";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { Stack, Typography } from "@mui/joy";
import { getSession, useSession } from "next-auth/react";

import { appRouter } from "@acme/api";
import { prisma } from "@acme/db";

import { app } from "~/constants";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import { ExecutionSelect } from "~/features/WaggleDance/components/ExecutionSelect";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export const getServerSideProps = async ({}: GetServerSideProps) => {
  const session = await getSession();

  if (!session?.user.id) {
    return {
      props: {
        savedGoals: null,
      },
    };
  }

  const caller = appRouter.createCaller({ session, prisma });
  try {
    const goalsPromise = caller.goal.topByUser();
    const [savedGoalsSettled] = await Promise.allSettled([goalsPromise]);
    // if (!savedGoals.find((goal) => goal.id === slug)) {
    //   return { notFound: true };
    // }
    const savedGoals =
      savedGoalsSettled.status === "fulfilled" ? savedGoalsSettled.value : null;

    return {
      props: {
        savedGoals,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: {
        savedGoals: null,
      },
    };
  }
};

export default function GoalTab({
  savedGoals,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
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
      // if the slug is not the same as the selected goal, then we need to update the selected goal
      if (!selectedGoal?.id && cleanedSlug !== selectedGoal?.id) {
        const anySelectedGoal = getSelectedGoal()?.id;
        // if there is a selected goal, then we should redirect to that goal
        if (anySelectedGoal) {
          void router.replace(app.routes.goal(anySelectedGoal));
        } else if (goalList?.[0]?.id) {
          // if there is a goal in the in-memory list, then we should redirect to that goal
          const firstGoalId = goalList?.[0]?.id;
          void router.replace(app.routes.goal(firstGoalId));
        } else if (savedGoals?.[0]) {
          // if there is a goal in the database, then we should redirect to that goal
          const savedGoalId = savedGoals?.[0]?.id;
          void router.replace(app.routes.goal(savedGoalId));
        } else {
          // otherwise, we should create a new goal
          const newId = newGoal();
          void router.replace(app.routes.goal(newId));
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
  const executions = useMemo(() => {
    return (
      selectedGoal?.executions /*.sort((l: Execution, r: Execution) => {
        const lDate = new Date(l.updatedAt);
        const rDate = new Date(r.updatedAt);
        return lDate > rDate ? -1 : 1;
      })*/ || []
    );
  }, [selectedGoal?.executions]);

  return (
    <MainLayout>
      <>
        {state === "input" ? (
          <>
            <Title title="🐝 Goal solver" />
            <GoalInput />
          </>
        ) : (
          <>
            <Title title={isRunning ? "💃 Waggling!" : "💃 Waggle"}>
              <Stack direction="row">
                <Typography
                  level="body2"
                  sx={{
                    userSelect: "none",
                    marginBottom: { xs: -1, sm: 0 },
                  }}
                >
                  {isRunning
                    ? "Please 🐝 patient. Planning may take several minutes to fully complete."
                    : "Press start/resume to waggle or add data."}
                </Typography>
                <Typography className="flex-row">Yo</Typography>
              </Stack>
            </Title>

            <ExecutionSelect
              executions={executions}
              className="flex justify-start"
            />
            <WaggleDanceGraph key={cleanedSlug} selectedGoal={selectedGoal} />
          </>
        )}
      </>
    </MainLayout>
  );
}
