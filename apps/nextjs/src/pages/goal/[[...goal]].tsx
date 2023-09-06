// pages/goal/[[...goal]].tsx
import { type ParsedUrlQuery } from "querystring";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { type GetStaticPropsResult, type InferGetStaticPropsType } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  Skeleton,
  type AlertPropsColorOverrides,
  type ColorPaletteProp,
} from "@mui/joy";
import List from "@mui/joy/List";
import Typography from "@mui/joy/Typography";
import { type OverridableStringUnion } from "@mui/types";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";
import { get } from "@vercel/edge-config";

import { type ExecutionPlusGraph, type GoalPlusExe } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import GoalPrompt from "~/features/GoalPrompt/GoalPrompt";
import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
import MainLayout from "~/features/MainLayout";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import useGoalStore from "../../stores/goalStore";

const NoSSRWaggleDance = dynamic(
  () => import("~/features/WaggleDance/WaggleDance"),
  {
    ssr: false,
  },
);

const ErrorBoundary = lazy(() => import("../error/ErrorBoundary"));

const PageTitle = lazy(
  () => import("~/features/MainLayout/components/PageTitle"),
);

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
  const alertConfigs = await get("alerts");
  const errorResponse: GetStaticPropsResult<StaticProps> = {
    notFound: true,
    revalidate: 10,
  };

  if (!alertConfigs) {
    return errorResponse;
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

// export const getStaticPaths: GetStaticPaths = async () => {
//   return {
//     paths: [
//       {
//         params: {
//           goal: null,
//           alertConfig: [],
//         },
//       }, // See the "paths" section below
//     ],
//     fallback: true, // false or "blocking"
//   };
// };

type Props = InferGetStaticPropsType<typeof getStaticProps>;
const GoalPage = ({ alertConfigs }: Props) => {
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

  const goal = useMemo(
    () => getGoal(serverGoals, route, selectedGoal, goalMap),
    [goalMap, selectedGoal, route, serverGoals],
  );

  useEffect(() => {
    if (prevServerGoalsRef.current !== serverGoals) {
      // Batch state updates here
      upsertGoals(serverGoals);
      goal && selectGoal(goal.id);
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
  }, [goal?.id, execution?.id, destinationRoute]);

  return (
    <MainLayout alertConfigs={alertConfigs}>
      <Suspense>
        <ErrorBoundary router={router}>
          {state === "input" ? (
            <GoalPrompt />
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
              <Suspense fallback={<Skeleton variant="rectangular" />}>
                <NoSSRWaggleDance />
              </Suspense>
            </>
          )}
        </ErrorBoundary>
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
