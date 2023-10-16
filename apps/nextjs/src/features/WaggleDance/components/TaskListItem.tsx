import React, { useMemo } from "react";
import {
  AssignmentTurnedIn,
  Construction,
  Download,
  ErrorOutline,
  QuestionAnswer,
} from "@mui/icons-material";
import {
  Box,
  Card,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Sheet,
  Stack,
  Typography,
  type BoxProps,
} from "@mui/joy";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { v4 } from "uuid";
import { stringify } from "yaml";

import {
  getMostRelevantOutput,
  isAgentPacketFinishedType,
  rootPlanId,
  TaskStatus,
  type AgentPacket,
  type BaseAgentPacketWithIds,
  type TaskState,
} from "@acme/agent";
import { mapPacketTypeToStatus } from "@acme/agent/src/prompts/utils/mapPacketToStatus";
import { type DraftExecutionEdge, type DraftExecutionNode } from "@acme/db";

import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
import { stringifyMax } from "../utils/stringifyMax";

type StatusColor =
  | "danger"
  | "success"
  | "warning"
  | "primary"
  | "neutral"
  | undefined;
type StatusColorFn = (n: TaskState) => StatusColor;
interface TaskListItemProps {
  task: TaskState;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
  i: number;
  statusColor: StatusColorFn;
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
    case GroupType.Error:
    case GroupType.Working:
      if (lastPacket.type === "handleChainEnd") {
        // would double up w/ LLM End
        return null;
      }
      const { title, output: o } = getMostRelevantOutput(
        group.findLast((p) => !!p)!,
      );
      parsedTitle = title;
      parsedOutput = o;
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

const TaskResultsValue = ({
  t,
  nodes,
  edges,
}: {
  t: TaskState;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
}) => {
  return (
    <Typography
      level="body-sm"
      sx={{
        wordBreak: "break-word",
        overflow: "clip",
        maxLines: 1,
        textOverflow: "ellipsis",
        p: 1,
      }}
    >
      {t.value.type === "working" && t.nodeId === rootPlanId
        ? `...${nodes.length} tasks and ${edges.length} interdependencies`
        : isAgentPacketFinishedType(t.value)
        ? getMostRelevantOutput(t.value).output.replace(/\\n/g, " ")
        : "None"}
    </Typography>
  );
};
const TaskResultTitle = ({
  t,
  color,
  isOpen,
  nodes,
  edges,
}: {
  t: TaskState;
  color: StatusColor;
  isOpen: boolean;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
}) => {
  return (
    <Typography
      level="title-lg"
      color={color}
      sx={{
        whiteSpace: isOpen ? "normal" : "nowrap",
        overflow: isOpen ? "visible" : "hidden",
        textOverflow: isOpen ? "clip" : "ellipsis",
      }}
    >
      {t.status === TaskStatus.error ? "Error: " : "Result: "}
      {isOpen ? null : <TaskResultsValue t={t} nodes={nodes} edges={edges} />}
    </Typography>
  );
};
const TaskResult = ({
  t,
  color: _color,
  nodes,
  edges,
  ...props
}: {
  t: TaskState;
  color: StatusColor;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
} & BoxProps) => {
  const result = useMemo(() => {
    return getMostRelevantOutput(t.value).output.replace(/\\n/g, " ");
  }, [t.value]);
  return (
    <Box
      {...props}
      sx={{
        overflow: "scroll",
      }}
    >
      <Markdown
        className={`markdown break-words pt-2 ${
          t.status === TaskStatus.error ? "font-mono" : ""
        }`}
        remarkPlugins={[remarkGfm]}
      >
        {t.value.type === "working" && t.nodeId === rootPlanId
          ? `Planned ${nodes.length} tasks and ${edges.length} interdependencies`
          : result}
      </Markdown>
    </Box>
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
        width: "100%",
        flexDirection: { xs: "column", sm: "row" },
        pb: 2,
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
          position: "sticky",
          top: 0,
          mr: 0.25,
          zIndex: 2,
        })}
        size="sm"
        component={Card}
        color={statusColor(t)}
        variant="outlined"
      >
        <Stack
          direction={{ xs: "row", sm: "column" }}
          gap={{ xs: "0.5rem", sm: "0.25rem" }}
          className="flex w-full flex-grow"
          alignItems={{ xs: "center", sm: "flex-end" }}
        >
          <Typography
            level="title-md"
            sx={{ wordBreak: "break-word" }}
            color={statusColor(t)}
          >
            {node.name}
          </Typography>
          <Typography level="body-xs">{t.displayId()}</Typography>
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
          color={statusColor(t)}
          component={Stack}
          direction="column"
          className="w-full overflow-x-clip overflow-y-clip"
        >
          <Card
            size="sm"
            sx={{
              overflow: "auto",
              m: 0,
              p: 0,
            }}
            variant="plain"
          >
            <Typography level="title-lg" sx={{ pl: "0.35rem", zIndex: 1 }}>
              Context:{" "}
              <Typography
                fontWeight={"normal"}
                level="body-sm"
                className="text-wrap"
                color="neutral"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3, // Number of lines you want to display
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stringifyMax(node.context, 200)}
              </Typography>
            </Typography>
            <List
              size="sm"
              orientation="horizontal"
              className="max-w-screen h-16 overflow-y-auto overflow-x-scroll "
              sx={{
                paddingRight: "50%",
                alignItems: "center",
                zIndex: 0,
              }} // Add right padding equal to the width of the gradient
            >
              <Sheet sx={{ position: "sticky", left: 0, zIndex: 1, pr: 1 }}>
                <Typography level="title-lg">Actions:</Typography>
                <Typography
                  color={statusColor(t)}
                  level="body-md"
                  sx={{ textAlign: "center" }}
                >
                  {isRunning
                    ? mapPacketTypeToStatus(t.value.type)
                    : t.packets.length > 0
                    ? "stopped"
                    : "waiting"}
                </Typography>
              </Sheet>
              <CircularProgress
                size="sm"
                sx={{
                  opacity:
                    isRunning && t.status === TaskStatus.working ? "1" : "0",
                  mr: 1,
                }}
              />
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
          <List type="multiple" variant="soft" component={Accordion}>
            <AccordionItem value={"ok"} key={"heyaaaheyaysayaya"}>
              <AccordionHeader
                isFirst={false}
                openText={
                  <TaskResultTitle
                    t={t}
                    color={statusColor(t)}
                    isOpen={true}
                    nodes={nodes}
                    edges={edges}
                  />
                }
                closedText={
                  <TaskResultTitle
                    t={t}
                    color={statusColor(t)}
                    isOpen={false}
                    nodes={nodes}
                    edges={edges}
                  />
                }
              />
              <AccordionContent isLast={true}>
                <TaskResult
                  t={t}
                  color={statusColor(t)}
                  nodes={nodes}
                  edges={edges}
                />
              </AccordionContent>
            </AccordionItem>
          </List>
        </Card>
      </ListItemContent>
    </ListItem>
  );
};

export default TaskListItem;
