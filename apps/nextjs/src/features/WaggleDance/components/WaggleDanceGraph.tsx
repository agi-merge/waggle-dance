import assert from "assert";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import router from "next/router";
import {
  BugReport,
  Edit,
  Lan,
  ListAlt,
  PlayCircle,
  Science,
  Send,
  StopCircle,
} from "@mui/icons-material";
import { Link } from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import Checkbox from "@mui/joy/Checkbox";
import CircularProgress from "@mui/joy/CircularProgress";
import Divider from "@mui/joy/Divider";
import IconButton from "@mui/joy/IconButton";
import LinearProgress from "@mui/joy/LinearProgress";
import List from "@mui/joy/List";
import ListDivider from "@mui/joy/ListDivider";
import ListItem from "@mui/joy/ListItem";
import ListItemContent from "@mui/joy/ListItemContent";
import ListItemDecorator from "@mui/joy/ListItemDecorator";
import Stack, { type StackProps } from "@mui/joy/Stack";
import Tab from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import TabPanel from "@mui/joy/TabPanel";
import Tabs from "@mui/joy/Tabs";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import { TRPCClientError } from "@trpc/client";
import { useSession } from "next-auth/react";
import { stringify } from "yaml";

import { type ExecutionPlusGraph } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import GoalSettings from "~/features/GoalMenu/components/GoalSettings";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore, {
  createDraftExecution,
} from "~/stores/waggleDanceStore";
import useWaggleDanceMachine, {
  TaskStatus,
  type TaskState,
} from "../hooks/useWaggleDanceMachine";
import { rootPlanId } from "../initialNodes";
import { ExecutionSelect } from "./ExecutionSelect";
import ForceGraph from "./ForceGraph";

