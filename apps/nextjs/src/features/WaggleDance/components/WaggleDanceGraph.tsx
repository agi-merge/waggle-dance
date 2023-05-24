import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Edit,
  Lan,
  ListAlt,
  Science,
  Send,
  Start,
  Stop,
} from "@mui/icons-material";
import {
  Button,
  Card,
  Divider,
  Input,
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

import PageTitle from "~/features/MainLayout/components/PageTitle";
import AddDocuments from "~/pages/add-documents";
import useApp from "~/stores/appStore";
import useGoal from "~/stores/goalStore";
import useWaggleDanceMachine, {
  type TaskState,
} from "../hooks/useWaggleDanceMachine";
import DocsModal from "./DocsModal";
import ForceGraph from "./ForceGraph";
import TaskChainSelectMenu from "./TaskChainSelectMenu";

type WaggleDanceGraphProps = StackProps;
// shows the graph, agents, results, general messages and chat input
const WaggleDanceGraph = ({}: WaggleDanceGraphProps) => {
  const { isRunning, setIsRunning, isAutoStartEnabled, setIsAutoStartEnabled } =
    useApp();
  const { goal } = useGoal();
  const { graphData, dag, run, isDonePlanning, logs, taskStates } =
    useWaggleDanceMachine({
      goal,
    });
  const [chatInput, setChatInput] = useState("");
  const [runId, setRunId] = useState<Date | null>(null);

  // Replace console.log() calls with customLog()
  const handleStart = useCallback(() => {
    if (!isRunning) {
      setRunId(new Date());
      setIsRunning(true);
      void run();
    } else {
      setIsRunning(true);
    }
  }, [run, setIsRunning, isRunning]);

  const handleStop = () => {
    setIsRunning(false);
  };

  const hasMountedRef = useRef(false);

  // auto-start
  useEffect(() => {
    if (isAutoStartEnabled) {
      setIsAutoStartEnabled(false);
      // setTimeout(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        handleStart();
      }
      // }, 333);
    }
  });

  const stringifyMax = (value: unknown, max: number) => {
    const json = JSON.stringify(value);
    return json.length < max ? json : `${json.slice(0, max)}…`;
  };

  const button = (
    <Stack direction="row" gap="0.1rem" className="flex items-end justify-end">
      {isRunning && dag.nodes.length > 1 ? (
        <Tooltip title="Coming soon!" color="info">
          <Input
            endDecorator={
              <Button
                variant="plain"
                color="neutral"
                className="m-0 p-0"
                onClick={(event) => {
                  event.preventDefault();
                  setChatInput("");
                }}
              >
                <Send />
              </Button>
            }
            startDecorator={<TaskChainSelectMenu dag={dag} />}
            variant="outlined"
            className="flex-grow"
            placeholder="Chat → AIs"
            onKeyUp={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setChatInput("");
              }
            }}
            onChange={(event) => {
              setChatInput(event.target.value);
            }}
            value={chatInput}
          />
        </Tooltip>
      ) : null}
      <Button
        className="col-end p-2"
        color="primary"
        href="waggle-dance"
        onClick={isRunning ? handleStop : handleStart}
      >
        <Stack direction="row" gap="0.5rem" className="items-center">
          {isRunning ? (
            <>
              Stop <Stop />
            </>
          ) : (
            <>
              {dag.nodes.length > 0 ? "Restart" : "Start"}
              <Start />
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
      case "running":
        return "info";
      case "idle":
        return "neutral";
      case "working":
        return "warning";
      case "working":
        return "info";
      default:
        return "neutral";
    }
  };

  return (
    <Stack gap="1rem">
      <PageTitle
        title={!isRunning ? "🐝💃" : "Please 🐝 patient"}
        description={
          !isRunning
            ? "Waggle dancing puts a swarm of language AIs to work to achieve your goal. The AIs split your goal into tasks, does them, and tries to fix mistakes on its own."
            : !isDonePlanning
            ? "Planning tasks… this may take a minute…"
            : "Almost done! Optimizing tasks…"
        }
      />
      <DocsModal>
        <AddDocuments hideTitleGoal={true} />
      </DocsModal>
      {!isRunning && button}

      {dag.nodes.length > 0 && (
        <Tabs
          size="sm"
          key={runId?.toString()}
          aria-label="Waggle Dance Status and Results"
          defaultValue={0}
          variant="outlined"
          sx={{ borderRadius: "sm" }}
        >
          <TabList variant="outlined" color="primary">
            <Tab>
              <ListAlt />
              <Typography className="px-1">Tasks</Typography>
            </Tab>
            <Tab>
              <Science />
              <Typography>Logs</Typography>
            </Tab>
            {dag.nodes.length > 2 && (
              <Tab>
                <Lan />
                <Typography className="px-1">Graph</Typography>
              </Tab>
            )}
          </TabList>
          {taskStates.length > 0 && (
            <>
              {isRunning && !isDonePlanning && (
                <LinearProgress thickness={1} className="mx-2 -mt-0.5" />
              )}
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
                      return a.status.localeCompare(b.status);
                    })
                    .map((n) => (
                      <>
                        <Card
                          key={`${n.id}-${n.name}`}
                          color={statusColor(n)}
                          variant="outlined"
                          sx={{ backgroundColor: statusColor(n) }}
                        >
                          <ListItem>
                            <ListItemButton>
                              <ListItemContent
                                className="flex w-96"
                                sx={{ backgroundColor: statusColor(n) }}
                              >
                                <Stack
                                  direction="column"
                                  className="flex flex-grow"
                                  gap="1rem"
                                  style={{
                                    overflowWrap: "break-word",
                                    width: "20%",
                                  }}
                                >
                                  <Typography
                                    level="body4"
                                    className="text-wrap flex"
                                    color="primary"
                                  >
                                    {n.name}
                                    <br />
                                    <Typography
                                      level="body4"
                                      textColor="common.white"
                                      sx={{ mixBlendMode: "difference" }}
                                    >
                                      Status:
                                    </Typography>{" "}
                                    <Typography
                                      level="body4"
                                      color={statusColor(n)}
                                    >
                                      {n.status}
                                    </Typography>
                                  </Typography>
                                </Stack>
                                <Typography
                                  level="body3"
                                  className="text-wrap"
                                  style={{
                                    overflowWrap: "break-word",
                                    width: "80%",
                                  }}
                                >
                                  {n.act}{" "}
                                  <Typography
                                    fontFamily="monospace"
                                    level="body5"
                                    color="info"
                                    variant="outlined"
                                    className="text-wrap"
                                    style={{
                                      overflowWrap: "break-word",
                                      width: "100%",
                                    }}
                                  >
                                    {stringifyMax(n.params, 200)}
                                  </Typography>
                                </Typography>
                              </ListItemContent>
                              <Stack gap="0.3rem">
                                <Tooltip title="Chat">
                                  <Send />
                                </Tooltip>
                                <Divider />
                                <Tooltip title="Edit">
                                  <Edit />
                                </Tooltip>
                              </Stack>
                            </ListItemButton>
                          </ListItem>
                        </Card>
                        <ListDivider inset="gutter" />
                      </>
                    ))}
                </List>
              </TabPanel>
              <TabPanel
                value={1}
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
                    <>
                      <ListItem
                        key={log.timestamp.toString()}
                        className="overflow-x-scroll"
                      >
                        <Stack
                          direction="row"
                          className="max-h-24 overflow-x-scroll"
                          gap="1rem"
                        >
                          <Typography
                            fontFamily="Monospace"
                            color="info"
                            level="body3"
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
                    </>
                  ))}
                </List>
              </TabPanel>
              {dag.nodes.length > 2 && (
                <TabPanel
                  value={2}
                  className="min-h-90 w-full items-center overflow-y-scroll"
                  sx={{ padding: { xs: 0, sm: 2 } }}
                >
                  <ForceGraph data={graphData} />
                </TabPanel>
              )}
            </>
          )}
        </Tabs>
      )}
      {isRunning && button}
    </Stack>
  );
};

export default WaggleDanceGraph;
