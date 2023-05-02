import React from "react";
import { Button, Stack, Typography } from "@mui/joy";

import useTaskSimulation from "../hooks/useTaskSimulation";
import ForceGraph from "./ForceGraph";

const ChainGraphSimulation = () => {
  const { simulation, graphData, runSimulation } = useTaskSimulation();

  return (
    <Stack>
      <Button onClick={runSimulation}>Run Simulation</Button>
      <Typography>{JSON.stringify(simulation)}</Typography>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default ChainGraphSimulation;
