import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Edit, Lan, ListAlt, Send, Start, Stop } from "@mui/icons-material";
import {
  Button,
  Input,
  LinearProgress,
  List,
  ListDivider,
  ListItem,
  ListItemButton,
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

import AddDocuments from "~/pages/add-documents";
import useApp from "~/stores/appStore";
import useGoal from "~/stores/goalStore";
import useWaggleDanceMachine from "../hooks/useWaggleDanceMachine";
import DocsModal from "./DocsModal";
import ForceGraph from "./ForceGraph";
import TaskChainSelectMenu from "./TaskChainSelectMenu";

type WaggleDanceGraphProps = StackProps;
// shows the graph, agents, results, general messages and chat input
const WaggleDanceGraph = ({}: WaggleDanceGraphProps) => {
  const { isRunning, setIsRunning, isAutoStartEnabled, setIsAutoStartEnabled } =
    useApp();
  const { goal } = useGoal();
  const { graphData, dag, run, isDonePlanning } = useWaggleDanceMachine({
    goal,
  });
  const [chatInput, setChatInput] = React.useState("");
  const [runId, setRunId] = useState<Date | null>(null);

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

  const isAttachingRealEdges = useMemo(() => {
    return dag.edges.filter((e) => e.sId !== "👸").length > 0;
  }, [dag.edges]);

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
        {isRunning ? (
          <>
            Stop <Stop />
          </>
        ) : (
          <>
            {dag.nodes.length > 0 ? "Restart" : "Start"} <Start />
          </>
        )}
      </Button>
    </Stack>
  );

  return (
    <Stack gap="1rem" className="mt-6">
      {!isRunning && button}
      {isRunning && (
        <>
          {isDonePlanning && (
            <Typography className="text-center" color="warning" level="body4">
              This demo will currently not proceed beyond initial planning.
            </Typography>
          )}
          {!isDonePlanning && (
            <Stack className="text-center">
              <Typography
                level="h5"
                color={isAttachingRealEdges ? "success" : "primary"}
              >
                {isAttachingRealEdges ? "Almost done! " : "Please 🐝 patient, "}
                <Typography color="neutral">
                  {!isAttachingRealEdges
                    ? "planning tasks…"
                    : "optimizing tasks…"}
                </Typography>
              </Typography>
              <Typography level="body3">
                This important first step can take a minute or two.
              </Typography>
            </Stack>
          )}
        </>
      )}

      {dag.nodes.length > 0 && (
        <Tabs
          key={runId?.toString()}
          aria-label="Waggle Dance Status and Results"
          defaultValue={0}
          variant="outlined"
          sx={{ borderRadius: "lg" }}
        >
          <TabList variant="outlined" color="primary">
            <Tab>
              <ListAlt />
              <Typography className="px-1">Tasks</Typography>
            </Tab>
            {dag.nodes.length > 2 && ( // would be 1, except rendering bugs when its only 2 nodes.
              <Tab>
                <Lan />
                <Typography className="px-1">Graph</Typography>
              </Tab>
            )}
            {/* {dag.init.predicate && (
                <Tab>
                  <Science />
                  <Typography>Results</Typography>
                </Tab>
              )} */}
          </TabList>
          {dag.nodes.length > 0 && (
            <>
              {isRunning && !isDonePlanning && (
                <LinearProgress thickness={1} className="mx-2 -mt-0.5" />
              )}
              <TabPanel
                value={0}
                className="relative h-96 w-full overflow-y-scroll p-4"
              >
                <List
                  className="absolute left-0 top-0 mt-3"
                  sx={{
                    marginX: { xs: -2, sm: 0 },
                  }}
                >
                  {dag.nodes.map((n, i) => (
                    <>
                      <ListItem key={n.id}>
                        <ListItemButton>
                          <ListItemDecorator>
                            <Typography color="primary" level="body3">
                              {i > 0
                                ? i < dag.nodes.length - 1
                                  ? "🐝"
                                  : isDonePlanning
                                  ? "🍯"
                                  : "🐝"
                                : n.id}
                            </Typography>
                          </ListItemDecorator>
                          <ListItemContent>
                            <Typography>{n.name}</Typography>
                            <Typography level="body3">
                              {n.act}{" "}
                              <Typography
                                fontFamily="monospace"
                                level="body5"
                                color="info"
                                variant="outlined"
                              >
                                {JSON.stringify(n.params)}
                              </Typography>
                            </Typography>
                          </ListItemContent>
                          <Stack gap="0.3rem">
                            <Tooltip title="Chat">
                              <Send />
                            </Tooltip>
                            <Tooltip title="Edit">
                              <Edit />
                            </Tooltip>
                          </Stack>
                        </ListItemButton>
                      </ListItem>
                      <ListDivider inset="gutter" />
                    </>
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
              <TabPanel value={2} className="text-center">
                Work in progres…
                {/* {dag.init.predicate && (
                    <Sheet>
                      <Table aria-label="Results table">
                        <thead>
                          <tr>
                            <th>State</th>
                            <th>Predicate</th>
                            <th>Parameters</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Initial</td>
                            <td>{dag.init.predicate}</td>
                            <td>
                              <pre>
                                <code>
                                  {JSON.stringify(dag.init.params, null, 2)}
                                </code>
                              </pre>
                            </td>
                          </tr>
                          <tr>
                            <td>Goal</td>
                            <td>{dag.goal.predicate}</td>
                            <td>
                              <pre>
                                <code>
                                  {JSON.stringify(dag.goal.params, null, 2)}
                                </code>
                              </pre>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Sheet>
                  )} */}
              </TabPanel>
            </>
          )}
        </Tabs>
      )}
      <DocsModal>
        <AddDocuments hideTitleGoal={true} />
      </DocsModal>
      {isRunning && button}
    </Stack>
  );
};

export default WaggleDanceGraph;
