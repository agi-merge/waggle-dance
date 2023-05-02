import { Stack } from "@mui/joy";

import ChainGraphSimulation from "../ChainGraph/components/ChainGraphSimulation";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}
const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  return (
    <Stack>
      <ChainGraphSimulation />
    </Stack>
  );
};

export default GoalWorkspace;
