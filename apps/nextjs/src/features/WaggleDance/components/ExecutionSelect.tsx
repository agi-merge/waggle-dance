import * as React from "react";
import { useCallback, useMemo } from "react";
import NextLink from "next/link";
import { ClickAwayListener } from "@mui/base";
import Box, { type BoxProps } from "@mui/joy/Box";
import Chip from "@mui/joy/Chip";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";

import { type ExecutionPlusGraph } from "@acme/db";

import routes from "~/utils/routes";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import type DAG from "../types/DAG";
import { rootPlanId } from "../types/initialNodes";
import timeAgo from "../utils/timeAgo";

type ExecutionSelectProps = BoxProps & {
  goalId: string;
  executions: ExecutionPlusGraph[] | undefined;
  showDisabled?: boolean | undefined;
};

export const ExecutionSelect = ({
  goalId,
  executions,
  showDisabled,
  ...props
}: ExecutionSelectProps) => {
  const { execution } = useWaggleDanceMachineStore();
  const [_isOpen, setIsOpen] = React.useState(false);
  const [_anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const names = useMemo(() => {
    return executions?.map((e) => {
      // Cast the graph unsafely to DAG and get the nodes
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
    (execution: ExecutionPlusGraph, i: number) => {
      const colors = {
        PENDING: "neutral",
        EXECUTING: "warning",
        DONE: "success",
        ERROR: "danger",
      } as const;
      return (
        <>
          <Box
            className="flex flex-shrink content-center items-center text-left"
            sx={{ overflowX: "clip", maxWidth: "50vw" }}
          >
            {names?.length && names[i] && (
              <Tooltip
                title={names && names[i]}
                enterDelay={500}
                enterNextDelay={500}
                followCursor={true}
              >
                <Typography
                  level="body-md"
                  fontSize="sm"
                  noWrap
                  sx={{
                    textOverflow: "ellipsis",
                    overflowWrap: "break-word",
                  }}
                >
                  {names[i]}
                </Typography>
              </Tooltip>
            )}

            <Typography
              level="body-xs"
              fontFamily={names?.length && names[i] ? undefined : "monospace"}
              sx={{
                textOverflow: "ellipsis",
                overflowWrap: "break-word",
              }}
            >
              <Typography>
                {executions &&
                  executions[i] &&
                  `id:${executions[i]!.id.slice(-4)}`}
              </Typography>
            </Typography>
          </Box>
          <Box
            sx={{ ml: "auto", minWidth: "fit-content" }}
            component={Stack}
            direction="row"
          >
            <Chip
              size="sm"
              variant="solid"
              color="neutral"
              sx={{
                borderRadius: "2px",
                fontSize: { xs: "6pt", sm: "sm" },
                paddingX: { xs: "0.1rem", sm: "0.25rem" },
              }}
            >
              {timeAgo(execution.updatedAt)}
            </Chip>
            <Chip
              size="sm"
              variant="outlined"
              color={colors[execution.state]}
              sx={{
                borderRadius: "2px",
                fontSize: { xs: "6pt", sm: "sm" },
                bgcolor: `${colors[execution.state]}.softBg`,
                paddingX: { xs: "0.1rem", sm: "0.25rem" },
              }}
            >
              {execution.state}
            </Chip>
          </Box>
        </>
      );
    },
    [executions, names],
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
            href={routes.goal({ id: goalId, executionId: execution?.id })}
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
                  <Typography
                    level="body-xs"
                    className=" items-end text-center"
                  >
                    Previous Waggles
                  </Typography>
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
                        maxWidth: "100%",
                        overflow: "auto",
                      },
                    },
                  }}
                  className="max-w-md flex-grow"
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
