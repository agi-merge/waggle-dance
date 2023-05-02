import React from "react";
import { Button, Stack, Typography } from "@mui/joy";

import useChainMachine from "../hooks/useChainMachine";
import ForceGraph from "./ForceGraph";

const ChainGraphSimulation = () => {
  const { chainMachine, graphData, run } = useChainMachine();

  return (
    <Stack>
      <Button onClick={run}>Run Simulation</Button>
      <Typography>{JSON.stringify(chainMachine)}</Typography>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default ChainGraphSimulation;
