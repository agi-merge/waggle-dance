import React from "react";
import { Edit, Send } from "@mui/icons-material";
import {
  Card,
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

import { TaskStatus, type TaskState } from "@acme/agent";

import { stringifyMax } from "../utils/stringifyMax";

interface TaskListItemProps {
  task: TaskState;
  i: number;
  statusColor: (
    n: TaskState,
  ) => "danger" | "success" | "warning" | "primary" | "neutral" | undefined;
  isRunning: boolean;
  listItemsRef: React.MutableRefObject<HTMLLIElement[]>;
}

const TaskListItem = ({
  task: t,
  i,
  statusColor,
  isRunning,
  listItemsRef,
}: TaskListItemProps) => {
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
            {t.name}
          </Typography>
          <Typography level="title-sm" color="neutral" fontFamily="monospace">
            id: <Typography level="body-sm">{t.id}</Typography>
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
              level="title-sm"
              style={{
                overflowWrap: "break-word",
              }}
            >
              {t.act}
              <Typography
                fontFamily="monospace"
                level="body-sm"
                className="text-wrap"
                style={{
                  overflowWrap: "break-word",
                  width: "100%",
                }}
              >
                {" ("}
                {t.params}
                {")"}
              </Typography>
            </Typography>
            <Divider inset="context" />
            <Typography
              level="body-sm"
              className="text-wrap"
              color="neutral"
              style={{
                overflowWrap: "break-word",
              }}
            >
              {stringifyMax(t.context, 200)}
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
              {t.result ? <>Result: </> : <>Status: </>}
              <Typography level="body-md" color="neutral">
                {t.packets.slice(0, -1).map((p, index) => (
                  <span key={index}>{p.type} → </span>
                ))}
                {t.packets.length > 0 && (
                  <Typography color={statusColor(t)} level="body-md">
                    {t.packets[t.packets.length - 1]?.type}
                  </Typography>
                )}
              </Typography>
            </Typography>

            {t.result && (
              <Typography
                level="body-sm"
                className="max-h-72 overflow-x-clip overflow-y-scroll  break-words pt-2"
                fontFamily={
                  t.status === TaskStatus.error ? "monospace" : undefined
                }
              >
                {t.result}
              </Typography>
            )}
          </Card>
        </Card>
      </ListItemContent>
    </ListItem>
  );
};

export default TaskListItem;
