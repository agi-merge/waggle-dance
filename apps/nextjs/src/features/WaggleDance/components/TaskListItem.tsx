import React, { useMemo } from "react";
import {
  AssignmentTurnedIn,
  Construction,
  Download,
  Edit,
  QuestionAnswer,
  Send,
} from "@mui/icons-material";
import {
  Card,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  ListItem,
  ListItemContent,
  ListItemDecorator,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { v4 } from "uuid";
import { stringify } from "yaml";

import {
  findResult,
  isAgentPacketFinishedType,
  rootPlanId,
  TaskStatus,
  type AgentPacket,
  type BaseAgentPacketWithIds,
  type TaskState,
} from "@acme/agent";
import { type DraftExecutionEdge, type DraftExecutionNode } from "@acme/db";

import { stringifyMax } from "../utils/stringifyMax";

interface TaskListItemProps {
  task: TaskState;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
  i: number;
  statusColor: (
    n: TaskState,
  ) => "danger" | "success" | "warning" | "primary" | "neutral" | undefined;
  isRunning: boolean;
  listItemsRef: React.MutableRefObject<HTMLLIElement[]>;
}
enum GroupType {
  Skill = "Skill",
  Retriever = "Retriever",
  Result = "Result",
  Working = "Working",
}

const getGroupType = (group: AgentPacket[]): GroupType => {
  for (const packet of group) {
    switch (packet.type) {
      case "handleAgentAction":
      case "handleToolStart":
      case "handleToolEnd":
      case "handleToolError":
        return GroupType.Skill;

      case "handleRetrieverStart":
      case "handleRetrieverEnd":
      case "handleRetrieverError":
        return GroupType.Retriever;

      default:
        if (isAgentPacketFinishedType(packet.type)) {
          return GroupType.Result;
        } else {
          return GroupType.Working;
        }
    }
  }
  return GroupType.Working;
};

// Define a type for GroupOutput
type GroupOutput = {
  type: GroupType;
  title: string;
  output: string; // Replace 'any' with the actual type of the parsed output
  key: string;
};

const getGroupOutput = (group: AgentPacket[]): GroupOutput | null => {
  const groupType = getGroupType(group);

  if (!groupType) {
    return null;
  }
  console.log("groupType", groupType);
  let parsedOutput = "!";
  let parsedTitle = `${GroupType[groupType]} `;

  // Get the last packet in the group
  const lastPacket = group[group.length - 1];

  if (!lastPacket) {
    console.warn("No last packet in group", group);
    return null;
  }

  const key = "runId" in lastPacket ? lastPacket.runId : v4();

  switch (groupType) {
    case GroupType.Working:
      // parsedTitle = "";
      // parsedOutput = "";
      // break;
      return null;
    case GroupType.Skill:
      // const toolNameFromStart =
      //   lastPacket.type === "handleToolStart" &&
      //   lastPacket.tool.id[lastPacket.tool.id.length - 1];
      const toolName: string | undefined = group.reduce(
        (acc: string | undefined, packet) => {
          if (!!acc) {
            return acc;
          }
          if (packet.type === "handleAgentAction") {
            return packet.action.toolInput;
          } else if (packet.type === "handleToolStart") {
            // debugger;
            return packet.tool.id[packet.tool.id.length - 1];
          }
          return acc;
        },
        undefined,
      );
      parsedTitle = toolName ? toolName : parsedTitle;
      const output: string | undefined =
        group.reduce((acc: string | undefined, packet) => {
          if (!!acc) {
            return acc;
          }
          if (packet.type === "handleToolEnd") {
            return packet.output.slice(0, 50);
          } else if (packet.type === "handleToolError") {
            return String(packet.err);
          }
          return acc;
        }, undefined) || "";
      parsedOutput = output;
      break;
    case GroupType.Retriever:
      parsedOutput =
        lastPacket.type === "handleRetrieverError"
          ? String(lastPacket.err)
          : lastPacket.type === "handleRetrieverEnd"
          ? JSON.stringify(lastPacket.documents)
          : parsedOutput;
      break;
    case GroupType.Result:
      parsedOutput = findResult(group);
      parsedTitle = "Result";
      break;
  }

  return {
    type: groupType,
    title: parsedTitle,
    output: parsedOutput,
    key,
  };
};

const GroupContent = (
  groupOutput: GroupOutput,
  color: "success" | "primary",
): React.ReactNode => {
  const { type: _type, title, output, key } = groupOutput;

  return (
    <Typography key={key} level="body-sm" color={color}>
      {title}: <Typography level="body-xs">{output}</Typography>
    </Typography>
  );
};

const renderPacketGroup = (group: AgentPacket[]) => {
  const groupOutput = getGroupOutput(group);
  if (!groupOutput) {
    return null;
  }
  const Icon = () => {
    switch (groupOutput.type) {
      case GroupType.Skill:
        return <Construction />;
      case GroupType.Retriever:
        return <Download />;
      case GroupType.Result:
        return <AssignmentTurnedIn />;
      case GroupType.Working:
        return <QuestionAnswer />;
    }
  };
  const color = groupOutput.type === GroupType.Result ? "success" : "primary";
  return (
    <Chip
      key={groupOutput?.key ?? v4()}
      variant="soft"
      color={color}
      size="sm"
      startDecorator={<Icon />}
      endDecorator={"→"}
      sx={{ m: 0.5, p: 0.5, borderRadius: "0.5rem" }}
    >
      {GroupContent(groupOutput, color)}
    </Chip>
  );
};

// Use getDisplayLabel where you need to display the packet...

const TaskListItem = ({
  task: t,
  nodes,
  edges,
  i,
  statusColor,
  isRunning,
  listItemsRef,
}: TaskListItemProps) => {
  const node = useMemo(() => t.node(nodes), [nodes, t]);

  function isBaseAgentPacketWithIds(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packet: any,
  ): packet is BaseAgentPacketWithIds {
    return "runId" in packet && "parentRunId" in packet;
  }

  const packetGroups = useMemo(() => {
    const groups: Record<string, BaseAgentPacketWithIds[]> = {};

    t.packets.forEach((packet) => {
      if (isBaseAgentPacketWithIds(packet)) {
        const groupId = packet.runId || packet.parentRunId || v4();
        if (groupId) {
          // Check if groupId is not undefined
          if (!groups[groupId]) {
            groups[groupId] = []; // Initialize as an empty array if it doesn't exist
          }
          groups[groupId]!.push(packet);
        }
      }
    });

    // Convert the groups object to an array of arrays
    return Object.values(groups);
  }, [t.packets]);

  if (!node) {
    return null;
  }

  return (
    <ListItem
      sx={{
        width: { xs: "100%", sm: "auto" },
        flexDirection: { xs: "column", sm: "row" },
      }}
      ref={(el) => el && (listItemsRef.current[i] = el)}
    >
      <ListItemDecorator
        color={statusColor(t)}
        sx={{
          width: { xs: "100%", sm: "10rem" },
          height: "100%",
          flexDirection: {
            xs: "row",
            sm: "column",
          },
          textAlign: "end",
          alignItems: "end",
          alignSelf: "start",
          paddingRight: { xs: "inherit", sm: "0.5rem" },
          marginRight: { xs: "inherit", sm: "-0.25rem" },
          marginTop: { xs: "inherit", sm: "0.25rem" },
          marginBottom: { xs: "-0.75rem", sm: "inherit" },
          paddingBottom: { xs: "1rem", sm: "inherit" },
        }}
        size="sm"
        variant="soft"
        component={Card}
      >
        <Stack
          direction={{ xs: "row", sm: "column" }}
          gap={{ xs: "0.5rem", sm: "0.25rem" }}
          alignItems={{ xs: "center", sm: "flex-end" }}
        >
          <Typography level="title-md" sx={{ wordBreak: "break-word" }}>
            {node.name}
          </Typography>
          <Typography level="title-sm" color="neutral" fontFamily="monospace">
            id: <Typography level="body-sm">{t.displayId()}</Typography>
          </Typography>
          <Stack gap="0.3rem" direction="row">
            <Tooltip title="Chat">
              <IconButton size="sm">
                <Send />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" />
            <Tooltip title="Edit">
              <IconButton size="sm">
                <Edit />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </ListItemDecorator>
      <ListItemContent sx={{ width: "100%" }}>
        <Card
          variant="outlined"
          component={Stack}
          direction="column"
          className="min-w-full"
        >
          <Stack className="text-wrap" gap={1.5}>
            <Typography
              level="body-sm"
              className="text-wrap"
              color="neutral"
              style={{
                overflowWrap: "break-word",
              }}
            >
              {stringifyMax(node.context, 200)}
            </Typography>
          </Stack>

          {isRunning && t.status === TaskStatus.working && (
            <LinearProgress thickness={2} />
          )}
          <Card
            size="sm"
            className="justify-start p-1 text-start"
            component={Stack}
            direction={"column"}
            variant="outlined"
            sx={(theme) => ({
              backgroundColor: theme.palette.background.backdrop,
              "@supports not ((-webkit-backdrop-filter: blur) or (backdrop-filter: blur))":
                {
                  backgroundColor: theme.palette.background.surface, // Add opacity to the background color
                },
            })}
          >
            <Typography level="title-lg">
              {isAgentPacketFinishedType(t.value.type) ? (
                <>Result: </>
              ) : (
                <>Status: </>
              )}
            </Typography>
            <span>
              {packetGroups.map((group) =>
                renderPacketGroup(group as AgentPacket[]),
              )}
            </span>

            <Typography
              level="body-sm"
              className="max-h-72 overflow-x-clip overflow-y-scroll  break-words pt-2"
              fontFamily={
                t.status === TaskStatus.error ? "monospace" : undefined
              }
            >
              {t.value.type === "done" && t.value.value}
              {t.value.type === "error" && stringify(t.value.error)}
              {t.value.type === "handleAgentEnd" && t.value.value}
              {t.value.type === "handleLLMError" && stringify(t.value.err)}
              {t.value.type === "handleChainError" && stringify(t.value.err)}
              {t.value.type === "handleAgentError" && stringify(t.value.err)}
              {t.value.type === "handleRetrieverError" &&
                stringify(t.value.err)}
              {t.value.type === "working" &&
                t.nodeId === rootPlanId &&
                `...${nodes.length} tasks and ${edges.length} interdependencies`}
            </Typography>
          </Card>
        </Card>
      </ListItemContent>
    </ListItem>
  );
};

export default TaskListItem;
