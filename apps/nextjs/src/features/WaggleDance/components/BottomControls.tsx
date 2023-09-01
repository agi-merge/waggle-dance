import React from "react";
import {
  Box,
  Card,
  Checkbox,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/joy";

import { type Session } from "@acme/auth";
import { type GoalPlusExe } from "@acme/db";

import routes from "~/utils/routes";
import GoalSettings from "~/features/GoalMenu/components/GoalSettings";
import type DAG from "../DAG";
import { ExecutionSelect } from "./ExecutionSelect";
import { StartStopButton } from "./StartStopButton";
import { TaskProgress } from "./TaskProgress";

interface BottomControlsProps {
  session: Session | null;
  isRunning: boolean;
  selectedGoal: GoalPlusExe | undefined;
  dag: DAG;
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
  dag,
  handleStart,
  handleStop,
  setIsAutoScrollToBottom,
  isAutoScrollToBottom,
  shouldShowProgress,
  progressPercent,
  inProgressOrDonePercent,
  progressLabel,
}) => {
  return (
    <Box
      className="z-100 sticky "
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
              className="items-center justify-end text-center align-top"
              component={Stack}
              gap={0.5}
            >
              {!session && (
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
            <StartStopButton
              isRunning={isRunning}
              handleStart={handleStart}
              handleStop={handleStop}
              dag={dag}
            />
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};

export default BottomControls;
