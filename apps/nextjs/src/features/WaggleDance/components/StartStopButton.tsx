// StartStopButton.tsx
import React from "react";
import { PlayCircle, StopCircle } from "@mui/icons-material";
import { Button, CircularProgress, Stack, Typography } from "@mui/joy";

import type { DraftExecutionGraph } from "@acme/db";

interface StartStopButtonProps {
  isRunning: boolean;
  handleStart: () => void;
  handleStop: () => void;
  dag: DraftExecutionGraph;
}

export const StartStopButton: React.FC<StartStopButtonProps> = ({
  isRunning,
  handleStart,
  handleStop,
  dag,
}) => {
  return (
    <Button
      size="lg"
      className="col-end"
      color="primary"
      variant="soft"
      onClick={isRunning ? handleStop : handleStart}
      endDecorator={isRunning ? <StopCircle /> : <PlayCircle />}
      sx={{
        zIndex: 15,
        paddingX: { xs: 1, sm: 2 },
        minHeight: { xs: 2, sm: 3 },
      }}
    >
      {isRunning && (
        <CircularProgress size="sm" variant="soft" sx={{ marginRight: 1 }} />
      )}
      <Stack
        direction={{ xs: "row", sm: "column" }}
        gap="0.5rem"
        className="items-center"
      >
        <Typography level="h4">
          {isRunning ? (
            <>Stop</>
          ) : (
            <>{dag.nodes.length > 1 ? "Restart" : "Start"}</>
          )}
        </Typography>
      </Stack>
    </Button>
  );
};
