// pages/goal/[[...goal]].tsx
import { type ParsedUrlQuery } from "querystring";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { type GetStaticPropsResult, type InferGetStaticPropsType } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { QuestionMarkOutlined } from "@mui/icons-material";
import {
  Box,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  type AlertPropsColorOverrides,
  type ColorPaletteProp,
} from "@mui/joy";
import List from "@mui/joy/List";
import Typography from "@mui/joy/Typography";
import { type OverridableStringUnion } from "@mui/types";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";
import { get } from "@vercel/edge-config";

import { defaultAgentSettings } from "@acme/agent";
import { latencyEstimate } from "@acme/agent/src/utils/llms";
import { type ExecutionPlusGraph, type GoalPlusExe } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import AddDocuments from "~/features/AddDocuments/AddDocuments";
import GoalPrompt from "~/features/GoalPrompt/GoalPrompt";
import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
import MainLayout from "~/features/MainLayout";
import SkillSelect from "~/features/Skills/SkillSelect";
import useSkillStore from "~/stores/skillStore";
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

// Define the latency scale and corresponding colors
const latencyScale: {
  limit: number;
  color: OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
  label: string;
  description: string;
}[] = [
  {
    limit: 0,
    color: "success",
    label: "✅ Lowest",
    description: `Your latency score is the lowest possible, which reduces costs and time to achieve goals, possibly at the expense of rigor`,
  },
  {
    limit: 0.5,
    color: "success",
    label: "✅ Low",
    description: `Your latency score is on the low end, which reduces costs and time to achieve goals, possibly at the expense of some rigor`,
  },
  {
    limit: 0.78,
    color: "neutral",
    label: "Medium",
    description: `Your latency score is near the middle range, which balances costs and time to achieve goals with rigor`,
  },
  {
    limit: 0.86,
    color: "warning",
    label: "⚠ High",
    description: `Your latency score is the second highest possible, which increases costs and time to achieve goals, but increases rigor`,
  },
  {
    limit: 1,
    color: "danger",
    label: "⚠ Highest",
    description: `Your latency score is the highest possible, which increases costs and time to achieve goals, but increases rigor`,
  },
];

const rigorScale: {
  limit: number;
  color: OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
  label: string;
  description: string;
}[] = [
  {
    limit: 0.35,
    color: "danger",
    label: "⚠ Lowest",
    description: `Your rigor score is the lowest possible, which reduces rigor, possibly at the expense of costs and time to achieve goals`,
  },
  {
    limit: 0.45,
    color: "warning",
    label: "⚠️ Low",
    description: `Your rigor score is on the low end, which reduces rigor, possibly at the expense of some costs and time to achieve goals`,
  },
  {
    limit: 0.8,
    color: "neutral",
    label: "Medium",
    description: `Your rigor score is near the middle range, which balances rigor with costs and time to achieve goals`,
  },
  {
    limit: 0.85,
    color: "success",
    label: "☑ High",
    description: `Your rigor score is the second highest possible, which increases rigor, but increases costs and time to achieve goals`,
  },
  {
    limit: 1,
    color: "success",
    label: "✅ Highest",
    description: `Your rigor score is the highest possible, which increases rigor, but increases costs and time to achieve goals`,
  },
];

// Get latency level based on the latency value
function getLatencyLevel(latency: number) {
  return (latencyScale.find((scale) => latency <= scale.limit) ||
    latencyScale[latencyScale.length - 1])!; // idk tsc was complaining without the bang
}

function getRigorLevel(rigor: number) {
  const rl =
    rigorScale.find((scale) => rigor <= scale.limit)! ||
    rigorScale[rigorScale.length - 1];

  return rl;
}

