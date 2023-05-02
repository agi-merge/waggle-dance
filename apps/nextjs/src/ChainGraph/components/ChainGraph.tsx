import React from "react";
import { Button, Stack, Typography } from "@mui/joy";

import useTaskSimulation from "../hooks/useTaskSimulation";
import { GraphData } from "../types";
import ForceGraph from "./ForceGraph";

const ChainGraph = () => {
  const { simulation, graphData, runSimulation } = useTaskSimulation();

  return (
    <Stack>
      <Button onClick={runSimulation}>Run Simulation</Button>
      <Typography>{JSON.stringify(simulation)}</Typography>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default ChainGraph;
