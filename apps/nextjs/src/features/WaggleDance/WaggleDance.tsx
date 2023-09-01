import assert from "assert";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import router from "next/router";
import { BugReport, Lan, ListAlt, Science } from "@mui/icons-material";
import { Link } from "@mui/joy";
import Box from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import List from "@mui/joy/List";
import ListDivider from "@mui/joy/ListDivider";
import ListItem from "@mui/joy/ListItem";
import Stack, { type StackProps } from "@mui/joy/Stack";
import Tab from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import TabPanel from "@mui/joy/TabPanel";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";
import { TRPCClientError } from "@trpc/client";
import { useSession } from "next-auth/react";

import { type ExecutionPlusGraph } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore, {
  createDraftExecution,
} from "~/stores/waggleDanceStore";
import BottomControls from "./components/BottomControls";
import ForceGraph from "./components/ForceGraph";
import { ResultsTab } from "./components/ResultsTab";
import { TaskListTab } from "./components/TaskListTab";
import useWaggleDanceMachine, {
  TaskStatus,
  type TaskState,
} from "./hooks/useWaggleDanceMachine";
import { rootPlanId } from "./initialNodes";

type Props = StackProps;
// shows the graph, agents, results, general messages and chat input
const WaggleDance = ({}: Props) => {
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
            return (aIdParts[i] ?? 0) - (bIdParts[i] ?? 0); // Wrap the subtraction in parentheses
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
          routes.goal({
            id: createdExecution.goalId,
            executionId: createdExecution?.id,
          }),
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
              "@supports not ((-webkit-backdrop-filter: blur) or (backdrop-filter: blur))":
                {
                  backgroundColor: theme.palette.background.surface, // Add opacity to the background color
                },
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
                <TaskListTab
                  sortedTaskStates={sortedTaskStates}
                  statusColor={statusColor}
                  isRunning={isRunning}
                  listItemsRef={listItemsRef}
                  taskListRef={taskListRef}
                />
              </TabPanel>

              <TabPanel
                value={1}
                className="h-fit w-full items-center overflow-y-scroll"
                sx={{ padding: { xs: 0, sm: 2 } }}
              >
                <ForceGraph data={graphData} />
              </TabPanel>

              <TabPanel value={2} className="w-full overflow-y-scroll p-4">
                <ResultsTab taskStates={taskStates} />
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
      <BottomControls
        session={session}
        isRunning={isRunning}
        selectedGoal={selectedGoal}
        dag={dag}
        handleStart={handleStart}
        handleStop={handleStop}
        setIsAutoScrollToBottom={setIsAutoScrollToBottom}
        isAutoScrollToBottom={isAutoScrollToBottom}
        shouldShowProgress={shouldShowProgress}
        progressPercent={progressPercent}
        inProgressOrDonePercent={inProgressOrDonePercent}
        progressLabel={progressLabel}
      />
    </Stack>
  );
};

export default WaggleDance;
