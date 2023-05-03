import React from "react";
import { Button, Stack, Typography } from "@mui/joy";

import { useAppContext } from "~/pages/_app";
import useChainMachine from "../hooks/useChainMachine";
import ForceGraph from "./ForceGraph";

interface ChainGraphSimulationProps {
  goal: string;
}
const ChainGraphSimulation = ({ goal }: ChainGraphSimulationProps) => {
  const { goal: goal2 } = useAppContext();
  const { graphData, run } = useChainMachine({ goal });
  const [isRunning, setIsRunning] = React.useState(false);
  const handleStart = () => {
    setIsRunning(true);
    run();
  };
  return (
    <Stack>
      <Button
        disabled={!goal && !goal2}
        loading={isRunning}
        onClick={handleStart}
      >
        Run
      </Button>
      <Typography>Tasks: {}</Typography>
      {graphData.links.length > 0 && <ForceGraph data={graphData} />}
    </Stack>
  );
};

export default ChainGraphSimulation;
