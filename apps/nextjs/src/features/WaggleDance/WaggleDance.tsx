import assert from "assert";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import router from "next/router";
import { BugReport, Lan, ListAlt, Science } from "@mui/icons-material";
import {
  Card,
  Link,
  Skeleton,
  type AlertPropsColorOverrides,
  type ColorPaletteProp,
} from "@mui/joy";
import Box from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import Stack, { type StackProps } from "@mui/joy/Stack";
import Tab from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";
import { type OverridableStringUnion } from "@mui/types";
import { TRPCClientError } from "@trpc/client";
import { useSession } from "next-auth/react";

import { TaskStatus, type TaskState } from "@acme/agent";
import { type ExecutionPlusGraph } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore, {
  createDraftExecution,
} from "~/stores/waggleDanceStore";
import useWaggleDanceMachine from "./hooks/useWaggleDanceMachine";

const BottomControls = lazy(() => import("./components/BottomControls"));

const TaskTabPanel = lazy(() => import("./components/TaskTabPanel"));
const GraphTabPanel = lazy(() => import("./components/GraphTabPanel"));
const ResultsTabPanel = lazy(() => import("./components/ResultsTabPanel"));
const LogsTabPanel = lazy(() => import("./components/LogsTabPanel"));

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
    results,
    agentPacketsMap,
    sortedTaskStates,
  } = useWaggleDanceMachine();
  const listItemsRef = useRef<HTMLLIElement[]>([]);
  const taskListRef = useRef<HTMLUListElement>(null);
  const [recentTaskId, setRecentTaskId] = useState<string | null>(null);
  const { data: session } = useSession();
  const { setIsPageLoading, isAutoScrollToBottom, setIsAutoScrollToBottom } =
    useApp();
  const agentPackets = useMemo(
    () => Object.values(agentPacketsMap),
    [agentPacketsMap],
  );

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

  useEffect(() => {
    if (!isAutoScrollToBottom) {
      return;
    }

    // Find the task with the most recent update
    const recentTask = results.reduce(
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
  }, [results, isAutoScrollToBottom, recentTaskId, sortedTaskStates]);

  const statusColor = (
    n: TaskState,
  ): OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides> => {
    switch (n.status) {
      case TaskStatus.done:
        return "success";
      case TaskStatus.error:
        return "danger";
      case TaskStatus.idle:
      case TaskStatus.wait:
        return "neutral";
      case TaskStatus.starting:
      case TaskStatus.working:
        return "primary";
    }
  };

  const progressPercent = useMemo(() => {
    return (results.length / agentPackets.length) * 100;
  }, [results.length, agentPackets.length]);

  const notIdleTasks = useMemo(() => {
    return agentPackets.filter((s) => s.status !== TaskStatus.idle).length;
  }, [agentPackets]);

  const inProgressOrDonePercent = useMemo(() => {
    return (notIdleTasks / agentPackets.length) * 100;
  }, [notIdleTasks, agentPackets.length]);

  const inProgress = useMemo(() => {
    return agentPackets.filter(
      (s) =>
        s.status === TaskStatus.starting ||
        s.status === TaskStatus.working ||
        s.status === TaskStatus.wait,
    ).length;
  }, [agentPackets]);

  const progressLabel = useMemo(() => {
    return `# Tasks in progress: ${inProgress}, done: ${
      results.length
    }, scheduled: ${agentPackets.length - notIdleTasks}, total: ${
      agentPackets.length
    }`;
  }, [inProgress, notIdleTasks, results.length, agentPackets.length]);

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

          {agentPackets.length > 0 ? (
            <>
              <Suspense
                fallback={
                  <Skeleton
                    variant="text"
                    width="100%"
                    height={160}
                    animation="wave"
                  />
                }
              >
                <TaskTabPanel
                  nodes={dag.nodes}
                  sortedTaskStates={sortedTaskStates}
                  statusColor={statusColor}
                  isRunning={isRunning}
                  listItemsRef={listItemsRef}
                  taskListRef={taskListRef}
                />
              </Suspense>

              <Suspense
                fallback={
                  <Skeleton
                    variant="text"
                    width="100%"
                    height={160}
                    animation="wave"
                  />
                }
              >
                <GraphTabPanel data={graphData} />
              </Suspense>

              <Suspense
                fallback={
                  <Skeleton
                    variant="text"
                    width="100%"
                    height={160}
                    animation="wave"
                  />
                }
              >
                <ResultsTabPanel taskStates={sortedTaskStates} />
              </Suspense>

              <Suspense
                fallback={
                  <Skeleton
                    variant="text"
                    width="100%"
                    height={160}
                    animation="wave"
                  />
                }
              >
                <LogsTabPanel logs={logs} />
              </Suspense>
            </>
          ) : (
            <Card>
              <Skeleton variant="rectangular" height="10rem" width="100%" />
            </Card>
          )}
        </Tabs>
      )}
      <Suspense
        fallback={
          <Skeleton variant="text" width="100%" height={160} animation="wave" />
        }
      >
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
      </Suspense>
    </Stack>
  );
};

export default WaggleDance;
