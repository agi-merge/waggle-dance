// pages/goal/[slug].tsx
import { Suspense, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Card, CircularProgress } from "@mui/joy";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import { HomeContent } from "..";

export default function GoalTab() {
  const router = useRouter();
  const { isRunning } = useWaggleDanceMachineStore();
  const { replaceGoals, getSelectedGoal, newGoal } = useGoalStore();

  const [savedGoals, _suspense] = api.goal.topByUser.useSuspenseQuery(
    undefined,
    {
      refetchOnMount: false,
      staleTime: 60_000,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  );

  const cleanedSlug = useMemo(() => {
    const { slug } = router.query;
    console.log("cleanedSlug", slug);
    if (typeof slug === "string") {
      return slug;
    } else if (Array.isArray(slug)) {
      return slug[0];
    } else {
      return slug;
    }
  }, [router.query]) as string;

  const selectedGoal = useMemo(
    () => getSelectedGoal(cleanedSlug),
    [getSelectedGoal, cleanedSlug],
  );
  useEffect(
    () => {
      replaceGoals(savedGoals);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedGoals],
  );

  const state = useMemo(() => {
    if (cleanedSlug === "" || cleanedSlug === "/") {
      return "input";
    }
    return (selectedGoal?.executions?.length ?? 0 > 0) ||
      (selectedGoal?.userId.trim().length ?? 0 !== 0)
      ? "graph"
      : "input";
  }, [cleanedSlug, selectedGoal?.executions?.length, selectedGoal?.userId]);
  useEffect(
    () => {
      if (!router.isReady) {
        // do nothing
      } else {
        console.log("this useEffect routing");
        debugger;
        if (selectedGoal && selectedGoal.executions.length > 0) {
          const route = routes.goal(selectedGoal.id); // avoid an error when replacing route to same route
          if (router.route !== route) {
            // Only replace route if it's different from the current route
            void router.replace(route);
          }
          return;
        }
        // if the slug is not the same as the selected goal, then we need to update the selected goal
        if (!selectedGoal?.id && cleanedSlug !== selectedGoal?.id) {
          const anySelectedGoal = getSelectedGoal()?.id;
          // if there is a selected goal, then we should redirect to that goal
          if (anySelectedGoal) {
            void router.replace(routes.goal(anySelectedGoal), undefined, {
              shallow: true,
            });
          } else if (savedGoals?.[0]?.id) {
            // if there is a goal in the in-memory list, then we should redirect to that goal
            const firstGoalId = savedGoals?.[0]?.id;
            void router.replace(routes.goal(firstGoalId), undefined, {
              shallow: true,
            });
          } else if (savedGoals?.[0]) {
            // if there is a goal in the database, then we should redirect to that goal
            const savedGoalId = savedGoals?.[0]?.id;
            void router.replace(routes.goal(savedGoalId), undefined, {
              shallow: true,
            });
          } else {
            // otherwise, we should create a new goal
            const newId = newGoal();
            void router.replace(routes.goal(newId), undefined, {
              shallow: true,
            });
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedGoals, selectedGoal?.id],
  );

  // q: is this smart? a: yes, it's smart because it's a memoized value and will only change when the selected goal changes
  const executions = useMemo(
    () => selectedGoal?.executions,
    [selectedGoal?.executions],
  );

  return (
    <MainLayout>
      <>
        {state === "input" || !selectedGoal ? (
          <HomeContent />
        ) : (
          <>
            {!isRunning && (
              <Title title={isRunning ? "💃 Waggling!" : "💃 Waggle"}>
                <Card>{selectedGoal.prompt}</Card>
              </Title>
            )}

            <Suspense fallback={<CircularProgress></CircularProgress>}>
              <WaggleDanceGraph
                key={cleanedSlug}
                selectedGoal={selectedGoal}
                executions={executions}
              />
            </Suspense>
          </>
        )}
      </>
    </MainLayout>
  );
}
