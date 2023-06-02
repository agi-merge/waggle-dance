import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import PageTitle from "~/features/MainLayout/components/PageTitle";
import AddDocuments from "~/pages/add-documents";
import useGoal from "~/stores/goalStore";
import useWaggleDanceMachineState from "~/stores/waggleDanceStore";
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
    useWaggleDanceMachineState();
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
    return json && json.length < max ? json : `${json.slice(0, max)}…`;
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
      case "running":
        return "info";
      case "idle":
        return "neutral";
      case "starting":
        return "info";
      case "working":
        return "info";
      default:
        return "neutral";
    }
  };

  const progress = useMemo(() => {
    return (
      (taskStates.filter((n) => !!n.result).length / taskStates.length) * 100
    );
  }, [taskStates]);

  return (
    <Stack gap="1rem">
      <PageTitle
        title={!isRunning ? "🐝💃" : isDonePlanning ? "" : "Please 🐝 patient"}
        description={
          !isRunning
            ? "Waggle dancing puts a swarm of language AIs to work to achieve your goal. The AIs split your goal into tasks, complete the tasks, and try to fix mistakes on their own."
            : !isDonePlanning
            ? "Planning tasks… this may take a minute… Please do NOT close this page or refresh."
            : "Done planning. Running tasks… Please do NOT close this page or refresh."
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
              {(isRunning && !isDonePlanning && (
                <LinearProgress thickness={1} className="mx-2" />
              )) || (
                <LinearProgress
                  determinate={true}
                  value={progress}
                  thickness={3}
                  className="mx-3"
                />
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
                  {taskStates.map((n) => (
                    <Box key={`${n.id}-${n.name}`}>
                      <Card
                        color={statusColor(n)}
                        variant="soft"
                        sx={{ backgroundColor: statusColor(n), padding: 0 }}
                      >
                        <ListItem>
                          <ListItemButton sx={{ borderRadius: "md" }}>
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
                                    level="body3"
                                    className="text-wrap flex p-1"
                                    color="primary"
                                    sx={{ mixBlendMode: "difference" }}
                                  >
                                    {n.name}
                                  </Typography>
                                  <Typography
                                    level="body4"
                                    className="text-wrap flex p-1"
                                    color="neutral"
                                    fontFamily="monospace"
                                  >
                                    id: {n.id}
                                  </Typography>
                                </Stack>
                              </Box>
                              <Typography
                                level="body2"
                                className="text-wrap p-2"
                                textColor="common.white"
                                style={{
                                  overflowWrap: "break-word",
                                }}
                                sx={{
                                  xs: { width: "80%" },
                                  width: "70%",
                                  mixBlendMode: "difference",
                                }}
                              >
                                {n.act}
                                {"("}
                                <Typography
                                  fontFamily="monospace"
                                  level="body3"
                                  className="text-wrap"
                                  style={{
                                    overflowWrap: "break-word",
                                    width: "100%",
                                  }}
                                >
                                  {stringifyMax(n.context, 200)}
                                </Typography>

                                {")"}
                              </Typography>
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

                        <Card
                          className="justify-start text-start"
                          variant="outlined"
                          sx={{ padding: "-1rem" }}
                        >
                          <Typography level="h6">
                            {n.result ? <>Result: </> : <>Status: </>}
                          </Typography>
                          {n.result ? (
                            <Typography level="body4" className="overflow-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {n.result}
                              </ReactMarkdown>
                            </Typography>
                          ) : (
                            <>{n.status}</>
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
                    <Box key={log.timestamp.toString()}>
                      <ListItem className="overflow-x-scroll">
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
                    </Box>
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