type Props = InferGetStaticPropsType<typeof getStaticProps>;
const GoalPage = ({ alertConfigs }: Props) => {
  const router = useRouter();
  const { goalMap, selectedGoal, upsertGoals, selectGoal } = useGoalStore();
  const { isRunning, setExecution, agentSettings } =
    useWaggleDanceMachineStore();
  const { selectedSkills } = useSkillStore();
  const skillsLabel = useMemo(() => {
    return selectedSkills
      .map((s) => s?.label)
      .filter(Boolean)
      .join(", ");
  }, [selectedSkills]);

  const latency = useMemo(() => {
    return latencyEstimate(
      agentSettings,
      selectedSkills.length,
      defaultAgentSettings,
    );
  }, [agentSettings, selectedSkills]);
  const latencyLevel = useMemo(() => getLatencyLevel(latency), [latency]);
  const rigor = useMemo(() => {
    return 1 + Math.log(latency);
  }, [latency]);
  const rigorLevel = useMemo(() => getRigorLevel(rigor), [rigor]);

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
                    color="primary"
                    className="mt-2"
                    sx={{ padding: 0 }}
                  >
                    <AccordionItem value="item-1">
                      <AccordionHeader
                        isFirst
                        variant="outlined"
                        color="primary"
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
                      <AccordionContent isLast={false}>
                        {goal?.prompt}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionHeader
                        variant="outlined"
                        color="primary"
                        openText={
                          <Typography noWrap level="title-sm" className="pb-2">
                            Understanding your settings
                          </Typography>
                        }
                        closedText={
                          <>
                            <Typography level="title-sm">
                              Understanding your settings
                            </Typography>
                            <Box
                              sx={{ display: "flex", alignItems: "center" }}
                              component={Stack}
                              direction="row"
                              gap={1}
                            >
                              <Tooltip
                                title={`(Lower is better) ${latencyLevel.description}`}
                              >
                                <Typography
                                  noWrap
                                  level="body-xs"
                                  fontFamily={"monospace"}
                                  color="neutral"
                                >
                                  Latency:{" "}
                                  <Typography color={latencyLevel.color}>
                                    {latencyLevel.label} {latency.toFixed(3)}{" "}
                                  </Typography>
                                </Typography>
                              </Tooltip>
                              {" · "}

                              <Tooltip
                                title={`(Higher is better) ${rigorLevel.description}`}
                              >
                                <Typography
                                  flexWrap={"wrap"}
                                  level="body-xs"
                                  fontFamily={"monospace"}
                                  color="neutral"
                                >
                                  Rigor:{" "}
                                  <Typography color={rigorLevel.color}>
                                    {rigorLevel.label} {rigor.toFixed(3)}{" "}
                                  </Typography>
                                </Typography>
                              </Tooltip>
                            </Box>
                          </>
                        }
                      ></AccordionHeader>
                      <AccordionContent isLast={false} defaultChecked={true}>
                        <Tooltip
                          title={`(Lower is better) ${latencyLevel.description}`}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Typography
                              noWrap
                              level="body-sm"
                              fontFamily={"monospace"}
                              color="neutral"
                            >
                              Latency:{" "}
                              <Typography color={latencyLevel.color}>
                                {latencyLevel.label}
                              </Typography>{" "}
                              {latency.toFixed(3)}{" "}
                              <IconButton
                                color={latencyLevel.color}
                                variant="outlined"
                                size="sm"
                                sx={{ p: 0, m: 0, borderRadius: "50%" }}
                              >
                                <QuestionMarkOutlined
                                  sx={{
                                    fontSize: "8pt",
                                    p: 0,
                                    m: "auto",
                                    minWidth: 20,
                                  }}
                                />
                              </IconButton>
                            </Typography>
                          </Box>
                        </Tooltip>

                        <Tooltip
                          title={`(Higher is better) ${rigorLevel.description}`}
                        >
                          <Typography
                            flexWrap={"wrap"}
                            level="title-sm"
                            fontFamily={"monospace"}
                            color="neutral"
                          >
                            Rigor:{" "}
                            <Typography color={rigorLevel.color}>
                              {rigorLevel.label}
                            </Typography>{" "}
                            {rigor.toFixed(3)}{" "}
                            <IconButton
                              color={rigorLevel.color}
                              variant="outlined"
                              size="sm"
                              sx={{ p: 0, m: 0, borderRadius: "50%" }}
                            >
                              <QuestionMarkOutlined
                                sx={{
                                  fontSize: "8pt",
                                  p: 0,
                                  m: "auto",
                                  minWidth: 20,
                                }}
                              />
                            </IconButton>
                          </Typography>
                        </Tooltip>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionHeader
                        variant="outlined"
                        color="primary"
                        openText={
                          <>
                            <Typography level="title-sm">Data</Typography>
                            <Typography noWrap level="body-sm">
                              xxx documents in yyy collections
                            </Typography>
                          </>
                        }
                        closedText={
                          <>
                            <Typography level="title-sm">Data</Typography>
                            <Typography noWrap level="body-sm">
                              xxx documents in yyy collections
                            </Typography>
                          </>
                        }
                      ></AccordionHeader>
                      <AccordionContent isLast={false}>
                        <AddDocuments />
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                      <AccordionHeader
                        variant="outlined"
                        color="primary"
                        isLast={true}
                        openText={
                          <>
                            <Typography level="title-sm">Skills</Typography>
                            <Typography noWrap level="body-sm">
                              {skillsLabel}
                            </Typography>
                          </>
                        }
                        closedText={
                          <>
                            <Typography level="title-sm">Skills</Typography>
                            <Typography noWrap level="body-sm">
                              {skillsLabel}
                            </Typography>
                          </>
                        }
                      ></AccordionHeader>
                      <AccordionContent isLast={true} sx={{ p: 1 }}>
                        <SkillSelect />
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
