import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  LinearProgress,
  List,
  ListDivider,
  ListItem,
  ListItemButton,
  ListItemContent,
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

import GoalSettings from "~/features/GoalMenu/components/GoalSettings";
import { type GoalPlusExe } from "~/stores/goalStore";
import useWaggleDanceMachineState from "~/stores/waggleDanceStore";
import useWaggleDanceMachine, {
  TaskStatus,
  type TaskState,
} from "../hooks/useWaggleDanceMachine";
import { rootPlanId } from "../WaggleDanceMachine";
import ForceGraph from "./ForceGraph";

type WaggleDanceGraphProps = {
  selectedGoal: GoalPlusExe | undefined;
} & StackProps;
// shows the graph, agents, results, general messages and chat input
const WaggleDanceGraph = ({ selectedGoal }: WaggleDanceGraphProps) => {
  const { isRunning, setIsRunning, isAutoStartEnabled, setIsAutoStartEnabled } =
    useWaggleDanceMachineState();

  const { graphData, dag, stop, run, logs, taskStates } = useWaggleDanceMachine(
    {
      goal: selectedGoal,
    },
  );
  const [runId, setRunId] = useState<Date | null>(null);

  // Replace console.log() calls with customLog()
  const handleStart = useCallback(() => {
    if (!isRunning) {
      setRunId(new Date());
      setIsRunning(true);
      void run();
    }
  }, [run, setIsRunning, isRunning]);

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
    >
      <Box className="items-center justify-center align-top">
        <GoalSettings />
      </Box>
      <Button
        className="col-end p-2"
        color="primary"
        variant="soft"
        onClick={isRunning ? handleStop : handleStart}
      >
        <Stack direction="row" gap="0.5rem" className="items-center">
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
    switch (n.status.toLocaleLowerCase()) {
      case "done":
        return "success";
      case "error":
        return "danger";
      case "idle":
        return "neutral";
      case "starting":
        return "primary";
      case "working":
        return "primary";
      case "stopped":
        return "warning";
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
    <Stack gap="1rem">
      {button}
      {dag.nodes.length > 0 && (
        <Tabs
          size="sm"
          key={runId?.toString()}
          aria-label="Waggle Dance Status and Results"
          defaultValue={0}
          variant="plain"
          color="neutral"
          sx={{ borderRadius: "sm" }}
        >
          <TabList tabFlex={"auto"}>
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
              <Tooltip
                title={`${progress.toFixed(0)}% through planned tasks.`}
                variant="soft"
                color="neutral"
              >
                <LinearProgress
                  determinate={true}
                  value={progress}
                  thickness={3}
                  className="mx-3 -mt-0.5"
                />
              </Tooltip>

              <TabPanel
                value={0}
                className=" relative max-h-96 w-full overflow-y-scroll p-4"
              >
                <List
                  aria-label="Task list"
                  className="absolute left-0 top-0 mt-3"
                  sx={{
                    marginX: { xs: -2, sm: 0 },
                  }}
                >
                  {taskStates
                    .sort((a: TaskState, b: TaskState) => {
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
                    })
                    .map((n) => (
                      <Box key={n.id}>
                        <Card
                          color={statusColor(n)}
                          variant="soft"
                          invertedColors={n.status === TaskStatus.working}
                          sx={{
                            backgroundColor: statusColor(n),
                            padding: 0,
                          }}
                        >
                          <ListItem>
                            <ListItemButton
                              sx={{ borderRadius: "md" }}
                              disabled={n.status === TaskStatus.idle}
                            >
                              <ListItemContent
                                className="flex w-96"
                                sx={{ backgroundColor: statusColor(n) }}
                              >
                                <Box
                                  sx={{
                                    xs: { width: "20%" },
                                    width: "30%",
                                  }}
                                  className="min-h-24 overflow-auto p-2"
                                >
                                  <Stack
                                    direction="column"
                                    gap="0.25rem"
                                    style={{
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    <Typography
                                      level="body-lg"
                                      className="text-wrap flex p-1"
                                      color="primary"
                                    >
                                      {n.name}
                                    </Typography>
                                    <Typography
                                      level="body-sm"
                                      className="text-wrap flex p-1"
                                      color="neutral"
                                      fontFamily="monospace"
                                    >
                                      id: {n.id}
                                    </Typography>
                                  </Stack>
                                </Box>
                                <Stack
                                  className="text-wrap p-2"
                                  sx={{
                                    xs: { width: "80%" },
                                    width: "70%",
                                    mixBlendMode: "difference",
                                  }}
                                >
                                  <Typography
                                    level="body-lg"
                                    textColor="common.white"
                                    style={{
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    {n.act}
                                    {" ("}
                                    <Typography
                                      fontFamily="monospace"
                                      level="body-md"
                                      className="text-wrap"
                                      color="primary"
                                      style={{
                                        overflowWrap: "break-word",
                                        width: "100%",
                                      }}
                                    >
                                      {n.params}
                                    </Typography>
                                    {")"}
                                  </Typography>
                                  <Typography
                                    fontFamily="monospace"
                                    level="body-md"
                                    className="text-wrap"
                                    color="neutral"
                                    style={{
                                      overflowWrap: "break-word",
                                      width: "80%",
                                    }}
                                  >
                                    {stringifyMax(n.context, 200)}
                                  </Typography>
                                </Stack>
                                <Stack gap="0.3rem">
                                  <Tooltip title="Chat">
                                    <Send />
                                  </Tooltip>
                                  <Divider />
                                  <Tooltip title="Edit">
                                    <Edit />
                                  </Tooltip>
                                </Stack>
                              </ListItemContent>
                            </ListItemButton>
                          </ListItem>

                          {isRunning && n.status === TaskStatus.working && (
                            <LinearProgress thickness={1} />
                          )}
                          <Card className="justify-start text-start">
                            <Typography level="title-lg">
                              {n.result ? <>Result: </> : <>Status: </>}
                            </Typography>

                            <Typography color={statusColor(n)} level="body-lg">
                              {isRunning
                                ? n.status
                                : n.status === TaskStatus.working ||
                                  n.status === TaskStatus.starting ||
                                  n.status === TaskStatus.wait
                                ? "stopped"
                                : n.status}
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
                        <ListDivider inset="gutter" />
                      </Box>
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

              <TabPanel
                value={2}
                className=" relative max-h-96 w-full overflow-y-scroll p-4"
              >
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

              <TabPanel
                value={3}
                className=" relative max-h-96 w-full overflow-y-scroll p-4"
              >
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
      {dag.nodes.length > 0 && button}
    </Stack>
  );
};

export default WaggleDanceGraph;
