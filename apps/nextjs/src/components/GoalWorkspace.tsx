import { useMachine } from "react-robot";

import { api, type RouterOutputs } from "~/utils/api";
import ChainMachine from "./ChainMachine";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}

const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  return (
    <div className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]">
      <ChainMachine initialPlan={"plan"} />
    </div>
  );
};

export default GoalWorkspace;
