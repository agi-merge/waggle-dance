import React from "react";
import { Button, Stack } from "@mui/joy";

import useWaggleDanceMachine from "../hooks/useWaggleDanceMachine";
import ForceGraph from "./ForceGraph";

const WaggleDanceSimulation = () => {
  const { graphData, run } = useWaggleDanceMachine({
    goal: "some simulated goal",
    isSimulated: true,
  });

  return (
    <Stack>
      <Button onClick={() => void run()}>Run Simulation</Button>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default WaggleDanceSimulation;
