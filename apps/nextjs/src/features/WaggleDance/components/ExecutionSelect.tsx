import * as React from "react";
import { useCallback, useMemo } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { ClickAwayListener } from "@mui/base";
import { FormControl, FormLabel, Stack, Tooltip } from "@mui/joy";
import Box, { type BoxProps } from "@mui/joy/Box";
import Chip from "@mui/joy/Chip";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Typography from "@mui/joy/Typography";

import { type Execution } from "@acme/db";

import routes from "~/utils/routes";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import type DAG from "../DAG";
import timeAgo from "../utils/timeAgo";
import { rootPlanId } from "../WaggleDanceMachine";

type ExecutionSelectProps = BoxProps & {
  goalId: string;
  executions: Execution[] | undefined;
  showDisabled?: boolean | undefined;
};

export const ExecutionSelect = ({
  goalId,
  executions,
  showDisabled,
  ...props
}: ExecutionSelectProps) => {
  const router = useRouter();
  const { execution, setExecution } = useWaggleDanceMachineStore();
  const [_isOpen, setIsOpen] = React.useState(false);
  const [_anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
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

  const handleClose = () => {
    setAnchorEl(null);
    setIsOpen(false);
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
            <Typography
              sx={{ textOverflow: "ellipsis", overflowWrap: "break-word" }}
            >
              {names && names[i]}
            </Typography>
          </Tooltip>
          <Box
            sx={{ ml: "auto", minWidth: "fit-content" }}
            component={Stack}
            direction={{ xs: "column", sm: "row" }}
          >
            <Chip
              size="sm"
              variant="solid"
              color="neutral"
              sx={{ borderRadius: "2px", fontSize: { xs: "xs", sm: "sm" } }}
            >
              {timeAgo(execution.updatedAt)}
            </Chip>
            <Chip
              size="sm"
              variant="outlined"
              color={colors[execution.state]}
              sx={{
                borderRadius: "2px",
                fontSize: { xs: "xs", sm: "sm" },
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
          <Option
            key={execution.id}
            value={execution.id}
            label={lab}
            component={NextLink}
            href={routes.goal(goalId, execution?.id)}
          >
            {lab}
          </Option>
        );
      }),
    [executions, goalId, label],
  );

  return (
    <Box {...props}>
      {showDisabled ||
        ((executions?.length ?? 0) > 0 && (
          <FormControl>
            <ClickAwayListener onClickAway={handleClose}>
              <Stack direction="row">
                <FormLabel
                  sx={{
                    fontSize: "xs",
                    maxWidth: "4rem",
                  }}
                  id="select-execution-label"
                  htmlFor="select-execution-button"
                >
                  <Typography level="body-xs">Previous Waggles</Typography>
                </FormLabel>

                <Select
                  disabled={(executions?.length ?? 0) === 0}
                  defaultValue={execution?.id}
                  value={execution?.id}
                  placeholder={<Typography>Select Waggle</Typography>}
                  slotProps={{
                    button: {
                      id: "select-execution-button",
                      "aria-labelledby":
                        "select-execution-label select-execution-button",
                    },
                    listbox: {
                      sx: {
                        maxHeight: "50vdh",
                        maxWidth: "100%",
                        overflow: "auto",
                      },
                    },
                  }}
                >
                  {options}
                </Select>
              </Stack>
            </ClickAwayListener>
          </FormControl>
        ))}
    </Box>
  );
};
