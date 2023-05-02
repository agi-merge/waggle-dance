import { Stack } from "@mui/joy";

import ChainGraph from "./ChainGraph";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}
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
      <ChainGraph />
      {/* <TaskGraph rootTask={rootTask} /> */}
      {/* <Button onClick={handleSimulationStep}>Simulate next step</Button>
      <div>{JSON.stringify(dagMemo)}</div>
      <ForceTree data={graphData} /> */}
    </Stack>
  );
};

export default GoalWorkspace;
