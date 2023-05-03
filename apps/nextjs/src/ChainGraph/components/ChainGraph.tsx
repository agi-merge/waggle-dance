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
      {graphData.links.length > 0 && (
        <>
          <ForceGraph data={graphData} />
          {graphData.links.length > 2 && (
            <Typography className="text-center" color="warning" level="body5">
              Demo is currently limited to the first set of tasks
            </Typography>
          )}
        </>
      )}
      <Typography>
        Tasks:{" "}
        <Typography level="body5">
          {graphData.nodes.map((n) => (
            <div>{n.id}</div>
          ))}
        </Typography>
      </Typography>
    </Stack>
  );
};

export default ChainGraphSimulation;
