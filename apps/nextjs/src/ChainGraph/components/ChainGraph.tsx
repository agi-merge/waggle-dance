import React from "react";
import { Button, Stack, Typography } from "@mui/joy";

import useChainMachine from "../hooks/useChainMachine";
import ForceGraph from "./ForceGraph";

interface ChainGraphSimulationProps {
  goal: string;
}
const ChainGraphSimulation = ({ goal }: ChainGraphSimulationProps) => {
  const { graphData, run } = useChainMachine({ goal });
  const [isRunning, setIsRunning] = React.useState(false);
  const handleStart = () => {
    setIsRunning(true);
    run();
  };
  return (
    <Stack>
      <Button loading={isRunning} onClick={handleStart}>
        Run
      </Button>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default ChainGraphSimulation;
