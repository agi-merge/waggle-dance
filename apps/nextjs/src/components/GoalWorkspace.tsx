import { useMachine } from "react-robot";

import { api, type RouterOutputs } from "~/utils/api";
import { useSimulation } from "~/hooks/useSimulation";
import ChainMachine from "./ChainMachine";
import ChainTaskDAG from "./ChainTaskDAG";
import DemoChainMachine from "./DemoChainMachine";
import ForceTree from "./ForceTree";
import Simulation from "./Simulation";

interface GoalWorkspaceProps {
  goal: string;
  onDelete?: () => void;
}

const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  const data = useSimulation();
  return (
    <div className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]">
      {/* <ChainMachine /> */}
      <ForceTree data={data} />
    </div>
  );
};

export default GoalWorkspace;
