// pages/goal/[...slug.ts]

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useTransition,
} from "react";
import { useRouter } from "next/router";
import { Card, CircularProgress } from "@mui/joy";

import { type Execution } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore, { type GoalPlusExe } from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import { HomeContent } from "..";

type GoalMap = { [key: string]: GoalPlusExe };
type ExecutionMap = { [key: string]: Execution };

export default function GoalDynamicRoute() {
  const router = useRouter();
  const { isRunning, execution, setExecution } = useWaggleDanceMachineStore();
  const { replaceGoals, getSelectedGoal, selectGoal } = useGoalStore();
  const [_isPending, startTransition] = useTransition();

  const [serverGoals, _suspense] = api.goal.topByUser.useSuspenseQuery(
    undefined,
    {
      refetchOnMount: true,
      staleTime: 60_000,
      useErrorBoundary: true,
    },
  );

  const route = useMemo(() => {
    const { slug } = router.query;
    if (Array.isArray(slug)) {
      const goalId = slug[0];
      if (slug.length === 3 && slug[1] === "execution") {
        return { goalId, executionId: slug[2] };
      }
      return { goalId, executionId: undefined };
    } else if (typeof slug === "string") {
      return { goalId: slug, executionId: undefined };
    }
    return { goalId: undefined, executionId: undefined };
  }, [router.query]);

  const selectedGoal = useMemo(
    () => getSelectedGoal(route?.goalId),
    [getSelectedGoal, route?.goalId],
  );

  useEffect(() => {
    replaceGoals(serverGoals);
    // avoid Error: Maximum update depth exceeded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverGoals]);

  const state = useMemo(() => {
    if (!route?.goalId || route?.goalId === "/") {
      return "input";
    }
    return (selectedGoal?.executions?.length ?? 0 > 0) ||
      (selectedGoal?.userId.trim().length ?? 0 !== 0)
      ? "graph"
      : "input";
  }, [route, selectedGoal?.executions.length, selectedGoal?.userId]);

  const executions = useMemo(
    () => selectedGoal?.executions ?? [],
    [selectedGoal],
  );

  // Create maps for serverGoals and executions
  const serverGoalsMap = useMemo<GoalMap>(() => {
    return serverGoals.reduce((map, goal) => ({ ...map, [goal.id]: goal }), {});
  }, [serverGoals]);

  const executionsMap = useMemo<ExecutionMap>(() => {
    return executions.reduce(
      (map, execution) => ({ ...map, [execution.id]: execution }),
      {},
    );
  }, [executions]);

  const setGoalAndExecution = useCallback(() => {
    console.log("setGoalAndExecution");
    const routeServerGoal = route?.goalId
      ? serverGoalsMap[route.goalId]
      : undefined;
    const routeServerExecution = route?.executionId
      ? executionsMap[route.executionId]
      : undefined;
    const persistedServerGoal = selectedGoal?.id
      ? serverGoalsMap[selectedGoal.id]
      : undefined;
    const persistedServerExecution = execution?.id
      ? executionsMap[execution.id]
      : undefined;
    const isPersistedGoalValid = !!persistedServerGoal?.id;

    if (isPersistedGoalValid) {
      const goalId = routeServerGoal?.id || persistedServerGoal?.id;
      if (goalId) {
        startTransition(() => {
          selectGoal(goalId);
          void setExecution(
            routeServerExecution || persistedServerExecution || null,
            goalId,
            router,
          );
        });
      } else {
        void router.push(routes.home);
      }
    }
    // avoid Error: Maximum update depth exceeded. / replaceState getting called frequently
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.executionId, route?.goalId, selectedGoal?.id, execution?.id]);

  useEffect(() => {
    if (router.isReady) {
      setGoalAndExecution();
    }
    // avoid Error: Maximum update depth exceeded.
  }, [router.isReady, setGoalAndExecution]);

  return (
    <>
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
                selectedGoal={selectedGoal}
                executions={executions}
              />
            </>
          )}
        </Suspense>
      </MainLayout>
    </>
  );
}
