import {
  TabPanel,
  type AlertPropsColorOverrides,
  type ColorPaletteProp,
} from "@mui/joy";
import { type OverridableStringUnion } from "@mui/types";

import { type TaskState } from "@acme/agent";
import { type DraftExecutionEdge, type DraftExecutionNode } from "@acme/db";

import TaskListTab from "./TaskListTab";

type TaskTabPanelProps = {
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
  sortedTaskStates: TaskState[];
  statusColor: (
    n: TaskState,
  ) => OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
  isRunning: boolean;
  listItemsRef: React.MutableRefObject<HTMLLIElement[]>;
  taskListRef: React.RefObject<HTMLUListElement>;
};

const TaskTabPanel = ({
  nodes,
  edges,
  sortedTaskStates,
  statusColor,
  isRunning,
  listItemsRef,
  taskListRef,
}: TaskTabPanelProps) => {
  return (
    <TabPanel value={0} className="w-full overflow-y-scroll">
      <TaskListTab
        nodes={nodes}
        edges={edges}
        sortedTaskStates={sortedTaskStates}
        statusColor={statusColor}
        isRunning={isRunning}
        listItemsRef={listItemsRef}
        taskListRef={taskListRef}
      />
    </TabPanel>
  );
};

export default TaskTabPanel;
