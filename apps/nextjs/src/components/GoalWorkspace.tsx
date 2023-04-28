import { useMachine } from "react-robot";

import { api, type RouterOutputs } from "~/utils/api";

interface GoalWorkspaceProps {
  goal: RouterOutputs["goal"]["all"][number];
  onDelete?: () => void;
}

const GoalWorkspace = ({ goal, onDelete }: GoalWorkspaceProps) => {
  return (
    <div className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]">
      <div className="flex-grow">
        <h2 className="text-2xl font-bold text-pink-400">{goal.title}</h2>
        <p className="mt-2 text-sm">{goal.content}</p>
      </div>
      <div>
        <span
          className="cursor-pointer text-sm font-bold uppercase text-pink-400"
          onClick={onDelete}
        >
          Delete
        </span>
      </div>
    </div>
  );
};

export default GoalWorkspace;
