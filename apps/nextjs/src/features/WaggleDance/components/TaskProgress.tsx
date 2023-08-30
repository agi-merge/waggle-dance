// TaskProgress.tsx
import React from "react";
import { Box, LinearProgress, Tooltip, Typography } from "@mui/joy";

interface TaskProgressProps {
  progressPercent: number;
  inProgressOrDonePercent: number;
  progressLabel: string;
}

export const TaskProgress: React.FC<TaskProgressProps> = ({
  progressPercent,
  inProgressOrDonePercent,
  progressLabel,
}) => {
  return (
    <Tooltip title={progressLabel}>
      <Box
        sx={{
          paddingBottom: "var(--Card-padding, 0px)",
          position: "relative",
          zIndex: 0,
          marginX: "calc(-1.5 * var(--Card-padding, 0px))",
        }}
      >
        <LinearProgress
          sx={{
            position: "absolute",
            top: 0,
            width: "100%",
            "--LinearProgress-progressRadius": 0,
          }}
          determinate={true}
          value={progressPercent}
          color="neutral"
          thickness={20}
        >
          {
            <Typography
              level="body-xs"
              fontWeight="xl"
              sx={{ mixBlendMode: "difference" }}
            >
              {progressLabel}
            </Typography>
          }
        </LinearProgress>

        <LinearProgress
          sx={{
            position: "absolute",
            opacity: 0.5,
            top: 0,
            width: "100%",
            "--LinearProgress-progressRadius": 0,
          }}
          determinate={true}
          value={inProgressOrDonePercent}
          color="neutral"
          thickness={20}
          variant="soft"
        ></LinearProgress>
      </Box>
    </Tooltip>
  );
};
