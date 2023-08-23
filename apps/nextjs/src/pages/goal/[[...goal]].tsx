// pages/goal/[goalId].tsx
import { type ParsedUrlQuery } from "querystring";
import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Refresh } from "@mui/icons-material";
import { Button, CircularProgress, Link, Stack } from "@mui/joy";
import Divider from "@mui/joy/Divider";
import List from "@mui/joy/List";
import Typography from "@mui/joy/Typography";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";

import { type ExecutionPlusGraph, type GoalPlusExe } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import { env } from "~/env.mjs";
import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
import MainLayout from "~/features/MainLayout";
import PageTitle from "~/features/MainLayout/components/PageTitle";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import { HomeContent } from "..";
import useGoalStore from "../../stores/goalStore";

const NoSSRWaggleDanceGraph = dynamic(
  () => import("~/features/WaggleDance/components/WaggleDanceGraph"),
  {
    ssr: false,
  },
);

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

  function useDelayedFallback(fallback: ReactNode, delay = 1000) {
    const [show, setShow] = useState(false);

    useEffect(() => {
      const timeout = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timeout);
    }, [delay]);

    return show ? fallback : null;
  }

  const fallback = useDelayedFallback(
    <MainLayout>
      <CircularProgress />
      <Typography>Loading…</Typography>
    </MainLayout>,
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
  }, [goal?.id, execution?.id, destinationRoute]);

  return (
    <MainLayout>
      <ErrorBoundary
        fallback={
          <Stack className="content-center justify-center self-center  text-center align-middle">
            <Typography level="h3">
              A fatal error occurred.
              <Divider />
              <Typography level="title-lg">This is likely a bug.</Typography>
            </Typography>
            <Button
              onClick={() => router.reload()}
              aria-label="Reload"
              variant="plain"
            >
              <span className="max-w-fit">
                <Refresh></Refresh>Reload
              </span>
            </Button>{" "}
            <Stack
              direction="row"
              spacing={1}
              className="max-w-sm justify-center text-center  align-baseline"
            >
              <Typography className="self-center">Not working?</Typography>
              <Button
                onClick={() => router.reload()}
                aria-label="Reload"
                variant="plain"
              >
                Go home
              </Button>{" "}
              <Divider />
              <Button
                component={Link}
                href={env.NEXT_PUBLIC_DISCORD_INVITE_URL}
                aria-label="Get help on Discord"
                variant="plain"
              >
                Get Help
              </Button>
            </Stack>
          </Stack>
        }
      >
        <Suspense fallback={fallback}>
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
              <Suspense fallback={<CircularProgress />}>
                <NoSSRWaggleDanceGraph />
              </Suspense>
            </>
          )}
        </Suspense>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default React.memo(GoalPage);

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
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Example "componentStack":
    //   in ComponentThatThrows (created by App)
    //   in ErrorBoundary (created by App)
    //   in div (created by App)
    //   in App
    // logErrorToMyService(error, (info as LogErrorInfo).componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback;
    }

    return this.props.children;
  }
}
