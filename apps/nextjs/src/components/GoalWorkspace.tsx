import { useMachine } from "react-robot";

import { api, type RouterOutputs } from "~/utils/api";
import AgentSwarm from "./AgentSwarm";
import ChainMachine from "./ChainMachine";
import DemoChainMachine from "./DemoChainMachine";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}

const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  return (
    <div className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]">
      <AgentSwarm />
    </div>
  );
};

export default GoalWorkspace;
