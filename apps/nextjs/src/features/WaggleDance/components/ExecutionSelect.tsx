import * as React from "react";
import { useMemo } from "react";
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
  executions: Execution[];
}

export const ExecutionSelect: React.FC<ExecutionSelectProps> = ({
  executions,
}) => {
  const [selectedExecution, setSelectedExecution] = React.useState(
    executions[0],
  );

  // for each execution, create a comma concat'd name from its node names
  const names = useMemo(() => {
    return executions.map(
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
        ).slice(0, 50)}…`,
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
        EXECUTING: "info",
        DONE: "success",
        ERROR: "danger",
      } as const;
      return (
        <>
          <Box>
            <Typography>{names[i]}</Typography>
            <Typography startDecorator={<Typography>Created</Typography>}>
              {timeAgo(execution.createdAt)}
            </Typography>
            <Typography startDecorator={<Typography>Updated</Typography>}>
              {timeAgo(execution.updatedAt)}
            </Typography>
          </Box>
          <Chip
            size="sm"
            variant="outlined"
            color={colors[execution.state]}
            sx={{
              ml: "auto",
              borderRadius: "2px",
              minHeight: "20px",
              paddingInline: "4px",
              fontSize: "xs",
              bgcolor: `${colors[execution.state]}.softBg`,
            }}
          >
            {execution.state}
          </Chip>
        </>
      );
    },
    [names],
  );

  const options = useMemo(
    () =>
      executions.map((execution, i) => {
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
    <Select defaultValue={selectedExecution?.id} onChange={handleChange}>
      {options}
    </Select>
  );
};
