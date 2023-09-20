import { TabPanel } from "@mui/joy";

import { type TaskState } from "@acme/agent";

import ResultsTab from "./ResultsTab";

type ResultsTabPanelProps = {
  taskStates: TaskState[];
};

const ResultsTabPanel = ({ taskStates }: ResultsTabPanelProps) => {
  return (
    <TabPanel value={2} className="w-full overflow-y-scroll p-4">
      <ResultsTab taskStates={taskStates} />
    </TabPanel>
  );
};
export default ResultsTabPanel;
