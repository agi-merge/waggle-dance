// pages/goal/[[...goal]].tsx
import { type ParsedUrlQuery } from "querystring";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { type GetStaticPropsResult, type InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import {
  Skeleton,
  type AlertPropsColorOverrides,
  type ColorPaletteProp,
} from "@mui/joy";
import { type OverridableStringUnion } from "@mui/types";
import { get, type EdgeConfigValue } from "@vercel/edge-config";

import { type ExecutionPlusGraph, type GoalPlusExe } from "@acme/db";
import { env } from "@acme/env-config";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import ErrorBoundary from "~/features/error/ErrorBoundary";
import MainLayout from "~/features/MainLayout";
import useSkillStore from "~/stores/skillStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import useGoalStore from "../../stores/goalStore";

const PageTitle = lazy(
  () => import("~/features/MainLayout/components/PageTitle"),
);
const GoalPrompt = lazy(() => import("~/features/GoalPrompt/GoalPrompt"));
const WaggleDanceSettingsAccordion = lazy(
  () => import("~/features/WaggleDance/components/WaggleDanceDashboard"),
);
const WaggleDance = lazy(() => import("~/features/WaggleDance/WaggleDance"));

type AlertConfig = {
  id: string;
  title: string;
  description: string;
  color: OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
  footer: string;
};

type StaticProps = {
  alertConfigs: AlertConfig[];
};

export const getStaticProps = async (): Promise<
  GetStaticPropsResult<StaticProps>
> => {
  // Fetch your alerts array from Vercel edge-config here

  const revalidate = 300; // ISR, revalidate every 5 minutes
  let alertConfigs: EdgeConfigValue | undefined;
  try {
    alertConfigs = await get("alerts");
  } catch {
    if (!!env.EDGE_CONFIG) {
      console.warn("Failed to fetch alerts from Vercel edge-config");
    }
    // handled below
  }
  const errorResponse: GetStaticPropsResult<StaticProps> = {
    notFound: true,
    revalidate: 1,
  };

  if (!alertConfigs) {
    alertConfigs = [];
  }

  const typedAlertConfigs = alertConfigs as AlertConfig[];

  if (!typedAlertConfigs) {
    return errorResponse;
  }

  return {
    props: { alertConfigs: typedAlertConfigs },
    revalidate,
  };
};

export function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

type Props = InferGetStaticPropsType<typeof getStaticProps>;
const GoalPage = ({ alertConfigs }: Props) => {
  const router = useRouter();
  const { goalMap, selectedGoal, upsertGoals, selectGoalId } = useGoalStore();
  const { isRunning, setExecution /*, agentSettings*/ } =
    useWaggleDanceMachineStore();
  const { selectedSkills, selectedSkillsLength } = useSkillStore();
  const skillsLabel = useMemo(() => {
    const label = selectedSkills
      .map((s) => s?.label)
      .filter(Boolean)
      .join(", ");
    return label.length > 0 ? label : "No skills enabled";
  }, [selectedSkills]);

  // const { latency, latencyLevel } = useLatencyEstimate(
  //   agentSettings,
  //   selectedSkills,
  // );

  // const { rigorLevel } = useRigorEstimate(latency);

  // const { iqLevel } = useIQEstimate(agentSettings);

  const [serverGoals] = api.goal.topByUser.useSuspenseQuery(undefined, {
    refetchOnMount: true,
    staleTime: 60_000,
    useErrorBoundary: true,
  });

  const route = useMemo(() => getRoute(router.query), [router.query]);

  const prevServerGoalsRef = useRef<typeof serverGoals | null>(null);

  const goal = useMemo(
    () => getGoal(serverGoals, route, selectedGoal, goalMap),
    [goalMap, selectedGoal, route, serverGoals],
  );

  // upsert server-fetched goals into store when server-fetch goals or goal changes
  useEffect(() => {
    if (prevServerGoalsRef.current !== serverGoals) {
      // Batch state updates here
      upsertGoals(serverGoals);
      goal && selectGoalId(goal.id);
      prevServerGoalsRef.current = serverGoals;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverGoals, goal?.id, upsertGoals]);

  const execution = useMemo(() => {
    if (!goal || !route.executionId) {
      return undefined;
    }
    return goal.executions.find((e) => e.id === route.executionId);
  }, [goal, route.executionId]);

  const state = useMemo(() => getState(route, goal), [route, goal]);

  const destinationRoute = useMemo(
    () => getDestinationRoute(route, goal, execution, router.asPath),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goal?.id, execution?.id, router.asPath, route],
  );

  const prevDestinationRouteRef = useRef<string | undefined>(undefined);

  // update stores and route w/ current values of goal and execution, when ids or the destination route changes
  useEffect(() => {
    goal && selectGoalId(goal.id);
    setExecution(execution, goal?.prompt ?? "");
    if (destinationRoute && router.asPath !== destinationRoute) {
      void router.replace(destinationRoute, undefined, { shallow: true });
    } else {
      prevDestinationRouteRef.current = destinationRoute;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, execution?.id, destinationRoute]);

  return (
    <MainLayout alertConfigs={alertConfigs}>
      <ErrorBoundary router={router}>
        {state === "input" ? (
          <GoalPrompt />
        ) : (
          <>
            <PageTitle title={isRunning ? "💃 Waggling!" : "💃 Waggle"}>
              {goal?.prompt && (
                <Suspense
                  fallback={<Skeleton variant="rectangular" height="6rem" />}
                >
                  <WaggleDanceSettingsAccordion
                    goal={goal}
                    // latencyLevel={latencyLevel}
                    // rigorLevel={rigorLevel}
                    // iqLevel={iqLevel}
                    skillsLabel={skillsLabel}
                    selectedSkillsLength={selectedSkillsLength}
                  />
                </Suspense>
              )}
            </PageTitle>
            <Suspense
              fallback={<Skeleton variant="rectangular" height="10rem" />}
            >
              <WaggleDance />
            </Suspense>
          </>
        )}
      </ErrorBoundary>
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
      return {
        goalId,
        executionId: goal[2],
      };
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
  execution: ExecutionPlusGraph | undefined,
  currentPath: string,
): string | undefined {
  const destinationRoute =
    goal && routes.goal({ id: goal.id, executionId: execution?.id });
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
