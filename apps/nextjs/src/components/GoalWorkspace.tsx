import { useMachine } from "react-robot";

import { api, type RouterOutputs } from "~/utils/api";
import ChainMachine from "./ChainMachine";
import ChainTaskDAG from "./ChainTaskDAG";
import DemoChainMachine from "./DemoChainMachine";
import Simulation from "./Simulation";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}

const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  return (
    <div className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]">
      <ChainTaskDAG onStopSimulation={() => {}} />
    </div>
  );
};

export default GoalWorkspace;
