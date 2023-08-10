import assert from "assert";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
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
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Link,
  List,
  ListDivider,
  ListItem,
  ListItemContent,
  ListItemDecorator,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Tooltip,
  Typography,
  type StackProps,
} from "@mui/joy";
import { TRPCClientError } from "@trpc/client";
import { stringify } from "yaml";

import { type Execution } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import GoalSettings from "~/features/GoalMenu/components/GoalSettings";
import { type GoalPlusExe } from "~/stores/goalStore";
import useWaggleDanceMachineState, {
  newDraftExecutionId,
} from "~/stores/waggleDanceStore";
import useWaggleDanceMachine, {
  TaskStatus,
  type TaskState,
} from "../hooks/useWaggleDanceMachine";
import { type JsonValue } from "../types";
import { rootPlanId } from "../WaggleDanceMachine";
import { ExecutionSelect } from "./ExecutionSelect";
import ForceGraph from "./ForceGraph";

type WaggleDanceGraphProps = {
  selectedGoal: GoalPlusExe;
  executions: Execution[] | undefined;
} & StackProps;
// shows the graph, agents, results, general messages and chat input
const WaggleDanceGraph = ({
  selectedGoal,
  executions,
}: WaggleDanceGraphProps) => {
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
              state: "PENDING",
              createdAt: new Date(),
              updatedAt: new Date(),
              uniqueToken: newDraftExecutionId(), // extra uuid
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
        await setExecution(createdExecution, {
          goalId: selectedGoal.id,
          router,
        });
        await startWaggleDance();
      })();
    },
  });

  const handleStart = useCallback(() => {
    if (!isRunning) {
      if (selectedGoal) {
        setIsRunning(true);

        createExecution({ goalId: selectedGoal.id });
      } else {
        setIsRunning(false);
        console.error("no goal selected");
      }
    }
  }, [isRunning, selectedGoal, setIsRunning, createExecution]);

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

  const stringifyMax = (value: unknown, max: number) => {
    const json = stringify(value);
    return json && json.length < max ? json : `${json.slice(0, max)}…`;
  };
  const button = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      gap="0.5rem"
      className=" flex items-center justify-end "
      component={Card}
      variant="outlined"
      color="primary"
      sx={{ borderRadius: "lg", padding: 1 }}
    >
      <ExecutionSelect
        goalId={selectedGoal.id}
        executions={executions}
        sx={{
          width: { xs: "18rem", sm: "20rem", md: "24rem", lg: "28rem" },
        }}
      />
      <Box
        component={Stack}
        direction="row"
        sx={{ alignItems: "center", pl: 1.5 }}
        gap={1}
      >
        <Box
          className="items-center justify-center text-center align-top"
          component={Stack}
          gap={0.5}
        >
          <Typography level="body-sm">
            <Link href={routes.auth} target="_blank" color="primary">
              Sign in to save your progress
            </Link>
          </Typography>

          <Divider />
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
  );

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

  const _progress = useMemo(() => {
    return (results.length / taskStates.length) * 100;
  }, [results.length, taskStates.length]);

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
            tabFlex={"auto"}
            variant="outlined"
            sx={{
              borderRadius: "0",
              flexWrap: "nowrap",
              top: "calc(-1 * (var(--main-paddingTop, 0px) - var(--Header-height, 0px)))",
              width: "100%",
            }}
          >
            <Tab value={0}>
              <ListAlt />
              <Typography className="px-1">Tasks</Typography>
            </Tab>
            <Tab
              value={1}
              disabled={dag.nodes.length < 2}
              sx={{ opacity: dag.nodes.length < 2 ? 0.2 : 1 }}
            >
              <Lan />
              <Typography className="px-1">Graph</Typography>
            </Tab>
            <Tab
              value={2}
              disabled={results.length < 1}
              sx={{ opacity: results.length < 1 ? 0.2 : 1 }}
            >
              <Science />
              <Typography>Results</Typography>
            </Tab>
            <Tab
              value={3}
              disabled={logs.length < 1}
              sx={{ opacity: logs.length < 1 ? 0.2 : 1 }}
            >
              <BugReport />
            </Tab>
          </TabList>

          {taskStates.length > 0 ? (
            <>
              <TabPanel value={0} className="w-full overflow-y-scroll p-4">
                <List aria-label="Task list" size="sm" className="">
                  {sortedTaskStates.map((n, i) => (
                    <React.Fragment key={n.id}>
                      <ListItem
                        sx={{
                          width: { xs: "100%", sm: "auto" },
                          flexDirection: { xs: "column", sm: "row" },
                        }}
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
                            <Typography level="title-md" color="primary">
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
                            variant="soft"
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

                            {isRunning && n.status === TaskStatus.working && (
                              <LinearProgress thickness={2} />
                            )}
                            <Card
                              size="sm"
                              className="justify-start p-1 text-start"
                              component={Stack}
                              direction={"column"}
                            >
                              <Typography level="title-lg">
                                {n.result ? <>Result: </> : <>Status: </>}
                                <Typography
                                  color={statusColor(n)}
                                  level="body-md"
                                >
                                  {isRunning
                                    ? n.status
                                    : n.status === TaskStatus.working ||
                                      n.status === TaskStatus.starting ||
                                      n.status === TaskStatus.wait
                                    ? "stopped"
                                    : n.status}
                                </Typography>
                              </Typography>

                              {n.result && (
                                <Typography level="body-sm" className="pt-2">
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
        className="z-100 sticky"
        sx={{ bottom: "calc(env(safe-area-inset-bottom))" }}
      >
        <Box className="bottom sticky" sx={{ posiiton: "relative" }}>
          <LinearProgress
            sx={{
              position: "absolute",
              mixBlendMode: "multiply",
              bottom: 0,
              right: 0,
              width: "100%",
              zIndex: 11, // Make sure the z-index is less than the button's
            }}
            determinate={_progress !== 0}
            value={_progress}
            color="neutral"
          />
          {isRunning && (
            <LinearProgress
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "100%",
                zIndex: 10, // Make sure the z-index is less than the button's
              }}
            />
          )}
        </Box>
        {button}
      </Box>
    </Stack>
  );
};

export default WaggleDanceGraph;
