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
  Pause,
  PlayArrow,
  Science,
  Send,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  LinearProgress,
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stringify } from "yaml";

import { type Execution } from "@acme/db";

import { api } from "~/utils/api";
import { app } from "~/constants";
import GoalSettings from "~/features/GoalMenu/components/GoalSettings";
import { type GoalPlusExe } from "~/stores/goalStore";
import useWaggleDanceMachineState from "~/stores/waggleDanceStore";
import useWaggleDanceMachine, {
  TaskStatus,
  type TaskState,
} from "../hooks/useWaggleDanceMachine";
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
  const { isRunning, setIsRunning, isAutoStartEnabled, setIsAutoStartEnabled } =
    useWaggleDanceMachineState();

  const [execution, setExecution] = useState<Execution | undefined>(
    executions && executions[0],
  );

  const { graphData, dag, stop, run, logs, taskStates } = useWaggleDanceMachine(
    {
      goal: selectedGoal,
    },
  );

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
    onSuccess: (data) => {
      console.log("create execution: ", data);
      setExecution(data);
      selectedGoal &&
        void router.push(app.routes.goal(selectedGoal.id, execution?.id));
      if (!selectedGoal || !execution) {
        console.error(
          `no goal(${selectedGoal?.id}) or execution: ${execution}`,
        );
      }
    },
    onError: (e) => {
      setExecution(undefined);
      console.error("Failed to post!", e.message);
    },
  });

  const handleStart = useCallback(() => {
    if (!isRunning) {
      if (selectedGoal) {
        setIsRunning(true);
        createExecution({ goalId: selectedGoal.id });
        void run();
      } else {
        console.error("no goal selected");
      }
    }
  }, [isRunning, selectedGoal, setIsRunning, createExecution, run]);

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
      direction="row"
      gap="0.5rem"
      className="flex items-center justify-end"
      component={Card}
    >
      <ExecutionSelect
        executions={executions}
        sx={{ width: { xs: "18rem", sm: "20rem", md: "24rem", lg: "28rem" } }}
      />
      <Box className="items-center justify-center align-top">
        <GoalSettings />
      </Box>
      <Button
        className="col-end p-2"
        color="primary"
        variant="soft"
        onClick={isRunning ? handleStop : handleStart}
      >
        <Stack
          direction={{ xs: "row", sm: "column" }}
          gap="0.5rem"
          className="items-center"
        >
          {isRunning ? (
            <>
              Pause <Pause />
            </>
          ) : (
            <>
              {dag.nodes.length > 0 ? "Resume" : "Start"}
              <PlayArrow />
            </>
          )}
        </Stack>
      </Button>
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

  const progress = useMemo(() => {
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

          {taskStates.length > 0 && (
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
                            flexDirection: { xs: "row-reverse", sm: "column" },
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
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {n.result}
                                  </ReactMarkdown>
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
          )}
        </Tabs>
      )}
      {button}
    </Stack>
  );
};

export default WaggleDanceGraph;
