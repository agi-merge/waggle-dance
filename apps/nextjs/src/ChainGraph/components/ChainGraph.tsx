import React from "react";
import { Button, Stack, Typography } from "@mui/joy";

import useChainMachine from "../hooks/useChainMachine";
import ForceGraph from "./ForceGraph";

interface ChainGraphSimulationProps {
  goal: string;
}
const ChainGraphSimulation = ({ goal }: ChainGraphSimulationProps) => {
  const { chainMachine, graphData, run } = useChainMachine();

  return (
    <Stack>
      <Button onClick={run}>Run</Button>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default ChainGraphSimulation;
