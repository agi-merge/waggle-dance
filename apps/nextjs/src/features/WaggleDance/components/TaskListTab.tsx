// TaskListTab.tsx
import React, {
  lazy,
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import {
  Divider,
  ListItemButton,
  ListSubheader,
  Skeleton,
  Typography,
} from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";

import { type TaskState } from "@acme/agent";
import { type DraftExecutionEdge, type DraftExecutionNode } from "@acme/db";

// import TaskListItem from "./TaskListItem";

const TaskListItem = lazy(() => import("./TaskListItem"));

type TaskListTabProps = {
  sortedTaskStates: TaskState[];
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
  statusColor: (
    n: TaskState,
  ) => "danger" | "success" | "warning" | "primary" | "neutral" | undefined;
  isRunning: boolean;
  taskListRef: React.RefObject<HTMLUListElement>;
  listItemsRef: React.MutableRefObject<HTMLLIElement[]>;
};

type Coordinate = {
  x: number;
  y: number;
};
const NodeConnector = ({
  from,
  to,
}: {
  from: Coordinate | undefined;
  to: Coordinate | undefined;
}) => {
  if (!from || !to) return null;
  return (
    <svg style={{ position: "absolute", top: 0, left: 0 }}>
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="0"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#f00" />
        </marker>
      </defs>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#f00"
        strokeWidth="2"
        markerEnd="url(#arrow)"
      />
    </svg>
  );
};

export const TaskListTab = ({
  sortedTaskStates,
  nodes,
  edges,
  statusColor,
  isRunning,
  taskListRef,
  listItemsRef,
}: TaskListTabProps) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [nodePositions, setNodePositions] = useState<
    Record<string, Coordinate>
  >({});
  const nodeRefs = useRef<Record<string, HTMLLIElement>>({});

  useLayoutEffect(() => {
    const newPositions: Record<string, Coordinate> = {};
    for (const node of nodes) {
      const rect = nodeRefs.current[node.id]?.getBoundingClientRect();
      if (!rect) continue;
      newPositions[node.id] = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    setNodePositions(newPositions);
  }, [nodes]);

  const handleToggleExpanded = (tier: string) => {
    setOpen((prevOpen) => ({ ...prevOpen, [tier]: !prevOpen[tier] }));
  };

  const tieredTaskMap = useMemo(() => {
    return Object.entries(
      sortedTaskStates.reduce(
        (acc, task) => {
          const tier = task.tier;
          if (tier) {
            if (acc[tier]) {
              acc[tier]!.push(task);
            } else {
              acc[tier] = [task];
            }
          }
          return acc;
        },
        {} as Record<string, TaskState[]>,
      ),
    ).sort(([aTier, _], [bTier, __]) => {
      const parsedATier = parseInt(aTier);
      const parsedBTier = parseInt(bTier);
      if (isNaN(parsedATier)) return -1;
      if (isNaN(parsedBTier)) return 1;
      return parsedATier - parsedBTier;
    });
  }, [sortedTaskStates]);

  function TaskTier(
    tier: string,
    tasks: TaskState[],
    i: number,
    isLast: boolean,
  ): React.JSX.Element {
    return (
      <ListItemButton
        onClick={(e) => {
          handleToggleExpanded(tier);
          e.stopPropagation();
          e.preventDefault();
        }}
        variant={"soft"}
        sx={(theme) => ({
          overflow: "clip",
          backgroundColor:
            i % 2 === 0
              ? theme.palette.background.level1
              : theme.palette.background.surface,
          pb: 2,
          pt: 1,
        })}
      >
        <ListItem key={tier} nested sx={{ width: "100%" }}>
          <ListSubheader>
            <IconButton
              variant="plain"
              size="sm"
              color="neutral"
              onClick={(e) => {
                tier && handleToggleExpanded(tier);
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Typography level="body-sm" sx={{ textTransform: "uppercase" }}>
                {tier === "0"
                  ? `Planning`
                  : isLast
                  ? "End"
                  : `Task Tier ${tier}`}
              </Typography>
              <KeyboardArrowDown
                sx={{
                  transform: tier && open[tier] ? "initial" : "rotate(-90deg)",
                }}
              />
            </IconButton>
          </ListSubheader>
          <List
            orientation="vertical"
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              flexWrap: "wrap",
              "@media (min-width: 600px)": {
                flexDirection: "row",
              },
              "--ListItem-paddingY": "8px",
            }}
          >
            <Suspense
              fallback={<Skeleton sx={{ width: "12rem", height: "8rem" }} />}
            >
              {tasks.map((task, i) => (
                <TaskListItem
                  key={task.id}
                  ref={(el) => {
                    if (el) {
                      nodeRefs.current[task.id] = el;
                    }
                  }}
                  task={task}
                  nodes={nodes}
                  edges={edges}
                  i={i}
                  statusColor={statusColor}
                  isRunning={isRunning}
                  listItemsRef={listItemsRef}
                  isExpanded={open[tier] || false}
                />
              ))}
            </Suspense>
            {nodes.slice(1).map((node, i) => (
              <NodeConnector
                key={node.id}
                from={nodes[i] && nodePositions[nodes[i]!.id]}
                to={nodePositions[node.id]}
              />
            ))}
          </List>
        </ListItem>
      </ListItemButton>
    );
  }

  return (
    <List aria-label="Task list" size="sm" ref={taskListRef}>
      {Object.entries(tieredTaskMap).map(([tier, [__, tasks]], i) => {
        return (
          <>
            {TaskTier(tier, tasks, i, i === tieredTaskMap.length - 1)}
            {i !== tieredTaskMap.length - 1 && (
              <Divider orientation="horizontal" />
            )}
          </>
        );
      })}
    </List>
  );
};

export default TaskListTab;
