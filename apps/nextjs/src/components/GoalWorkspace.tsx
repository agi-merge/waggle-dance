import { useMemo, useState } from "react";
import { Button, Stack } from "@mui/joy";

import {
  SimulatedChainMachine,
  useChainMachine,
  useDAGSimulation,
} from "~/hooks/useChainMachine";
import ForceTree from "./ForceTree";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}

const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  const { dag, graphData, execute } = useDAGSimulation();

  // This will execute the DAG simulation and update the component
  const handleSimulationStep = async () => {
    await execute();
  };

  const dagMemo = useMemo(() => {
    return dag;
  }, [dag]);

  return (
    <Stack>
      <Button onClick={handleSimulationStep}>Simulate next step</Button>
      <div>{JSON.stringify(dagMemo)}</div>
      <ForceTree data={graphData} />
    </Stack>
  );
};

export default GoalWorkspace;
