import { TabPanel } from "@mui/joy";
import type { GraphData } from "react-force-graph-2d";

import PlanForceGraph from "./PlanForceGraph";

interface GraphTabPanelProps {
  data: GraphData;
}

// const NoSSRForceGraph = dynamic(() => import("react-force-graph-2d"), {
//   ssr: false,
// });

const GraphTabPanel = ({ data }: GraphTabPanelProps) => {
  return (
    <TabPanel
      value={1}
      className="h-fit w-full items-center overflow-y-scroll"
      sx={{ padding: { xs: 0, sm: 2 } }}
    >
      <PlanForceGraph graphData={data} />
      {/* <NoSSRForceGraph graphData={data} /> */}
    </TabPanel>
  );
};

export default GraphTabPanel;
