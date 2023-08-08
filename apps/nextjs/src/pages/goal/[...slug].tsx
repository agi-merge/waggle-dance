// pages/goal/[slug].tsx
import { Suspense, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/router";
import { Card, CircularProgress } from "@mui/joy";

import { api } from "~/utils/api";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import { HomeContent } from "..";

export default function GoalDynamicRoute() {
  const router = useRouter();
  const { isRunning, execution, setExecution } = useWaggleDanceMachineStore();
  const { goalList, replaceGoals, getSelectedGoal, selectGoal } =
    useGoalStore();
  const [isPending, startTransition] = useTransition();

  const [serverGoals, _suspense] = api.goal.topByUser.useSuspenseQuery(
    undefined,
    {
      refetchOnMount: false,
      staleTime: 60_000,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  );

  const route = useMemo(() => {
    const { slug } = router.query;
    // the query will either be a goal id, or an array with goal id, followed by an optional execution, followed by optional execution id
    // we want to return the goal id and the execution id
    // if the slug is an array, then we want the first element and element after execution
    if (Array.isArray(slug)) {
      const goalId = slug[0];
      if (slug.length === 1) {
        return { goalId, executionId: undefined };
      }

      if (slug.length === 3 && slug[1] === "execution") {
        return { goalId, executionId: slug[2] };
      }
    } else if (typeof slug === "string") {
      return { goalId: slug, executionId: undefined };
    }
  }, [router.query]);

  const selectedGoal = useMemo(
    () => getSelectedGoal(route?.goalId),
    [getSelectedGoal, route?.goalId],
  );

  useEffect(
    () => {
      console.log("replacing goals");
      replaceGoals(serverGoals);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serverGoals],
  );

  // either input or graph
  const state = useMemo(() => {
    if (route?.goalId === "" || route?.goalId === "/") {
      return "input";
    }
    return (selectedGoal?.executions?.length ?? 0 > 0) ||
      (selectedGoal?.userId.trim().length ?? 0 !== 0)
      ? "graph"
      : "input";
  }, [route, selectedGoal?.executions?.length, selectedGoal?.userId]);

  // q: is this smart? a: yes, it's smart because it's a memoized value and will only change when the selected goal changes
  const executions = useMemo(
    () => selectedGoal?.executions,
    [selectedGoal?.executions],
  );

  // router for ensuring the persisted state and route are valid together
  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    // the different combinations of route and goal, execution include:
    const routeServerGoal = serverGoals.find((g) => g.id === route?.goalId);
    const routeServerExecution = executions?.find(
      (e) => e.id === route?.executionId,
    );
    const persistedServerGoal = serverGoals.find(
      (g) => g.id === selectedGoal?.id,
    );
    const persistedServerExecution = executions?.find(
      (e) => e.id === execution?.id,
    );

    const isPersistedGoalValid = !!persistedServerGoal?.id;

    startTransition(() => {
      void selectGoal(
        routeServerGoal?.id || persistedServerGoal?.id || selectedGoal?.id,
      );

      const goalId = isPersistedGoalValid
        ? routeServerGoal?.id || persistedServerGoal?.id
        : selectedGoal?.id;
      console.log("goalId", goalId);
      if (goalId === undefined) {
        console.error("404 time");
        void router.push("/404");
        return;
      }
      void setExecution(
        routeServerExecution || persistedServerExecution || null,
        goalId,
        router,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedGoal?.id,
    execution?.id,
    route?.goalId,
    route?.executionId,
    serverGoals,
  ]);

  return (
    <MainLayout>
      <Suspense fallback={<CircularProgress />}>
        {state === "input" || !selectedGoal ? (
          <HomeContent />
        ) : (
          <>
            {!isRunning && (
              <Title title={isRunning ? "💃 Waggling!" : "💃 Waggle"}>
                <Card>{selectedGoal.prompt}</Card>
              </Title>
            )}

            <WaggleDanceGraph
              key={`${route?.goalId}-${route?.executionId}`}
              selectedGoal={selectedGoal}
              executions={executions}
            />
          </>
        )}
      </Suspense>
    </MainLayout>
  );
}
