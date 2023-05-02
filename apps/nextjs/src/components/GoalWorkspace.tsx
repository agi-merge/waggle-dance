import { Stack } from "@mui/joy";

import ChainGraph from "../ChainGraph/components/ChainGraph";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}
const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  return (
    <Stack>
      <ChainGraph />
    </Stack>
  );
};

export default GoalWorkspace;
