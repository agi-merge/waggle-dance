import React from "react";
import { Button, Stack, Typography } from "@mui/joy";

import useWaggleDanceMachine from "../hooks/useWaggleDanceMachine";
import ForceGraph from "./ForceGraph";

const ChainGraphSimulation = () => {
  const { chainMachine, graphData, run } = useWaggleDanceMachine({
    goal: "some simulated goal",
    isSimulated: true,
  });

  return (
    <Stack>
      <Button onClick={run}>Run Simulation</Button>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default ChainGraphSimulation;
