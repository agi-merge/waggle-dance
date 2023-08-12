// pages/goal/[...slug.ts]
// dynamic route for root (/), goal, and execution paths.
// determines the state of the page based on the route
// persists state to in memory and session/local stores
// e.g. /goal/123/execution/456
// e.g. /goal/123
// e.g. /goal
// e.g. /

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useTransition,
} from "react";
import { useRouter } from "next/router";
import { CircularProgress, List, Typography } from "@mui/joy";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";

import { type Execution } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
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
  const { replaceGoals, selectedGoal, selectGoal, goalList } = useGoalStore();
  const [_isPending, startTransition] = useTransition();

  // suspense.isFetched is always true
  // see https://trpc.io/docs/client/react/suspense
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
    console.log(slug);
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
    // this dynamic route handles the root route, which results in undefined, undefined.
    // in this case, we want to select the first goal and the first execution
    if (!route.executionId && !route.goalId) {
      console.debug("checking initial routing for root path");
      if (serverGoals[0]?.id) {
        console.debug("routing to serverGoals[0]", serverGoals[0].id);
        selectGoal(serverGoals[0].id);
        void setExecution(serverGoals[0]?.executions[0] || null);
        void router.replace(
          routes.goal(serverGoals[0].id, serverGoals[0]?.executions[0]?.id),
          undefined,
          {
            shallow: true,
          },
        );
      } else if (goalList[0]?.id) {
        console.debug("routing to goalList[0]", goalList[0].id);
        selectGoal(goalList[0].id);
        void router.replace(routes.goal(goalList[0].id), undefined, {
          shallow: true,
        });
      }
      return;
    }

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
    const goalId = routeServerGoal?.id || persistedServerGoal?.id;
    const exe = routeServerExecution || persistedServerExecution || null;
    console.debug("setGoalAndExecution goalId", goalId);
    console.debug("setGoalAndExecution exeId", exe?.id);
    goalId &&
      startTransition(() => {
        selectGoal(goalId);
        void setExecution(exe);
      });
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
    <MainLayout>
      <Suspense fallback={<CircularProgress />}>
        {state === "input" || !selectedGoal ? (
          <HomeContent />
        ) : (
          <>
            <Title title={isRunning ? "💃 Waggling!" : "💃 Waggle"}>
              {selectedGoal?.prompt && (
                <List
                  type="multiple"
                  component={Accordion}
                  variant="outlined"
                  className="mt-2"
                >
                  <AccordionItem value="item-1">
                    <AccordionHeader
                      isFirst
                      openText={
                        <Typography noWrap level="title-sm" className="pb-2">
                          Your goal
                        </Typography>
                      }
                      closedText={
                        <>
                          <Typography level="title-sm">Your goal</Typography>
                          <Typography noWrap level="body-sm">
                            {selectedGoal.prompt}
                          </Typography>
                        </>
                      }
                    ></AccordionHeader>
                    <AccordionContent isLast={true}>
                      {selectedGoal.prompt}
                    </AccordionContent>
                  </AccordionItem>
                </List>
              )}
            </Title>
            <WaggleDanceGraph />
          </>
        )}
      </Suspense>
    </MainLayout>
  );
}
