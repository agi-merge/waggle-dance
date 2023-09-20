import { TabPanel } from "@mui/joy";

import ForceGraph, { type GraphData } from "./ForceGraph";

type GraphTabPanelProps = {
  data: GraphData;
};

const GraphTabPanel = ({ data }: GraphTabPanelProps) => {
  return (
    <TabPanel
      value={1}
      className="h-fit w-full items-center overflow-y-scroll"
      sx={{ padding: { xs: 0, sm: 2 } }}
    >
      <ForceGraph data={data} />
    </TabPanel>
  );
};

export default GraphTabPanel;
