import React, { useMemo } from "react";
import {
  AssignmentTurnedIn,
  Construction,
  Download,
  Edit,
  ErrorOutline,
  QuestionAnswer,
  Send,
} from "@mui/icons-material";
import {
  Box,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { mapPacketTypeToStatus } from "@acme/agent/src/prompts/utils/mapPacketToStatus";
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
  Success = "Success",
  Error = "Error",
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
        if (isAgentPacketFinishedType(packet)) {
          if (packet.type === "handleAgentEnd" || packet.type === "done") {
            return GroupType.Success;
          } else {
            return GroupType.Error;
          }
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
  params?: string;
  color: "success" | "primary" | "neutral" | "danger" | "warning";
  output: string; // Replace 'any' with the actual type of the parsed output
  key: string;
};

const getGroupOutput = (group: AgentPacket[]): GroupOutput | null => {
  const groupType = getGroupType(group);

  if (!groupType) {
    return null;
  }
  let parsedOutput = "!";
  let parsedTitle = `${GroupType[groupType]} `;
  let parsedParams = "";
  let parsedColor: "success" | "primary" | "neutral" | "danger" | "warning" =
    "neutral";
  // Get the last packet in the group
  const lastPacket = group[group.length - 1];

  if (!lastPacket) {
    console.warn("No last packet in group", group);
    return null;
  }

  const key = "runId" in lastPacket ? lastPacket.runId : v4();

  switch (groupType) {
    case GroupType.Success:
      parsedTitle = `✅`;
      parsedOutput = findResult(group).replace(/\\n/g, "\n");
      break;

    case GroupType.Error:
      parsedTitle = `Error`;
      parsedOutput = findResult(group).replace(/\\n/g, "\n");
      break;

    case GroupType.Working:
      parsedTitle = `Think`;
      const end = group.find((g) => g.type === "handleLLMEnd");
      const chainEnd = group.find((g) => g.type === "handleChainEnd");
      if (end?.type === "handleLLMEnd") {
        parsedOutput = stringify(end.output);
      } else if (chainEnd?.type === "handleChainEnd") {
        parsedOutput = stringify(chainEnd.outputs);
      }
      parsedColor = "neutral";
      parsedOutput = "";
      break;
    case GroupType.Skill:
      const toolName: string | undefined = group.reduce(
        (acc: string | undefined, packet) => {
          if (!!acc) {
            return acc;
          }
          if (packet.type === "handleToolStart") {
            return packet.tool.id[packet.tool.id.length - 1];
          } else if (packet.type === "handleAgentAction") {
            return packet.action.tool;
          }
          return acc;
        },
        undefined,
      );
      const toolParams: string | undefined = group.reduce(
        (acc: string | undefined, packet) => {
          if (!!acc) {
            return acc;
          }
          if (
            packet.type === "handleToolStart" &&
            typeof packet.input === "string"
          ) {
            const input = packet.input.slice(0, 20);
            if (input.length === 20) {
              return `${input}…`;
            } else if (input.length > 0) {
              return input;
            }
          }
          if (
            packet.type === "handleAgentAction" &&
            packet.action &&
            packet.action.toolInput &&
            typeof packet.action.toolInput === "string"
          ) {
            return packet.action.toolInput.slice(0, 40);
          }
          return acc;
        },
        undefined,
      );
      parsedParams = toolParams ? toolParams : parsedParams;
      parsedTitle = toolName ? toolName : parsedTitle;
      const output: string | undefined =
        group.reduce((acc: string | undefined, packet) => {
          if (!!acc) {
            return acc;
          }
          if (packet.type === "handleToolEnd") {
            const split = packet.output.split(": ");
            if (split.length && split[0]?.includes("Error")) {
              parsedColor = "danger";
            } else {
              parsedColor = "success";
            }
            return packet.output.slice(0, 40);
          } else if (packet.type === "handleToolError") {
            parsedColor = "danger";
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
          ? stringify(lastPacket.documents)
          : parsedOutput;
      break;
    case GroupType.Success:
      parsedOutput = findResult(group).replace(/\\n/g, "\n");
      parsedTitle = "Success";
      break;
    case GroupType.Error:
      parsedOutput =
        lastPacket.type === "handleAgentError"
          ? stringify(lastPacket.err)
          : lastPacket.type === "handleLLMError"
          ? stringify(lastPacket.err)
          : lastPacket.type === "handleChainError"
          ? stringify(lastPacket.err)
          : parsedOutput;
      break;
  }

  return {
    type: groupType,
    title: parsedTitle,
    output: `${parsedOutput.slice(0, 40)}…`,
    params: parsedParams,
    color: parsedColor,
    key,
  };
};

const GroupContent = (
  groupOutput: GroupOutput,
  color: "success" | "primary" | "neutral" | "danger" | "warning",
): React.ReactNode => {
  const { type: _type, title, output, params } = groupOutput;

  return (
    <Box>
      <Typography level="body-sm" color={color}>
        {title}{" "}
        <Typography
          level="body-xs"
          sx={(theme) => ({
            color: theme.palette.text.primary,
            fontFamily: "monospace",
          })}
        >
          {params ? ` (${params})` : undefined}
        </Typography>
      </Typography>
      <Typography level="body-xs">{output || "working"}</Typography>
    </Box>
  );
};

const renderPacketGroup = (group: AgentPacket[], index: number) => {
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
      case GroupType.Success:
        return <AssignmentTurnedIn />;
      case GroupType.Error:
        return <ErrorOutline />;
      case GroupType.Working:
        return <QuestionAnswer />;
    }
  };

  return (
    <React.Fragment key={groupOutput?.key ?? v4()}>
      {index > 0 && "←"}
      <ListItem key={groupOutput?.key ?? v4()} sx={{}}>
        <ListItemButton
          variant="outlined"
          color={groupOutput.color}
          sx={{
            m: 0,
            borderRadius: "0.5rem",
          }}
        >
          <ListItemDecorator>
            <Icon />
          </ListItemDecorator>
          <Divider orientation="vertical" sx={{ marginRight: "0.5rem" }} />
          {GroupContent(groupOutput, groupOutput.color)}
        </ListItemButton>
      </ListItem>
    </React.Fragment>
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
    // FIXME: this paves over a bug elsewhere due to packet being sent as a string
    if (typeof packet !== "string" && (packet as BaseAgentPacketWithIds)) {
      return "runId" in packet && "parentRunId" in packet;
    } else {
      return false;
    }
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
    return Object.values(groups).reverse();
  }, [t.packets]);

  if (!node) {
    return null;
  }

  return (
    <ListItem
      sx={{
        height: {
          xs: i === 0 ? "18rem" : "33vh",
          sm: i === 0 ? "16rem" : "33vh",
          md: i === 0 ? "14rem" : "33vh",
        },
        width: "100%",
        flexDirection: { xs: "column", sm: "row" },
      }}
      className="overflow-y-auto overflow-x-clip"
      ref={(el) => el && (listItemsRef.current[i] = el)}
    >
      <ListItemDecorator
        sx={(_theme) => ({
          width: { xs: "100%", sm: "10rem" },
          flexDirection: {
            xs: "row",
            sm: "column",
          },
          textAlign: "end",
          alignItems: "end",
          alignSelf: "start",
        })}
        size="sm"
        component={Card}
        color={statusColor(t)}
        variant="soft"
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
      <ListItemContent
        sx={{
          height: "100%",
          width: "100%",
          flexDirection: {
            xs: "row",
            sm: "column",
          },
          alignSelf: "start",
        }}
      >
        <Card
          variant="outlined"
          component={Stack}
          direction="column"
          className="h-fit w-full"
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
          {(rootPlanId !== t.id || !isAgentPacketFinishedType(t.value)) && (
            <Card
              size="sm"
              style={{ position: "relative", overflow: "hidden" }}
              variant="plain"
            >
              <List
                size="sm"
                orientation="horizontal"
                className="max-w-screen max-h-16 overflow-scroll align-middle"
                sx={{ m: 0, p: 0, paddingRight: "50%", alignItems: "center" }} // Add right padding equal to the width of the gradient
              >
                <Box
                  sx={{
                    m: 1,
                    alignItems: "right", // Vertically aligns the content
                  }}
                >
                  <Typography
                    level="title-lg"
                    sx={{
                      textAlign: "right",
                    }}
                  >
                    Actions:
                  </Typography>
                  {!isAgentPacketFinishedType(t.value) && (
                    <Typography
                      color={statusColor(t)}
                      level="body-md"
                      sx={{ textAlign: "right" }}
                    >
                      {isRunning
                        ? mapPacketTypeToStatus(t.value.type)
                        : "stopped"}
                    </Typography>
                  )}
                </Box>
                {isRunning && t.status === TaskStatus.working && (
                  <CircularProgress size="sm" />
                )}
                {packetGroups.map((group, index) =>
                  renderPacketGroup(group as AgentPacket[], index),
                )}
              </List>
              <Box
                sx={(theme) => ({
                  overflow: "hidden",
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: "33%",
                  background: `linear-gradient(to left, ${theme.palette.background.surface}, transparent)`,
                  pointerEvents: "none",
                })}
              />
            </Card>
          )}
          {isAgentPacketFinishedType(t.value) && (
            <Typography
              level="body-sm"
              color={statusColor(t)}
              sx={{ p: 1 }}
              variant="outlined"
            >
              <Typography level="title-lg" color={statusColor(t)}>
                {t.status === TaskStatus.error ? "Error: " : "Result: "}
              </Typography>
              <Markdown
                className=" max-h-fit break-words pt-2"
                remarkPlugins={[remarkGfm]}
              >
                {t.value.type === "working" && t.nodeId === rootPlanId
                  ? `...${nodes.length} tasks and ${edges.length} interdependencies`
                  : findResult(t.packets).replace(/\\n/g, "\n")}
              </Markdown>
            </Typography>
          )}
        </Card>
      </ListItemContent>
    </ListItem>
  );
};

export default TaskListItem;
