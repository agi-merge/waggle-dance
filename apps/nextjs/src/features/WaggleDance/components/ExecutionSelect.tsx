import * as React from "react";
import { useMemo } from "react";
import { FormControl, FormLabel } from "@mui/joy";
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
}

export const ExecutionSelect: React.FC<ExecutionSelectProps> = ({
  executions,
}) => {
  const [selectedExecution, setSelectedExecution] = React.useState<
    Execution | null | undefined
  >((executions && executions[0]) || null);
  // for each execution, create a comma concat'd name from its node names
  const names = useMemo(() => {
    return executions?.map(
      (e) =>
        `${(
          (e?.graph as unknown as DAG)?.nodes?.reduce((acc, node) => {
            if (node.id === rootPlanId) {
              return acc;
            }
            if (acc.length > 0) {
              return `${acc} ➡ ${node.name}`;
            } else {
              return `${node.name}`;
            }
          }, "") ?? ""
        ).slice(0, 50)}… `,
    );
  }, [executions]);

  const handleChange = (event: React.SyntheticEvent | null) => {
    const target = event?.target as HTMLInputElement;
    executions &&
      target &&
      setSelectedExecution(executions[target.valueAsNumber]);
  };

  const label = React.useCallback(
    (execution: Execution, i: number) => {
      const colors = {
        PENDING: "neutral",
        EXECUTING: "warning",
        DONE: "success",
        ERROR: "danger",
      } as const;
      return (
        <>
          <Box>
            <Typography>{names && names[i]}</Typography>
          </Box>
          <Box
            sx={{
              ml: "auto",
            }}
          >
            <Chip
              size="sm"
              variant="outlined"
              color={colors[execution.state]}
              sx={{
                ml: "auto",
                borderRadius: "2px",
                paddingInline: "4px",
                fontSize: "xs",
                bgcolor: `${colors[execution.state]}.softBg`,
              }}
            >
              {timeAgo(execution.updatedAt)}
            </Chip>
            <Chip
              size="sm"
              variant="outlined"
              color={colors[execution.state]}
              sx={{
                ml: "auto",
                borderRadius: "2px",
                paddingInline: "4px",
                fontSize: "xs",
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
            label={lab} // The appearance of the selected value will be a string
            sx={{
              maxWidth: "100%",
            }}
          >
            {lab}
          </Option>
        );
      }),
    [executions, label],
  );

  return (
    <FormControl>
      {(executions?.length ?? 0) > 0 && (
        <>
          <FormLabel
            id="select-execution-label"
            htmlFor="select-execution-button"
          >
            Previous Goal Executions
          </FormLabel>
          <Select
            defaultValue={selectedExecution?.id}
            onChange={handleChange}
            placeholder={<Typography>Select Past Execution</Typography>}
            slotProps={{
              button: {
                id: "select-execution-button",
                "aria-labelledby":
                  "select-execution-label select-execution-button",
              },
            }}
          >
            {options}
          </Select>
        </>
      )}
    </FormControl>
  );
};
