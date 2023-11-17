import React, { useMemo, useState, type Dispatch } from "react";
import Link from "next/link";
import {
  AssignmentTurnedIn,
  Construction,
  Download,
  ErrorOutline,
  QuestionAnswer,
  QuestionMark,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Modal,
  ModalDialog,
  Sheet,
  Stack,
  Tooltip,
  Typography,
  useColorScheme,
  type ListItemProps,
} from "@mui/joy";
import Accordion from "@mui/joy/Accordion";
import AccordionDetails from "@mui/joy/AccordionDetails";
import AccordionGroup from "@mui/joy/AccordionGroup";
import AccordionSummary from "@mui/joy/AccordionSummary";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { v4 } from "uuid";
import { stringify } from "yaml";
import { z } from "zod";

import {
  findArtifactPackets,
  findContextAndTools,
  getMostRelevantOutput,
  isAgentPacketFinishedType,
  rootPlanId,
  TaskStatus,
  type AgentPacket,
  type ArtifactAgentPacket,
  type BaseAgentPacketWithIds,
  type TaskState,
} from "@acme/agent";
import { isTaskCriticism } from "@acme/agent/src/prompts/types";
import { parseAnyFormat } from "@acme/agent/src/utils/mimeTypeParser";
import { type DraftExecutionEdge, type DraftExecutionNode } from "@acme/db";

type StatusColor =
  | "danger"
  | "success"
  | "warning"
  | "primary"
  | "neutral"
  | undefined;
type StatusColorFn = (n: TaskState) => StatusColor;
interface TaskListItemProps extends ListItemProps {
  task: TaskState;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
  i: number;
  statusColor: StatusColorFn;
  isRunning: boolean;
  listItemsRef: React.MutableRefObject<HTMLLIElement[]>;
  isExpanded: boolean;
}
enum GroupType {
  Skill = "Skill",
  Custom = "Custom",
  Retriever = "Retriever",
  Success = "Success",
  Error = "Error",
  Working = "Working",
}

const ResultMarkdown = ({
  t,
  nodes,
  edges,
  result,
}: {
  t: TaskState;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
  result: string;
}) => {
  return (
    <Markdown
      components={{
        // Map `h1` (`# heading`) to use `h2`s.
        h1: "h2",
        // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
        a(props) {
          const { target: _target, href, ref: _ref, ...rest } = props;
          return href && <Link target="_blank" href={href} {...rest} />;
        },
      }}
      className={`markdown break-words pt-2 ${
        t.status === TaskStatus.error ? "font-mono" : "font-sans"
      }`}
      remarkPlugins={[remarkGfm]}
    >
      {t.value.type === "working" && t.nodeId === rootPlanId
        ? `Planned ${nodes.length} tasks and ${edges.length} interdependencies`
        : result}
    </Markdown>
  );
};

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

      case "artifact":
      case "contextAndTools":
      case "refine":
      case "rewrite":
      case "review":
        return GroupType.Custom;

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
      if (lastPacket.type === "handleLLMEnd") {
        parsedColor = "success";
      }
      const { title, output: o } = getMostRelevantOutput(
        group.findLast((p) => !!p)!,
      );
      parsedTitle = title;
      parsedOutput = o;
      break;
    case GroupType.Custom:
      switch (lastPacket.type) {
        case "artifact":
          parsedTitle = "Artifact";
          parsedOutput = lastPacket.url.toString();
          break;
        case "contextAndTools":
          parsedTitle = "Synthesize Context & Tools";
          parsedOutput = stringify(lastPacket.synthesizedContext?.join("\n "));
          break;
        case "refine":
          parsedTitle = "Refine";
          parsedOutput = "…";
          break;
        case "review":
          parsedTitle = "Review";
          parsedOutput = "…";
          break;
        case "rewrite":
          parsedTitle = "Improve Answer";
          parsedOutput = "…";
          break;
      }
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
            return `act: ${packet.action.tool}`;
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

