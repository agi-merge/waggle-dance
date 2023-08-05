import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { FormControl, FormLabel, Stack, Tooltip } from "@mui/joy";
import Box from "@mui/joy/Box";
import Chip from "@mui/joy/Chip";
import Option from "@mui/joy/Option";
import Select, { type SelectProps } from "@mui/joy/Select";
import Typography from "@mui/joy/Typography";

import { type Execution } from "@acme/db";

import type DAG from "../DAG";
import timeAgo from "../utils/timeAgo";
import { rootPlanId } from "../WaggleDanceMachine";

interface ExecutionSelectProps extends SelectProps<Execution> {
  executions: Execution[] | undefined;
  showDisabled?: boolean | undefined;
}

export const ExecutionSelect: React.FC<ExecutionSelectProps> = ({
  executions,
  showDisabled,
}) => {
  const [selectedExecution, setSelectedExecution] = useState<
    Execution | null | undefined
  >((executions && executions[0]) || null);

  const names = useMemo(() => {
    return executions?.map((e) => {
      // Cast the graph to DAG and get the nodes
      const nodes = (e?.graph as unknown as DAG)?.nodes || [];

      // Use reduce to build the names string
      return nodes.reduce((acc, node) => {
        // Skip the root node
        if (node.id === rootPlanId) {
          return acc;
        }

        // If acc is not empty, append the arrow and node name
        // Otherwise, just return the node name
        return acc ? `${acc} ⇨ ${node.name}` : node.name;
      }, "");
    });
  }, [executions]);

  const handleChange = (event: React.SyntheticEvent | null) => {
    const target = event?.target as HTMLInputElement;
    executions &&
      target &&
      setSelectedExecution(executions[target.valueAsNumber]);
  };

  const label = useCallback(
    (execution: Execution, i: number) => {
      const colors = {
        PENDING: "neutral",
        EXECUTING: "warning",
        DONE: "success",
        ERROR: "danger",
      } as const;
      return (
        <>
          <Tooltip
            key={execution.id}
            title={names && names[i]}
            enterDelay={500}
            enterNextDelay={500}
            followCursor={true}
          >
            <Typography noWrap>{names && names[i]}</Typography>
          </Tooltip>
          <Box sx={{ ml: "auto", minWidth: "fit-content" }}>
            <Chip
              size="sm"
              variant="solid"
              color="neutral"
              sx={{ borderRadius: "2px", fontSize: "sm" }}
            >
              {timeAgo(execution.updatedAt)}
            </Chip>
            <Chip
              size="sm"
              variant="outlined"
              color={colors[execution.state]}
              sx={{
                borderRadius: "2px",
                fontSize: "sm",
                bgcolor: `${colors[execution.state]}.softBg`,
              }}
            >
              {execution.state}
            </Chip>
          </Box>
        </>
      );
    },
    [names],
  );

  const options = useMemo(
    () =>
      executions?.map((execution, i) => {
        const lab = label(execution, i);
        return (
          <Option key={execution.id} value={execution.id} label={lab}>
            {lab}
          </Option>
        );
      }),
    [executions, label],
  );

  return (
    <>
      {showDisabled && (
        <FormControl>
          <Stack direction={"row"}>
            <FormLabel
              sx={{
                fontSize: "xs",
                maxWidth: "4rem",
              }}
              id="select-execution-label"
              htmlFor="select-execution-button"
            >
              Previous Waggles
            </FormLabel>
            <Select
              disabled={(executions?.length ?? 0) === 0}
              defaultValue={selectedExecution?.id}
              onChange={handleChange}
              placeholder={<Typography>Select Waggle</Typography>}
              slotProps={{
                button: {
                  id: "select-execution-button",
                  "aria-labelledby":
                    "select-execution-label select-execution-button",
                },
                listbox: {
                  sx: {
                    maxHeight: 240,
                    minWidth: "100%",
                    maxWidth: "100%",
                    overflow: "auto",
                  },
                },
              }}
            >
              {options}
            </Select>
          </Stack>
        </FormControl>
      )}
    </>
  );
};
