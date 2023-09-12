import {
  TabPanel,
  type AlertPropsColorOverrides,
  type ColorPaletteProp,
} from "@mui/joy";
import { type OverridableStringUnion } from "@mui/types";

import { type TaskState } from "@acme/agent";
import { type ExecutionNode } from "@acme/db";

import TaskListTab from "./TaskListTab";

type TaskTabPanelProps = {
  nodes: ExecutionNode[];
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
  sortedTaskStates,
  statusColor,
  isRunning,
  listItemsRef,
  taskListRef,
}: TaskTabPanelProps) => {
  return (
    <TabPanel value={0} className="w-full overflow-y-scroll p-4">
      <TaskListTab
        nodes={nodes}
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
