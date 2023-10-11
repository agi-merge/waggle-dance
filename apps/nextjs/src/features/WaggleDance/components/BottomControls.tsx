import React from "react";
import { Box, Card, Divider, Link, Stack, Typography } from "@mui/joy";

import { type Session } from "@acme/auth";
import { type DraftExecutionGraph, type GoalPlusExe } from "@acme/db";

import routes from "~/utils/routes";
import AgentSettingsToggleButton from "~/features/AgentSettings/components/AgentSettingsToggleButton";
import { ExecutionSelect } from "./ExecutionSelect";
import { StartStopButton } from "./StartStopButton";
import { TaskProgress } from "./TaskProgress";

interface BottomControlsProps {
  session: Session | null;
  isRunning: boolean;
  selectedGoal: GoalPlusExe | undefined;
  graph: DraftExecutionGraph;
  handleStart: () => void;
  handleStop: () => void;
  setIsAutoScrollToBottom: (value: boolean) => void;
  isAutoScrollToBottom: boolean;
  shouldShowProgress: boolean;
  progressPercent: number;
  inProgressOrDonePercent: number;
  progressLabel: string;
}

const BottomControls: React.FC<BottomControlsProps> = ({
  session,
  isRunning,
  selectedGoal,
  graph,
  handleStart,
  handleStop,
  shouldShowProgress,
  progressPercent,
  inProgressOrDonePercent,
  progressLabel,
}) => {
  return (
    <Box
      className="sticky z-10"
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
          "@supports not ((-webkit-backdrop-filter: blur) or (backdrop-filter: blur))":
            {
              backgroundColor: theme.palette.background.surface, // Add opacity to the background color
            },
          borderRadius: 0,
          overflowX: "clip",
          marginX: "calc(-1 * var(--variant-borderWidth, 0px))",
          marginBottom: "calc(-10 * var(--variant-borderWidth, 0px))",
          paddingTop: shouldShowProgress ? 0 : "var(--Card-padding, 0px)",
        })}
      >
        {shouldShowProgress && (
          <TaskProgress
            progressPercent={progressPercent}
            inProgressOrDonePercent={inProgressOrDonePercent}
            progressLabel={progressLabel}
          />
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
              className="items-center justify-end text-center align-middle"
              component={Stack}
              gap={0.5}
            >
              {!session && isRunning && (
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

              <AgentSettingsToggleButton />
            </Box>
            <StartStopButton
              isRunning={isRunning}
              handleStart={handleStart}
              handleStop={handleStop}
              dag={graph}
            />
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};

export default BottomControls;
