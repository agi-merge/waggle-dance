// TaskListTab.tsx
import React from "react";
import List from "@mui/joy/List";
import ListDivider from "@mui/joy/ListDivider";

import { type DAGNode, type TaskState } from "@acme/agent";

import TaskListItem from "./TaskListItem";

type TaskListTabProps = {
  sortedTaskStates: TaskState[];
  nodes: DAGNode[];
  statusColor: (
    n: TaskState,
  ) => "danger" | "success" | "warning" | "primary" | "neutral" | undefined;
  isRunning: boolean;
  taskListRef: React.RefObject<HTMLUListElement>;
  listItemsRef: React.MutableRefObject<HTMLLIElement[]>;
};

export const TaskListTab = ({
  sortedTaskStates,
  nodes,
  statusColor,
  isRunning,
  taskListRef,
  listItemsRef,
}: TaskListTabProps) => {
  return (
    <List aria-label="Task list" size="sm" ref={taskListRef}>
      {sortedTaskStates.map((t, i) => (
        <React.Fragment key={t.id}>
          <TaskListItem
            task={t}
            nodes={nodes}
            i={i}
            statusColor={statusColor}
            listItemsRef={listItemsRef}
            isRunning={isRunning}
          />
          {i !== sortedTaskStates.length - 1 && (
            <ListDivider inset="gutter" sx={{ margin: 1.5 }} />
          )}
        </React.Fragment>
      ))}
    </List>
  );
};

export default TaskListTab;
