// ResultsTab.tsx

import { Typography } from "@mui/joy";

import { type TaskState } from "@acme/agent";

type ResultsTabProps = {
  taskStates: TaskState[];
};

export const ResultsTab = ({}: ResultsTabProps) => {
  return (
    <Typography>
      Downloadable final results and artifacts coming soon!
    </Typography>
  );
};

export default ResultsTab;
