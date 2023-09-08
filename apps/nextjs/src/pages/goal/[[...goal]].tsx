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
import { type ExecutionPlusGraph, type GoalPlusExe } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import AddDocuments from "~/features/AddDocuments/AddDocuments";
import AgentSettings from "~/features/AgentSettings/AgentSettings";
import GoalPrompt from "~/features/GoalPrompt/GoalPrompt";
import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
import MainLayout from "~/features/MainLayout";
import { Latency } from "~/features/SettingsAnalysis/Latency";
import {
  getIQLevel,
  iqEstimate,
} from "~/features/SettingsAnalysis/utils/iqEstimate";
import {
  getLatencyLevel,
  latencyEstimate,
} from "~/features/SettingsAnalysis/utils/latencyEstimate";
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

const ErrorBoundary = lazy(() => import("../../features/error/ErrorBoundary"));

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
    label: "Low",
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
    label: "High",
    description: `Your rigor score is the second highest possible, which increases rigor, but increases costs and time to achieve goals`,
  },
  {
    limit: 1,
    color: "success",
    label: "Highest",
    description: `Your rigor score is the highest possible, which increases rigor, but increases costs and time to achieve goals`,
  },
];

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

  const iq = useMemo(() => {
    return iqEstimate(agentSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    agentSettings.execute.modelName,
    agentSettings.plan.modelName,
    agentSettings.review.modelName,
  ]);
  const iqLevel = useMemo(() => getIQLevel(iq), [iq]);

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
                    color="neutral"
                    className="mt-2"
                    sx={{ padding: 0 }}
                  >
                    <Box sx={{ display: { xs: "block", md: "flex" } }}>
                      <Box
                        sx={{
                          flex: 1,
                          maxWidth: { xs: "100%", md: "50%" },
                        }}
                      >
                        <AccordionItem value="item-1">
                          <AccordionHeader
                            isFirst
                            variant="outlined"
                            color="primary"
                            openText={
                              <>
                                <Typography noWrap level="title-sm">
                                  🍯 Goal
                                </Typography>
                                <Typography
                                  noWrap
                                  level="body-sm"
                                  sx={{
                                    opacity: 0,
                                    fontSize: { xs: "xs", sm: "sm" },
                                  }}
                                >
                                  {goal?.prompt}
                                </Typography>
                              </>
                            }
                            closedText={
                              <>
                                <Typography level="title-sm">
                                  🍯 Goal
                                </Typography>
                                <Typography
                                  noWrap
                                  level="body-sm"
                                  sx={{
                                    fontSize: { xs: "xs", sm: "sm" },
                                  }}
                                >
                                  {goal?.prompt}
                                </Typography>
                              </>
                            }
                          />
                          <AccordionContent isLast={false}>
                            {goal?.prompt}
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                          <AccordionHeader
                            isLast={true}
                            variant="outlined"
                            color="primary"
                            openText={
                              <>
                                <Typography level="title-sm">
                                  📊 Settings
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  component={Stack}
                                  direction="row"
                                  gap={1}
                                >
                                  <Latency latencyLevel={latencyLevel} />
                                  {" · "}
                                  <Tooltip
                                    title={`(Higher is better) ${rigorLevel.description}`}
                                  >
                                    <Typography
                                      flexWrap={"wrap"}
                                      level="body-sm"
                                      color="neutral"
                                      sx={{
                                        fontSize: { xs: "xs", sm: "sm" },
                                      }}
                                    >
                                      Rigor:{" "}
                                      <Typography color={rigorLevel.color}>
                                        {rigorLevel.label}
                                      </Typography>
                                    </Typography>
                                  </Tooltip>
                                  {" · "}

                                  <Tooltip
                                    title={`(Higher is better) ${iqLevel.description}`}
                                  >
                                    <Typography
                                      flexWrap={"wrap"}
                                      level="body-sm"
                                      color="neutral"
                                      sx={{
                                        fontSize: { xs: "xs", sm: "sm" },
                                      }}
                                    >
                                      IQ:{" "}
                                      <Typography
                                        color={iqLevel.color}
                                        className="align-end"
                                      >
                                        {iqLevel.label}
                                      </Typography>
                                    </Typography>
                                  </Tooltip>
                                </Box>
                              </>
                            }
                            closedText={
                              <>
                                <Typography level="title-sm">
                                  📊 Settings
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
                                      level="body-sm"
                                      color="neutral"
                                      sx={{
                                        fontSize: { xs: "xs", sm: "sm" },
                                      }}
                                    >
                                      Latency:{" "}
                                      <Typography color={latencyLevel.color}>
                                        {latencyLevel.label}{" "}
                                      </Typography>
                                    </Typography>
                                  </Tooltip>
                                  {" · "}

                                  <Tooltip
                                    title={`(Higher is better) ${rigorLevel.description}`}
                                  >
                                    <Typography
                                      flexWrap={"wrap"}
                                      level="body-sm"
                                      color="neutral"
                                      sx={{
                                        fontSize: { xs: "xs", sm: "sm" },
                                      }}
                                    >
                                      Rigor:{" "}
                                      <Typography color={rigorLevel.color}>
                                        {rigorLevel.label}
                                      </Typography>
                                    </Typography>
                                  </Tooltip>
                                  {" · "}

                                  <Tooltip
                                    title={`(Higher is better) ${iqLevel.description}`}
                                  >
                                    <Typography
                                      flexWrap={"wrap"}
                                      level="body-sm"
                                      color="neutral"
                                      sx={{
                                        fontSize: { xs: "xs", sm: "sm" },
                                      }}
                                    >
                                      IQ:{" "}
                                      <Typography color={iqLevel.color}>
                                        {iqLevel.label}
                                      </Typography>
                                    </Typography>
                                  </Tooltip>
                                </Box>
                              </>
                            }
                          />
                          <AccordionContent isLast={true} defaultChecked={true}>
                            <AgentSettings />
                            <Tooltip
                              title={`(Lower is better) ${latencyLevel.description}`}
                              sx={{ cursor: "pointer" }}
                            >
                              <Typography
                                noWrap
                                level="title-sm"
                                color="neutral"
                              >
                                Latency:{" "}
                                <Typography
                                  color={latencyLevel.color}
                                  level="body-sm"
                                >
                                  {latencyLevel.label}
                                </Typography>{" "}
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
                            </Tooltip>

                            <Tooltip
                              title={`(Higher is better) ${rigorLevel.description}`}
                              sx={{ cursor: "pointer" }}
                            >
                              <Typography
                                flexWrap={"wrap"}
                                level="title-sm"
                                color="neutral"
                              >
                                Rigor:{" "}
                                <Typography
                                  color={rigorLevel.color}
                                  level="title-sm"
                                >
                                  {rigorLevel.label}
                                </Typography>{" "}
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

                            <Tooltip
                              title={`(Higher is better) ${iqLevel.description}`}
                              sx={{ cursor: "pointer" }}
                            >
                              <Typography
                                flexWrap={"wrap"}
                                level="title-sm"
                                color="neutral"
                              >
                                IQ:{" "}
                                <Typography
                                  color={iqLevel.color}
                                  level="title-sm"
                                >
                                  {iqLevel.label}
                                </Typography>{" "}
                                <IconButton
                                  color={iqLevel.color}
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
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          maxWidth: { xs: "100%", md: "50%" },
                        }}
                      >
                        <AccordionItem value="item-3">
                          <AccordionHeader
                            isFirst
                            variant="outlined"
                            color="primary"
                            openText={
                              <>
                                <Typography level="title-sm">
                                  🌺 Data
                                </Typography>
                                <Typography
                                  noWrap
                                  level="body-sm"
                                  sx={{
                                    fontSize: { xs: "xs", sm: "sm" },
                                  }}
                                >
                                  xxx documents in yyy collections
                                </Typography>
                              </>
                            }
                            closedText={
                              <>
                                <Typography level="title-sm">
                                  🌺 Data
                                </Typography>
                                <Typography
                                  noWrap
                                  level="body-sm"
                                  sx={{
                                    fontSize: { xs: "xs", sm: "sm" },
                                  }}
                                >
                                  xxx documents in yyy collections
                                </Typography>
                              </>
                            }
                          />
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
                                <Typography level="title-sm">
                                  🔨 Skills
                                </Typography>
                                <Typography
                                  noWrap
                                  level="body-sm"
                                  sx={{
                                    fontSize: { xs: "xs", sm: "sm" },
                                  }}
                                >
                                  {skillsLabel}
                                </Typography>
                              </>
                            }
                            closedText={
                              <>
                                <Typography level="title-sm">
                                  🔨 Skills
                                </Typography>
                                <Typography
                                  noWrap
                                  level="body-sm"
                                  sx={{
                                    fontSize: { xs: "xs", sm: "sm" },
                                  }}
                                >
                                  {skillsLabel}
                                </Typography>
                              </>
                            }
                          />
                          <AccordionContent isLast={true}>
                            <SkillSelect />
                          </AccordionContent>
                        </AccordionItem>
                      </Box>
                    </Box>
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
