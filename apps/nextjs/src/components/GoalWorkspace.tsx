import { useMemo, useState } from "react";
import { Button, Stack } from "@mui/joy";

import {
  SimulatedChainMachine,
  useChainMachine,
  useDAGSimulation,
} from "~/hooks/useChainMachine";
import ForceTree from "./ForceTree";
import TaskGraph, { Task } from "./TaskGraph";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}
const rootTask: Task = {
  name: "plan",
  execute: async () => {
    // Replace this with your actual root task logic
    // await new Promise((resolve) =>
    //   setTimeout(() => resolve("Root task results"), 1000),
    // );
    console.log("Root task executed");
    return "fart";
  },
};
const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  // const { dag, graphData, execute } = useDAGSimulation();

  // This will execute the DAG simulation and update the component
  // const handleSimulationStep = async () => {
  //   await execute();
  // };

  // const dagMemo = useMemo(() => {
  //   return dag;
  // }, [dag]);

  return (
    <Stack>
      <TaskGraph rootTask={rootTask} />
      {/* <Button onClick={handleSimulationStep}>Simulate next step</Button>
      <div>{JSON.stringify(dagMemo)}</div>
      <ForceTree data={graphData} /> */}
    </Stack>
  );
};

export default GoalWorkspace;