const renderPacketGroup = (
  group: AgentPacket[],
  index: number,
  selectedGroup: AgentPacket[] | null,
  setSelectedGroup: Dispatch<React.SetStateAction<AgentPacket[] | null>>,
) => {
  const groupOutput = getGroupOutput(group);
  if (!groupOutput) {
    return null;
  }

  const Icon = () => {
    if (groupOutput.color === "success") {
      return <AssignmentTurnedIn />;
    }
    if (groupOutput.color === "danger") {
      return <ErrorOutline />;
    }
    switch (groupOutput.type) {
      case GroupType.Skill:
        return <Construction />;
      case GroupType.Retriever:
        return <Download />;
      case GroupType.Custom:
        switch (group[group.length - 1]?.type) {
          case "artifact":
            return <Download />;
          case "contextAndTools":
            return <QuestionAnswer />;
          case "refine":
            return <QuestionAnswer />;
          case "review":
            return <QuestionAnswer />;
          case "rewrite":
            return <QuestionAnswer />;
        }
        return <QuestionMark />;
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
          onClick={(e) => {
            setSelectedGroup(group);
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <ListItemDecorator>
            <Icon />
          </ListItemDecorator>
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
  artifacts,
  isOpen,
}: {
  t: TaskState;
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
  artifacts: ArtifactAgentPacket[];
  isOpen: boolean;
}) => {
  const result = useMemo(() => {
    let result =
      t.value.type === "working" && t.nodeId === rootPlanId
        ? `...${nodes.length} tasks and ${edges.length} interdependencies`
        : isAgentPacketFinishedType(t.value)
          ? getMostRelevantOutput(t.value).output
          : "None";
    const AgentPacketShape = z.custom<AgentPacket>();
    const packet = parseAnyFormat(result, AgentPacketShape);
    if (packet) {
      result =
        packet.type === "working" && packet.nodeId === rootPlanId
          ? `...${nodes.length} tasks and ${edges.length} interdependencies`
          : isAgentPacketFinishedType(packet)
            ? getMostRelevantOutput(packet).output
            : "None";
    }
    if (!isOpen) {
      return result.replace(/\\n/g, " ");
    }
    return result;
  }, [t.value, t.nodeId, nodes.length, edges.length, isOpen]);
  return isOpen ? (
    <>
      <Typography
        level="body-sm"
        sx={{
          wordBreak: "break-word",
          maxLines: 1,
          textOverflow: "ellipsis",
          overflow: isOpen ? "visible" : "hidden",
          p: 1,
        }}
      >
        {artifacts.length ? `${artifacts.length} Downloads` : null}
      </Typography>
      <ResultMarkdown t={t} nodes={nodes} edges={edges} result={result} />
    </>
  ) : (
    <>
      <Typography
        level="body-sm"
        sx={{
          wordBreak: "break-word",
          maxLines: 1,
          textOverflow: "ellipsis",
          overflow: isOpen ? "visible" : "hidden",
          p: 1,
        }}
      >
        {result}
      </Typography>
    </>
  );
};

const TaskResultTitle = ({
  t,
  color,
  isOpen,
  artifacts,
  nodes,
  edges,
}: {
  t: TaskState;
  color: StatusColor;
  isOpen: boolean;
  artifacts: ArtifactAgentPacket[];
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
}) => {
  return (
    <Typography
      level="title-lg"
      color={color}
      sx={{
        p: 0.25,
        m: 0.25,
        whiteSpace: isOpen ? "normal" : "nowrap",
        overflow: isOpen ? "visible" : "hidden",
        textOverflow: isOpen ? "clip" : "ellipsis",
      }}
    >
      {t.status === TaskStatus.error ? "Error: " : "Result: "}
      {isOpen ? null : (
        <TaskResultsValue
          t={t}
          nodes={nodes}
          edges={edges}
          isOpen={isOpen}
          artifacts={artifacts}
        />
      )}
    </Typography>
  );
};

const SynthesizedContextValue = ({
  synthesizedContext,
  isOpen,
}: {
  synthesizedContext: string[];
  isOpen: boolean;
}): React.ReactNode => {
  if (isOpen) {
    return (
      <List sx={{ p: 0 }}>
        {synthesizedContext.map((c) => (
          <ListItem key={c} component={Box}>
            <ListItemDecorator>→</ListItemDecorator>
            <ListItemContent>
              <Typography
                level="body-sm"
                sx={{
                  wordBreak: "break-word",
                  maxLines: 1,
                  textOverflow: "ellipsis",
                  p: 1,
                }}
              >
                {c}
              </Typography>
            </ListItemContent>
          </ListItem>
        ))}
      </List>
    );
  } else {
    return (
      <Typography
        level="body-sm"
        sx={{
          wordBreak: "break-word",
          maxLines: 1,
          textOverflow: "ellipsis",
          p: 1,
        }}
      >
        {synthesizedContext.join(" • ")}
      </Typography>
    );
  }
};

const SynthesizedContextTitle = ({
  synthesizedContext,
  context,
  isOpen,
}: {
  synthesizedContext: string[];
  context: string | null;
  isOpen: boolean;
}) => {
  return (
    <Typography
      level="title-lg"
      sx={{
        p: 0.25,
        m: 0.25,
        maxLines: 1,
        whiteSpace: isOpen ? "normal" : "nowrap",
        overflow: isOpen ? "visible" : "hidden",
        textOverflow: isOpen ? "clip" : "ellipsis",
      }}
    >
      {context?.length ?? false ? "" : "Synthesized "} Context:
      {isOpen ? null : (
        <SynthesizedContextValue
          isOpen={isOpen}
          synthesizedContext={
            context?.length ?? false ? [context!] : synthesizedContext
          }
        />
      )}
    </Typography>
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
  isExpanded,
  ...props
}: TaskListItemProps) => {
  const { mode } = useColorScheme();
  const [isResultExpanded, setIsResultExpanded] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const node = useMemo(() => t.findNode(nodes), [nodes, t]);
  const [selectedGroup, setSelectedGroup] = useState<AgentPacket[] | null>(
    null,
  );
  // const [isCardVisible, setCardVisible] = useState(true);

  function isBaseAgentPacketWithIds(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packet: any,
  ): packet is BaseAgentPacketWithIds {
    // FIXME: this paves over a bug elsewhere due to packet being sent as a string
    if (typeof packet !== "string" && (packet as BaseAgentPacketWithIds)) {
      return "runId" in packet; //&& "parentRunId" in packet;
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

  const contextAndTools = useMemo(() => {
    const contextAndTools = findContextAndTools(t.packets);
    return contextAndTools;
  }, [t.packets]);

  const artifactPackets = useMemo(() => {
    const artifactPackets = findArtifactPackets(t.packets);
    return artifactPackets;
  }, [t.packets]);

  const mostRelevantOutput = useMemo(() => {
    const lastPacketGroup = packetGroups.length ? packetGroups[0] : [];
    const lastPacket = lastPacketGroup?.length
      ? lastPacketGroup[lastPacketGroup.length - 1]
      : null;
    return lastPacket && getMostRelevantOutput(lastPacket as AgentPacket);
  }, [packetGroups]);

  const color = useMemo(() => statusColor(t), [t, statusColor]);
  if (!node) {
    return null;
  }

  return (
    <ListItem
      {...props}
      sx={{
        flexDirection: { xs: "column", sm: "row" },
        pb: isExpanded ? "1rem" : 0,
        alignSelf: "start",
        width: { xs: "100%", sm: isExpanded ? "100%" : "fit-content" },
      }}
      className={` overflow-x-clip`}
      ref={(el) => el && (listItemsRef.current[i] = el)}
    >
      <ListItemDecorator
        component={Button}
        size="sm"
        sx={(theme) => ({
          minWidth: { xs: "100%", sm: "12rem" },
          maxWidth: { xs: "100%", sm: "12rem" },
          flexDirection: {
            xs: "row",
            sm: "column",
          },
          p: 0,
          overflow: "clip",
          alignSelf: "start",
          alignItems: "start",
          zIndex: 2,
          mr: isExpanded ? { xs: 0, sm: 2 } : 0,
          display: "flex",
          flexWrap: "wrap",
          position: "relative",
          boxShadow: "md",
          backgroundColor: !!color
            ? theme.palette.mode === "dark"
              ? theme.palette[color].outlinedActiveBg
              : theme.palette[color][300]
            : theme.palette.background.surface,
        })}
        variant={mode === "dark" ? "outlined" : "outlined"}
        color={color}
      >
        {isRunning && t.status === TaskStatus.working && (
          <LinearProgress
            size="sm"
            sx={{
              position: "absolute",
              top: 1,
              left: 0,
              right: 0,
            }}
            determinate={false}
            thickness={2}
            color={color}
          />
        )}
        <Typography
          level="title-sm"
          textAlign={"left"}
          sx={{
            width: "100%",
            p: 1,
          }}
        >
          <Tooltip
            title={
              t.displayId !== rootPlanId
                ? isTaskCriticism(t.nodeId)
                  ? "Reviews all other tasks in the tier to improve the quality of your results."
                  : "Performs actions in order to complete a sub-task of your goal."
                : "Determines what steps are needed to complete your goal."
            }
          >
            <Typography
              level="body-lg"
              variant="outlined"
              color={color}
              sx={(theme) => ({
                boxShadow: theme.palette.mode === "light" ? "sm" : "none",
                ml: -0.5,
                mr: 0.5,
              })}
            >
              {t.displayId !== rootPlanId
                ? isTaskCriticism(t.nodeId)
                  ? "⚖️"
                  : "🐝"
                : "👸"}
            </Typography>
          </Tooltip>
          {node.name}
        </Typography>
        <Stack
          component={Sheet}
          variant="outlined"
          direction={"row"}
          gap={1}
          sx={{
            justifyContent: "center",
            width: "100%",
            position: "sticky",
            bottom: 0,
            right: 0,
          }}
        >
          <Tooltip title={`${artifactPackets.length} Downloads available`}>
            <Typography
              level="body-xs"
              variant="plain"
              fontFamily={"monospace"}
              color={artifactPackets.length ? "success" : "neutral"}
              textAlign={"center"}
            >
              {artifactPackets.length}
              <Download />
            </Typography>
          </Tooltip>
          <Divider orientation="vertical" />
          <Tooltip title={"Number of actions/steps taken by the agent"}>
            <Typography
              level="body-xs"
              variant="plain"
              textAlign={"center"}
              fontFamily={"monospace"}
            >
              {packetGroups.length} Actions
            </Typography>
          </Tooltip>
          <Divider orientation="vertical" />
          <Tooltip title={"Latest Action"}>
            <Typography
              level="body-sm"
              textAlign={"center"}
              variant="plain"
              fontFamily={"monospace"}
              color={color}
            >
              {mostRelevantOutput?.emoji.length
                ? mostRelevantOutput.emoji
                : "💤"}
            </Typography>
          </Tooltip>
        </Stack>
        <AccordionGroup
          sx={(theme) => ({
            width: "100%",
            borderEndStartRadius: "sm",
            borderEndEndRadius: "sm",
            backdropFilter: "blur(10px)",
            backgroundColor: theme.palette.background.body,
            overflow: "clip",
            p: 0,
            m: 0,
          })}
          variant="plain"
          component={Sheet}
        >
          {(contextAndTools?.tools?.length ?? 0) > 0 && (
            <Accordion
              variant="outlined"
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              disabled={
                (contextAndTools?.tools?.length ?? 0) === 0 ||
                t.status === TaskStatus.idle
              }
              sx={{ flex: "1 1 auto", p: 0, mx: -0.2 }}
              color={color}
            >
              <AccordionSummary
                sx={{
                  verticalAlign: "middle",
                }}
              >
                <Typography
                  level="body-sm"
                  component={Chip}
                  color={color}
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    wordBreak: "break-word",
                    alignSelf: "center",
                    whiteSpace: "nowrap",
                    mr: 0,
                    pt: 0.5,
                    maxLines: 1,
                    background: "transparent",
                  }}
                >
                  ({contextAndTools?.tools?.length ?? "?"}) Skills
                </Typography>
              </AccordionSummary>

              <AccordionDetails>
                <List wrap={true} orientation="horizontal">
                  {contextAndTools?.tools?.map((tool) => (
                    <ListItem key={`x-${tool}`} sx={{ p: 0 }}>
                      <ListItemDecorator sx={{ ml: -3, pl: 3 }}>
                        ・
                      </ListItemDecorator>
                      <ListItemContent sx={{ pr: 2 }}>
                        <Typography level="body-xs" fontSize={"0.6rem"}>
                          {tool}
                        </Typography>
                      </ListItemContent>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </AccordionGroup>
      </ListItemDecorator>
      <ListItemContent
        sx={{
          transition: `opacity 0.3s ease-in-out, height 0.2s ease-in-out, width 0.1s ease-in-out`,
          opacity: isExpanded ? 1 : 0,
          maxHeight: isExpanded ? "inherit" : "0px", // Adjust '1000px' as needed
          overflow: "hidden",
          width: { xs: "100%", sm: isExpanded ? "100%" : "0px" },
          flexDirection: {
            xs: "row",
            sm: "column",
          },
          boxShadow: "md",
        }}
      >
        <Card
          variant="outlined"
          component={Stack}
          direction="column"
          className="overflow-x-clip overflow-y-clip"
          sx={{ boxShadow: "xl" }}
        >
          <ListItemButton
            color={color}
            variant="plain"
            sx={{ p: "0.1rem", m: 0, borderRadius: "0.1rem" }}
            onClick={(e) => {
              setSelectedGroup(selectedGroup ? null : t.packets);
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Sheet
              sx={{
                overflow: "auto",
                flexGrow: 1,
                p: 1,
              }}
              component={Stack}
              gap={1.5}
            >
              <Sheet
                sx={{
                  zIndex: 1,
                  pl: "0.35rem",
                  flexDirection: "row",
                  flex: "1 1 auto",
                }}
                component={Stack}
                direction="row"
                gap={1}
              >
                <Typography level="title-lg">Actions:</Typography>
                <Chip sx={{ minWidth: "2.5rem", textAlign: "center" }}>
                  {packetGroups.length}
                </Chip>
                {artifactPackets.length ? (
                  <Button
                    size="sm"
                    variant="plain"
                    color="success"
                    startDecorator={<Download />}
                    sx={{
                      // align right
                      ml: "auto",
                    }}
                    onClick={(e) => {
                      setSelectedGroup(artifactPackets);
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    All Files ({artifactPackets.length})
                  </Button>
                ) : null}
              </Sheet>
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
                {packetGroups.map((group, index) =>
                  renderPacketGroup(
                    group as AgentPacket[],
                    index,
                    selectedGroup,
                    setSelectedGroup,
                  ),
                )}
                <Modal
                  open={selectedGroup !== null}
                  onClose={() => setSelectedGroup(null)}
                >
                  <ModalDialog>
                    <DialogTitle id="task-dialog-title">
                      Detailed task information coming soon!
                    </DialogTitle>
                    <DialogContent>
                      <List>
                        {artifactPackets.map((p) => (
                          <ListItem key={p.url.toString()}>
                            {/* get the file extension if it exists */}
                            <ListItemDecorator>
                              {p.contentType}
                            </ListItemDecorator>
                            <Link
                              autoFocus
                              href={p.url}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(p.url, "_blank");
                              }}
                            >
                              {p.url.toString()}
                            </Link>
                          </ListItem>
                        ))}
                      </List>
                      {t.packets.map((p) => p.type).join(" → ")}
                    </DialogContent>
                    <DialogActions>
                      <Button
                        onClick={() => setSelectedGroup(null)}
                        variant="soft"
                      >
                        OK
                      </Button>
                    </DialogActions>
                  </ModalDialog>
                </Modal>
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
            </Sheet>
          </ListItemButton>
          <AccordionGroup
            variant="outlined"
            color={color}
            sx={{ overflow: "clip", cursor: "auto" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Accordion
              sx={{ maxWidth: "100%" }}
              expanded={isContextExpanded}
              onChange={(event, expanded) => {
                setIsContextExpanded(expanded);
                event.stopPropagation();
                event.preventDefault();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              component={Stack}
              direction={isContextExpanded ? "column" : "row"}
            >
              <AccordionSummary>
                <SynthesizedContextTitle
                  isOpen={isContextExpanded}
                  context={node.context}
                  synthesizedContext={
                    contextAndTools?.synthesizedContext ?? ["…"]
                  }
                />
              </AccordionSummary>
              <AccordionDetails
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <SynthesizedContextValue
                  isOpen={isContextExpanded}
                  synthesizedContext={
                    node.context?.length
                      ? [node.context]
                      : contextAndTools?.synthesizedContext ?? ["…"]
                  }
                />
              </AccordionDetails>
            </Accordion>
            <Accordion
              sx={{ maxWidth: "100%" }}
              expanded={isResultExpanded}
              onChange={(event, expanded) => {
                setIsResultExpanded(expanded);
                event.stopPropagation();
                event.preventDefault();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.target instanceof HTMLAnchorElement) {
                  if (event.target.href.startsWith("#")) {
                    return;
                  }
                  // open link
                  window.open(event.target.href, "_blank");
                  return;
                }
              }}
              component={Stack}
              direction={isResultExpanded ? "column" : "row"}
            >
              <AccordionSummary>
                <TaskResultTitle
                  t={t}
                  color={color}
                  isOpen={isResultExpanded}
                  nodes={nodes}
                  edges={edges}
                  artifacts={artifactPackets}
                />
              </AccordionSummary>
              <AccordionDetails>
                <TaskResultsValue
                  nodes={nodes}
                  edges={edges}
                  t={t}
                  isOpen
                  artifacts={artifactPackets}
                />
              </AccordionDetails>
            </Accordion>
          </AccordionGroup>
        </Card>
      </ListItemContent>
    </ListItem>
  );
};

export default TaskListItem;
