// ResultsTab.tsx
import Box from "@mui/joy/Box";
import List from "@mui/joy/List";
import { stringify } from "yaml";

import { type TaskState } from "@acme/agent";

type ResultsTabProps = {
  taskStates: TaskState[];
};

export const ResultsTab = ({ taskStates }: ResultsTabProps) => {
  return (
    <List
      className="absolute left-0 top-0 mt-3"
      sx={{
        marginX: { xs: -2, sm: 0 },
      }}
      aria-label="Results List"
    >
      {taskStates
        .filter((t) => !!t.value)
        .map((t) => (
          <Box key={t.id}>{stringify(t.value)}</Box>
        ))}
    </List>
  );
};

export default ResultsTab;