type WaggleDanceGraphProps = StackProps;
// shows the graph, agents, results, general messages and chat input
const WaggleDanceGraph = ({}: WaggleDanceGraphProps) => {
  const { selectedGoal } = useGoalStore();
  const {
    isRunning,
    setIsRunning,
    isAutoStartEnabled,
    setIsAutoStartEnabled,
    execution,
  } = useWaggleDanceMachineStore();
  const {
    graphData,
    dag,
    stop,
    run: startWaggleDance,
    reset,
    logs,
    taskStates,
  } = useWaggleDanceMachine();
  const listItemsRef = useRef<HTMLLIElement[]>([]);
  const taskListRef = useRef<HTMLUListElement>(null);

  const { data: session } = useSession();
  const sortedTaskStates = useMemo(() => {
    return taskStates.sort((a: TaskState, b: TaskState) => {
      if (a.id === rootPlanId) {
        return -1;
      }
      if (b.id === rootPlanId) {
        return 1;
      }
      if (a.id === rootPlanId) {
        return -1;
      }
      if (b.id === rootPlanId) {
        return 1;
      }
      if (a.status === b.status) {
        // Split the IDs into parts and parse them into numbers
        const aIdParts = a.id.split("-").map(Number);
        const bIdParts = b.id.split("-").map(Number);

        // Compare the parts
        for (let i = 0; i < aIdParts.length && i < bIdParts.length; i++) {
          if (aIdParts[i] !== bIdParts[i]) {
            return aIdParts[i] ?? 0 - (bIdParts[i] ?? 0);
          }
        }

        // If all parts are equal, the one with fewer parts should come first
        return aIdParts.length - bIdParts.length;
      }
      if (a.status === TaskStatus.done) return -1;
      if (b.status === TaskStatus.done) return 1;
      if (a.status === TaskStatus.error) return -1;
      if (b.status === TaskStatus.error) return 1;
      if (a.status === TaskStatus.working) return -1;
      if (b.status === TaskStatus.working) return 1;
      if (a.status === TaskStatus.starting) return -1;
      if (b.status === TaskStatus.starting) return 1;
      if (a.status === TaskStatus.idle) return -1;
      if (b.status === TaskStatus.idle) return 1;
      // unhandled use alphabetical
      return 1;
    });
  }, [taskStates]);

  const { setIsPageLoading, isAutoScrollToBottom, setIsAutoScrollToBottom } =
    useApp();
  const { mutate: createExecution } = api.execution.create.useMutation({
    onSettled: (data, error) => {
      console.debug(
        "create execution onSettled: ",
        "data",
        data,
        "error",
        error,
      );
      let createdExecution: ExecutionPlusGraph | undefined;

      if (error) {
        type HTTPStatusy = { httpStatus: number };
        if (error instanceof TRPCClientError) {
          const data = error.data as HTTPStatusy;
          // route for anonymous users
          if (data.httpStatus === 401 && selectedGoal) {
            const draftExecution = createDraftExecution(selectedGoal, dag);
            createdExecution = draftExecution;
          }
          if (!createdExecution) {
            throw error;
          }
        }
      } else {
        createdExecution = data;
      }
      assert(createdExecution);
      void (async () => {
        console.log("replace route");
        await router.push(
          routes.goal(createdExecution.goalId, createdExecution?.id),
          undefined,
          { shallow: true },
        );
        await startWaggleDance(createdExecution); // idk, execution not set was happening if we relied on useCallback hook
        setIsPageLoading(false);
      })();
    },
  });

  const handleStart = useCallback(() => {
    if (!isRunning) {
      if (selectedGoal) {
        setIsRunning(true);
        setIsPageLoading(true);
        reset();

        createExecution({ goalId: selectedGoal.id });
      } else {
        setIsRunning(false);
        console.error("no goal selected");
      }
    }
  }, [
    isRunning,
    selectedGoal,
    setIsRunning,
    setIsPageLoading,
    reset,
    createExecution,
  ]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    stop();
  }, [setIsRunning, stop]);

  const hasMountedRef = useRef(false);

  // auto-start
  useEffect(() => {
    if (isAutoStartEnabled) {
      setIsAutoStartEnabled(false);
      setTimeout(() => {
        if (!hasMountedRef.current) {
          hasMountedRef.current = true;
          handleStart();
        }
      }, 0);
    }
  }, [handleStart, hasMountedRef, isAutoStartEnabled, setIsAutoStartEnabled]);

  const [recentTaskId, setRecentTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAutoScrollToBottom) {
      return;
    }

    // Find the task with the most recent update
    const recentTask = taskStates.reduce(
      (recent: TaskState | null, task: TaskState) => {
        if (!recent || task.updatedAt > recent.updatedAt) {
          return task;
        } else {
          return recent;
        }
      },
      null,
    );

    // Update the most recently updated task ID
    if (recentTask && recentTask.id !== recentTaskId) {
      setRecentTaskId(recentTask.id);

      // Scroll to the most recently updated task
      const taskIndex = sortedTaskStates.findIndex(
        (task) => task.id === recentTask.id,
      );
      if (taskIndex !== -1) {
        listItemsRef.current[taskIndex]?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [taskStates, isAutoScrollToBottom, recentTaskId, sortedTaskStates]);

  const stringifyMax = (value: unknown, max: number) => {
    const json = stringify(value);
    return json && json.length < max ? json : `${json.slice(0, max)}…`;
  };

  const statusColor = (n: TaskState) => {
    switch (n.status) {
      case TaskStatus.done:
        return "success";
      case TaskStatus.error:
        return "danger";
      case (TaskStatus.idle, TaskStatus.wait):
        return "neutral";
      case (TaskStatus.starting, TaskStatus.working):
        return "primary";
    }
  };

  const results = useMemo(
    () => taskStates.filter((n) => !!n.result),
    [taskStates],
  );

  const progressPercent = useMemo(() => {
    return (results.length / taskStates.length) * 100;
  }, [results.length, taskStates.length]);

  const notIdleTasks = useMemo(() => {
    return taskStates.filter((s) => s.status !== TaskStatus.idle).length;
  }, [taskStates]);

  const inProgressOrDonePercent = useMemo(() => {
    return (notIdleTasks / taskStates.length) * 100;
  }, [notIdleTasks, taskStates.length]);

  const inProgress = useMemo(() => {
    return taskStates.filter(
      (s) =>
        s.status === TaskStatus.starting ||
        s.status === TaskStatus.working ||
        s.status === TaskStatus.wait,
    ).length;
  }, [taskStates]);

  const progressLabel = useMemo(() => {
    return `# Tasks in progress: ${inProgress}, done: ${
      results.length
    }, scheduled: ${taskStates.length - notIdleTasks}, total: ${
      taskStates.length
    }`;
  }, [inProgress, notIdleTasks, results.length, taskStates.length]);

  const shouldShowProgress = useMemo(() => {
    return isRunning || results.length > 0;
  }, [isRunning, results]);

  return (
    <Stack gap="1rem" sx={{ mx: -3 }}>
      {!session && (
        <Box className="text-center">
          <Typography level="body-sm">
            <Link href={routes.auth} target="_blank" color="primary">
              {isRunning
                ? "Sign in to save your next waggle"
                : "Sign in to save waggles, change settings and more"}
            </Link>
          </Typography>
          <Divider />
        </Box>
      )}
      {dag.nodes.length > 0 && (
        <Tabs
          size="sm"
          key={execution?.id}
          aria-label="Waggle Dance Status and Results"
          defaultValue={0}
          variant="soft"
          color="neutral"
          sx={{ borderRadius: "0", m: 0, p: 0 }}
        >
          <TabList
            sticky="top"
            variant="outlined"
            sx={(theme) => ({
              borderRadius: "0",
              flexWrap: "nowrap",
              top: "calc(-1 * (var(--main-paddingTop, 0px) - var(--Header-height, 0px)))",
              width: "100%",
              backgroundColor: theme.palette.background.backdrop, // semi-transparent background
              backdropFilter: "blur(10px)",
            })}
          >
            <Tab value={0} sx={{ flex: "1 1 auto" }}>
              <ListAlt />
              <Typography className="px-1">Tasks</Typography>
            </Tab>
            <Tab
              value={1}
              disabled={dag.nodes.length < 2}
              sx={{ opacity: dag.nodes.length < 2 ? 0.2 : 1, flex: "1 1 auto" }}
            >
              <Lan />
              <Typography className="px-1">Graph</Typography>
            </Tab>
            <Tab
              value={2}
              disabled={results.length < 1}
              sx={{ opacity: results.length < 1 ? 0.2 : 1, flex: "1 1 auto" }}
            >
              <Science />
              <Typography>Results</Typography>
            </Tab>
            <Tab
              value={3}
              disabled={logs.length < 1}
              sx={{ opacity: logs.length < 1 ? 0.2 : 1, flex: "1 1 auto" }}
            >
              <BugReport />
            </Tab>
          </TabList>

          {taskStates.length > 0 ? (
            <>
              <TabPanel value={0} className="w-full overflow-y-scroll p-4">
                <List aria-label="Task list" size="sm" ref={taskListRef}>
                  {sortedTaskStates.map((t, i) => (
                    <React.Fragment key={t.id}>
                      <ListItem
                        sx={{
                          width: { xs: "100%", sm: "auto" },
                          flexDirection: { xs: "column", sm: "row" },
                        }}
                        ref={(el) => el && (listItemsRef.current[i] = el)}
                      >
                        <ListItemDecorator
                          color={statusColor(t)}
                          sx={{
                            width: { xs: "100%", sm: "10rem" },
                            height: "100%",
                            flexDirection: {
                              xs: "row",
                              sm: "column",
                            },
                            textAlign: "end",
                            alignItems: "end",
                            alignSelf: "start",
                            paddingRight: { xs: "inherit", sm: "0.5rem" },
                            marginRight: { xs: "inherit", sm: "-0.25rem" },
                            marginTop: { xs: "inherit", sm: "0.25rem" },
                            marginBottom: { xs: "-0.75rem", sm: "inherit" },
                            paddingBottom: { xs: "1rem", sm: "inherit" },
                          }}
                          size="sm"
                          variant="soft"
                          component={Card}
                        >
                          <Stack
                            direction={{ xs: "row", sm: "column" }}
                            gap={{ xs: "0.5rem", sm: "0.25rem" }}
                            alignItems={{ xs: "center", sm: "flex-end" }}
                          >
                            <Typography
                              level="title-md"
                              color="primary"
                              sx={{ wordBreak: "break-word" }}
                            >
                              {t.name}
                            </Typography>
                            <Typography
                              level="title-sm"
                              color="neutral"
                              fontFamily="monospace"
                            >
                              id:{" "}
                              <Typography level="body-sm">{t.id}</Typography>
                            </Typography>
                            <Stack gap="0.3rem" direction="row">
                              <Tooltip title="Chat">
                                <IconButton size="sm">
                                  <Send />
                                </IconButton>
                              </Tooltip>
                              <Divider orientation="vertical" />
                              <Tooltip title="Edit">
                                <IconButton size="sm">
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </ListItemDecorator>
                        <ListItemContent sx={{ width: "100%" }}>
                          <Card
                            variant="outlined"
                            component={Stack}
                            direction="column"
                            className="min-w-full"
                          >
                            <Stack className="text-wrap" gap={1.5}>
                              <Typography
                                level="title-sm"
                                style={{
                                  overflowWrap: "break-word",
                                }}
                              >
                                {t.act}
                                <Typography
                                  fontFamily="monospace"
                                  level="body-sm"
                                  className="text-wrap"
                                  style={{
                                    overflowWrap: "break-word",
                                    width: "100%",
                                  }}
                                >
                                  {" ("}
                                  {t.params}
                                  {")"}
                                </Typography>
                              </Typography>
                              <Divider inset="context" />
                              <Typography
                                level="body-sm"
                                className="text-wrap"
                                color="neutral"
                                style={{
                                  overflowWrap: "break-word",
                                }}
                              >
                                {stringifyMax(t.context, 200)}
                              </Typography>
                            </Stack>

                            {isRunning && t.status === TaskStatus.working && (
                              <LinearProgress thickness={2} />
                            )}
                            <Card
                              size="sm"
                              className="justify-start p-1 text-start"
                              component={Stack}
                              direction={"column"}
                              variant="outlined"
                              sx={(theme) => ({
                                backgroundColor:
                                  theme.palette.background.backdrop,
                              })}
                            >
                              <Typography level="title-lg">
                                {t.result ? <>Result: </> : <>Status: </>}
                                <Typography
                                  color={statusColor(t)}
                                  level="body-md"
                                >
                                  {isRunning
                                    ? t.fromPacketType
                                    : t.status === TaskStatus.working ||
                                      t.status === TaskStatus.starting ||
                                      t.status === TaskStatus.wait
                                    ? "stopped"
                                    : t.fromPacketType}
                                </Typography>
                              </Typography>

                              {t.result && (
                                <Typography
                                  level="body-sm"
                                  className="max-h-72 overflow-x-clip overflow-y-scroll  break-words pt-2"
                                  fontFamily={
                                    t.status === TaskStatus.error
                                      ? "monospace"
                                      : undefined
                                  }
                                >
                                  {t.result}
                                </Typography>
                              )}
                            </Card>
                          </Card>
                        </ListItemContent>
                        {/* </ListItemButton> */}
                      </ListItem>
                      {i !== sortedTaskStates.length - 1 && (
                        <ListDivider inset="gutter" sx={{ margin: 1.5 }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              </TabPanel>

              <TabPanel
                value={1}
                className="min-h-90 w-full items-center overflow-y-scroll"
                sx={{ padding: { xs: 0, sm: 2 } }}
              >
                <ForceGraph data={graphData} />
              </TabPanel>

              <TabPanel value={2} className="w-full overflow-y-scroll p-4">
                <List
                  className="absolute left-0 top-0 mt-3"
                  sx={{
                    marginX: { xs: -2, sm: 0 },
                  }}
                  aria-label="Results List"
                >
                  {taskStates
                    .filter((t) => !!t.result)
                    .map((t) => (
                      <Box key={t.id}>{t.result}</Box>
                    ))}
                </List>
              </TabPanel>

              <TabPanel value={3} className="w-full overflow-y-scroll p-4">
                <List
                  className="absolute left-0 top-0 mt-3"
                  sx={{
                    marginX: { xs: -2, sm: 0 },
                  }}
                  aria-label="Log List"
                >
                  {logs.map((log) => (
                    <Box key={`${log.timestamp.toString()}-${log.message}`}>
                      <ListItem className="overflow-x-scroll">
                        <Stack
                          direction="row"
                          className="max-h-24 overflow-x-scroll"
                          gap="1rem"
                        >
                          <Typography
                            fontFamily="Monospace"
                            variant="soft"
                            color="neutral"
                            level="body-md"
                          >
                            {log.timestamp.toISOString().split("T")[1]}
                          </Typography>
                          <Typography fontFamily="Monospace" color="success">
                            {log.type}
                          </Typography>
                          <Typography
                            fontFamily="Monospace"
                            color="neutral"
                            className="max-w-24 max-h-24 flex-shrink"
                          >
                            {log.message}
                          </Typography>
                        </Stack>
                      </ListItem>
                      <ListDivider inset="gutter" />
                    </Box>
                  ))}
                </List>
              </TabPanel>
            </>
          ) : (
            <Typography>Loading</Typography>
          )}
        </Tabs>
      )}
      <Box
        className="z-100 sticky "
        sx={{
          bottom: "calc(env(safe-area-inset-bottom))",
          padding: 0,
        }}
      >
        <Card
          variant="outlined"
          color="primary"
          sx={(theme) => ({
            background: theme.palette.background.backdrop,
            backdropFilter: "blur(5px)",
            borderRadius: 0,
            overflowX: "clip",
            marginX: "calc(-1 * var(--variant-borderWidth, 0px))",
            marginBottom: "calc(-10 * var(--variant-borderWidth, 0px))",
            paddingTop: shouldShowProgress ? 0 : "var(--Card-padding, 0px)",
          })}
        >
          {shouldShowProgress && (
            <Tooltip title={progressLabel}>
              <Box
                sx={{
                  paddingBottom: "var(--Card-padding, 0px)",
                  position: "relative",
                  zIndex: 0,
                  marginX: "calc(-1.5 * var(--Card-padding, 0px))",
                }}
              >
                <LinearProgress
                  sx={{
                    position: "absolute",
                    top: 0,
                    width: "100%",
                    "--LinearProgress-progressRadius": 0,
                  }}
                  determinate={true}
                  value={progressPercent}
                  color="neutral"
                  thickness={20}
                >
                  {
                    <Typography
                      level="body-xs"
                      fontWeight="xl"
                      sx={{ mixBlendMode: "difference" }}
                    >
                      {progressLabel}
                    </Typography>
                  }
                </LinearProgress>

                <LinearProgress
                  sx={{
                    position: "absolute",
                    // mixBlendMode: "plus-lighter",
                    opacity: 0.5,
                    top: 0,
                    width: "100%",
                    "--LinearProgress-progressRadius": 0,
                  }}
                  determinate={true}
                  // value={50}
                  value={
                    isNaN(inProgressOrDonePercent) ? 0 : inProgressOrDonePercent
                  }
                  color="neutral"
                  thickness={20}
                  variant="soft"
                ></LinearProgress>
                <Typography className="flex-grow justify-end">Test</Typography>
              </Box>
            </Tooltip>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1}
            className="flex w-full items-center"
          >
            {!isRunning && selectedGoal && (
              <ExecutionSelect
                goalId={selectedGoal.id}
                executions={selectedGoal.executions}
                sx={{
                  width: "100%",
                  flex: "1 1 auto",
                }}
                className="overflow-clip"
              />
            )}
            <Box
              component={Stack}
              direction="row"
              className="min-w-fit justify-end"
              sx={{
                alignItems: "center",
                pl: 1.5,
                flex: "1 1 auto",
              }}
              gap={1}
            >
              <Box
                className="items-center justify-end text-center align-top"
                component={Stack}
                gap={0.5}
              >
                {!session && (
                  <Box className="text-center">
                    <Typography level="body-sm">
                      <Link href={routes.auth} target="_blank" color="primary">
                        {isRunning
                          ? "Sign in to save your next waggle"
                          : undefined}
                      </Link>
                    </Typography>
                    <Divider />
                  </Box>
                )}
                <Checkbox
                  size="sm"
                  checked={isAutoScrollToBottom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setIsAutoScrollToBottom(e.target.checked);
                  }}
                  label={<Typography>Auto scroll to task</Typography>}
                >
                  Autostart
                </Checkbox>

                <GoalSettings />
              </Box>
              <Button
                size="lg"
                className="col-end"
                color="primary"
                variant="soft"
                onClick={isRunning ? handleStop : handleStart}
                endDecorator={isRunning ? <StopCircle /> : <PlayCircle />}
                sx={{
                  zIndex: 15,
                  paddingX: { xs: 1, sm: 2 },
                  minHeight: { xs: 2, sm: 3 },
                }}
              >
                {isRunning && (
                  <CircularProgress
                    size="sm"
                    variant="soft"
                    sx={{ marginRight: 1 }}
                  />
                )}
                <Stack
                  direction={{ xs: "row", sm: "column" }}
                  gap="0.5rem"
                  className="items-center"
                >
                  <Typography level="h4">
                    {isRunning ? (
                      <>Stop</>
                    ) : (
                      <>{dag.nodes.length > 0 ? "Restart" : "Start"}</>
                    )}
                  </Typography>
                </Stack>
              </Button>
            </Box>
          </Stack>
        </Card>
      </Box>
    </Stack>
  );
};

export default WaggleDanceGraph;
