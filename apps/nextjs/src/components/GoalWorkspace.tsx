import { Card, Typography } from "@mui/joy";

import ChainGraphSimulation from "../ChainGraph/components/ChainGraphSimulation";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}
const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  return (
    <Card>
      <Typography level="display2">Goal: {goal}</Typography>
      <ChainGraphSimulation />
    </Card>
  );
};

export default GoalWorkspace;
