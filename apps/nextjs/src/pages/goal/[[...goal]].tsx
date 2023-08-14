// pages/goal/[goalId].tsx
import { type ParsedUrlQuery } from "querystring";
import { Suspense, useEffect, useMemo, useRef } from "react";
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
import PageTitle from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import { HomeContent } from "..";
import useGoalStore, { type GoalPlusExe } from "../../stores/goalStore";

const GoalPage = () => {
  const router = useRouter();
  const { goalMap, selectedGoal, upsertGoals, selectGoal } = useGoalStore();
  const { isRunning, setExecution } = useWaggleDanceMachineStore();

  const [serverGoals] = api.goal.topByUser.useSuspenseQuery(undefined, {
    refetchOnMount: true,
    staleTime: 60_000,
    useErrorBoundary: true,
  });

  const route = useMemo(() => getRoute(router.query), [router.query]);

  const prevServerGoalsRef = useRef<typeof serverGoals | null>(null);

  useEffect(() => {
    if (prevServerGoalsRef.current !== serverGoals) {
      upsertGoals(serverGoals);
      prevServerGoalsRef.current = serverGoals;
    }
  }, [serverGoals, route, upsertGoals]);

  const goal = useMemo(
    () => getGoal(serverGoals, route, selectedGoal, goalMap),
    [goalMap, selectedGoal, route, serverGoals],
  );

  const execution = useMemo(() => {
    if (!goal || !route.executionId) {
      return undefined;
    }
    return goal.executions.find((e) => e.id === route.executionId);
  }, [goal, route.executionId]);

  const state = useMemo(() => getState(route, goal), [route, goal]);

  const destinationRoute = useMemo(
    () => getDestinationRoute(route, goal, execution, router.asPath),
    [goal, execution, router.asPath, route],
  );

  const prevDestinationRouteRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    goal && selectGoal(goal.id);
    setExecution(execution);
    if (destinationRoute && router.asPath !== destinationRoute) {
      void (async () => {
        await router.replace(destinationRoute, undefined, { shallow: true });
      })();
    } else {
      prevDestinationRouteRef.current = destinationRoute;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationRoute]);

  return (
    <MainLayout>
      <Suspense fallback={<CircularProgress />}>
        {state === "input" ? (
          <HomeContent />
        ) : (
          <>
            <PageTitle title={isRunning ? "💃 Waggling!" : "💃 Waggle"}>
              {goal?.prompt && (
                <List
                  type="multiple"
                  component={Accordion}
                  variant="outlined"
                  className="mt-2"
                  sx={{ padding: 0 }}
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
                            {goal?.prompt}
                          </Typography>
                        </>
                      }
                    ></AccordionHeader>
                    <AccordionContent isLast={true}>
                      {goal?.prompt}
                    </AccordionContent>
                  </AccordionItem>
                </List>
              )}
            </PageTitle>
            <WaggleDanceGraph />
          </>
        )}
      </Suspense>
    </MainLayout>
  );
};

export default GoalPage;
function getRoute(query: ParsedUrlQuery): {
  goalId: string | undefined;
  executionId: string | undefined;
} {
  const goal = query.goal;
  if (Array.isArray(goal)) {
    const goalId = goal[0];
    if (goal.length === 3 && goal[1] === "execution") {
      return { goalId, executionId: goal[2] };
    }
    return { goalId, executionId: undefined };
  } else if (typeof goal === "string") {
    return { goalId: goal, executionId: undefined };
  }
  return { goalId: undefined, executionId: undefined };
}

function getGoal(
  serverGoals: GoalPlusExe[],
  route: { goalId: string | undefined; executionId: string | undefined },
  prevSelectedGoal: GoalPlusExe | undefined,
  goalMap: Record<string, GoalPlusExe>,
): GoalPlusExe | undefined {
  const goal = serverGoals.find((g) => g.id === route.goalId);
  if (!goal && route.goalId) {
    const clientSideGoal = goalMap[route.goalId];
    if (clientSideGoal) {
      return clientSideGoal;
    }
  }

  if (!goal && (prevSelectedGoal || serverGoals.length > 0)) {
    return prevSelectedGoal || (serverGoals && serverGoals[0]);
  }
  return goal;
}

function getState(
  route: { goalId: string | undefined; executionId: string | undefined },
  goal: GoalPlusExe | undefined,
): "input" | "graph" {
  if (!route?.goalId || route?.goalId === routes.home) {
    return "input";
  }
  return !goal ||
    (goal?.executions?.length ?? 0 > 0) ||
    (goal?.userId.trim().length ?? 0 !== 0)
    ? "graph"
    : "input";
}

function getDestinationRoute(
  route: { goalId: string | undefined; executionId: string | undefined },
  goal: GoalPlusExe | undefined,
  execution: Execution | undefined,
  currentPath: string,
): string | undefined {
  const destinationRoute = goal && routes.goal(goal.id, execution?.id);
  if (
    route.executionId &&
    goal &&
    !execution &&
    destinationRoute &&
    currentPath !== destinationRoute
  ) {
    return destinationRoute;
  } else if (currentPath !== destinationRoute) {
    return destinationRoute;
  }
}
