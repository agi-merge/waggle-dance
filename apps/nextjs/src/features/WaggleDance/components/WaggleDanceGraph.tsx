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
import { TRPCClientError } from "@trpc/client";
import assert from "assert";
import { useSession } from "next-auth/react";
import router from "next/router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { stringify } from "yaml";

import { type Execution } from "@acme/db";

import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import Checkbox from "@mui/joy/Checkbox";
import CircularProgress from "@mui/joy/CircularProgress";
import Divider from "@mui/joy/Divider";
import IconButton from "@mui/joy/IconButton";
import LinearProgress from "@mui/joy/LinearProgress";
import Link from "@mui/joy/Link";
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
import GoalSettings from "~/features/GoalMenu/components/GoalSettings";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineState, {
  newDraftExecutionId,
} from "~/stores/waggleDanceStore";
import { api } from "~/utils/api";
import routes from "~/utils/routes";
import { rootPlanId } from "../WaggleDanceMachine";
import useWaggleDanceMachine, {
  TaskStatus,
  type TaskState,
} from "../hooks/useWaggleDanceMachine";
import { type JsonValue } from "../types";
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
    setExecution,
  } = useWaggleDanceMachineState();
  const {
    graphData,
    dag,
    stop,
    run: startWaggleDance,
    logs,
    taskStates,
  } = useWaggleDanceMachine({
    goal: selectedGoal,
  });
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
      if (a.status === b.status) {
        return a.id.localeCompare(b.id) || 1;
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
      let createdExecution: Execution | undefined;

      if (error) {
        type HTTPStatusy = { httpStatus: number };
        if (error instanceof TRPCClientError) {
          const data = error.data as HTTPStatusy;
          // route for anonymous users
          if (data.httpStatus === 401 && selectedGoal) {
            const exeId = newDraftExecutionId();
            const goalId = selectedGoal.id;
            const draftExecution: Execution = {
              id: exeId,
              goalId,
              userId: "guest",
              graph: dag as JsonValue,
              state: "EXECUTING",
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            createdExecution = draftExecution;
          }
          if (!createdExecution) {
            console.error("error which is not the expected 401", error);
            return;
          }
        }
      } else {
        createdExecution = data;
      }
      assert(createdExecution);
      void (async () => {
        console.log("replace route");
        setExecution(createdExecution);
        await router.push(
          routes.goal(createdExecution.goalId, createdExecution?.id),
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

  const progress = useMemo(() => {
    return (results.length / taskStates.length) * 100;
  }, [results.length, taskStates.length]);

  const inProgressTasks = useMemo(() => {
    return taskStates.filter((s) => s.status !== TaskStatus.idle).length;
  }, [taskStates]);

  const inProgress = useMemo(() => {
    return (inProgressTasks / taskStates.length) * 100;
  }, [inProgressTasks, taskStates.length]);

  const progressLabel = useMemo(() => {
    return `Tasks in progress or done: ${results.length}, ${inProgressTasks}, total: ${taskStates.length}`;
  }, [inProgressTasks, results.length, taskStates.length]);

  const shouldShowProgress = useMemo(() => {
    return isRunning || results.length > 0;
  }, [isRunning, results]);

  return (
    <Stack gap="1rem" sx={{ mx: -3 }}>
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
              backdropFilter: "blur(5px)", // blur effect
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
                  {sortedTaskStates.map((n, i) => (
                    <React.Fragment key={n.id}>
                      <ListItem
                        sx={{
                          width: { xs: "100%", sm: "auto" },
                          flexDirection: { xs: "column", sm: "row" },
                        }}
                        ref={(el) => el && (listItemsRef.current[i] = el)}
                      >
                        <ListItemDecorator
                          color={statusColor(n)}
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
                              {n.name}
                            </Typography>
                            <Typography
                              level="title-sm"
                              color="neutral"
                              fontFamily="monospace"
                            >
                              id:{" "}
                              <Typography level="body-sm">{n.id}</Typography>
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
                                {n.act}
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
                                  {n.params}
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
                                {stringifyMax(n.context, 200)}
                              </Typography>
                            </Stack>

                            {/* {isRunning && n.status === TaskStatus.working && (
                              <LinearProgress thickness={2} />
                            )} */}
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
                                {n.result ? <>Result: </> : <>Status: </>}
                                <Typography
                                  color={statusColor(n)}
                                  level="body-md"
                                >
                                  {isRunning
                                    ? n.fromPacketType
                                    : n.status === TaskStatus.working ||
                                      n.status === TaskStatus.starting ||
                                      n.status === TaskStatus.wait
                                    ? "stopped"
                                    : n.fromPacketType}
                                </Typography>
                              </Typography>

                              {n.result && (
                                <Typography
                                  level="body-sm"
                                  className="max-h-72 overflow-x-clip overflow-y-scroll  break-words pt-2"
                                  fontFamily={
                                    n.status === TaskStatus.error
                                      ? "monospace"
                                      : undefined
                                  }
                                >
                                  {n.result}
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
          margin: 0,
        }}
      >
        <Card
          variant="outlined"
          color="primary"
          sx={(theme) => ({
            backgroundColor: theme.palette.background.backdrop,
            backdropFilter: "blur(5px)",
            paddingTop: shouldShowProgress ? 0 : "var(--Card-padding, 0px)",
            borderRadius: "lg",
            overflowX: "clip",
            margin: "calc(-1 * var(--variant-borderWidth, 0px))",
          })}
        >
          {shouldShowProgress && (
            <Tooltip
              title={`Shows Tasks Done / Total Tasks, and the progress bars show tasks in currently progress and completed tasks.`}
            >
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
                  value={progress}
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
                  value={isNaN(inProgress) ? 0 : inProgress}
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
                  <>
                    <Typography level="body-sm">
                      <Link href={routes.auth} target="_blank" color="primary">
                        Sign in to save your progress
                      </Link>
                    </Typography>
                    <Divider />
                  </>
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
                sx={{ zIndex: 15, padding: { xs: 1, sm: 2 } }}
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
                  {isRunning ? (
                    <>Stop</>
                  ) : (
                    <>{dag.nodes.length > 0 ? "Restart" : "Start"}</>
                  )}
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
