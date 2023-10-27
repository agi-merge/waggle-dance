import { useMemo } from "react";
import Link from "next/link";
import { Close, GitHub } from "@mui/icons-material";
import {
  Button,
  IconButton,
  List,
  ListDivider,
  ListItem,
  ListItemButton,
  Sheet,
  Stack,
  SvgIcon,
} from "@mui/joy";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import * as Toast from "@radix-ui/react-toast";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { env } from "~/env.mjs";
import useIsAppleDevice from "~/hooks/useIsAppleDevice";
import useApp from "~/stores/appStore";
import JoySnackbar from "../HeadlessUI/JoySnackbar";

const Support = () => {
  return (
    <List
      orientation="horizontal"
      size="sm"
      sx={{
        float: "end",
        alignItems: "center",
        flexGrow: 1,
        alignSelf: "flex-end",
      }}
    >
      <ListItem>
        <Typography level="body-xs">Support:</Typography>
      </ListItem>
      {env.NEXT_PUBLIC_DISCORD_INVITE_URL && (
        <>
          <ListItem>
            <ListItemButton>
              <Link
                color="neutral"
                href={env.NEXT_PUBLIC_DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SvgIcon viewBox="0 0 127.14 96.36" color="neutral">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </SvgIcon>
              </Link>
            </ListItemButton>
          </ListItem>
          <ListDivider inset="gutter" />
        </>
      )}
      <ListItem>
        <ListItemButton color="neutral">
          <Link
            href="https://github.com/agi-merge/waggle-dance/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHub />
          </Link>
        </ListItemButton>
      </ListItem>
    </List>
  );
};
export default function ErrorSnackbar() {
  const { error, setError } = useApp();
  const open = useMemo(() => !!error, [error]);
  const isAppleDevice = useIsAppleDevice();

  return (
    <Toast.Provider swipeDirection="right">
      <JoySnackbar
        open={open}
        variant="outlined"
        type="foreground"
        duration={60000}
        sx={{
          borderRadius: "lg",
          shadowRadius: "xl",
          p: 0,
        }}
        onOpenChange={(open) => !open && setError(null)}
      >
        <Stack direction="column" gap={1}>
          <Sheet
            sx={(theme) => ({
              flex: 1,
              alignItems: "center",
              p: 1,
              m: -1.5,
              backgroundColor: theme.palette.background.level1,
            })}
            component={Stack}
            direction={"row"}
          >
            <IconButton
              size="lg"
              color="neutral"
              component={Toast.Close}
              variant="plain"
              sx={{
                position: "absolute",
                [isAppleDevice ? "left" : "right"]: 0,
              }}
            >
              <Close />
            </IconButton>
            <Typography
              level="title-lg"
              sx={{
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                ml: isAppleDevice ? 5 : 0,
                mr: isAppleDevice ? 0 : 5,
              }}
              variant="plain"
            >
              {error?.name}
            </Typography>
          </Sheet>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "10rem",
              overflowY: "scroll",
              overflowX: "clip",
            }}
          >
            <Box sx={{ p: 4, width: { xs: "100%", sm: "30rem" } }}>
              <Typography
                color="danger"
                fontFamily="monospace"
                sx={{
                  userSelect: "text",
                  whiteSpace: "break-word",
                }}
                component={Box}
              >
                <Markdown
                  className={`markdown break-words pt-2 font-mono`}
                  remarkPlugins={[remarkGfm]}
                >
                  {error?.message}
                </Markdown>
              </Typography>
            </Box>
          </Box>
          <Box
            component={Stack}
            direction="row"
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "flex-end", // aligns the button to the right
            }}
          >
            <Support />
            <Button
              color="neutral"
              variant="outlined"
              size="lg"
              sx={{ borderRadius: "sm" }}
              component={Toast.Close}
            >
              Dismiss
            </Button>
          </Box>
        </Stack>
      </JoySnackbar>
      <Box
        component={Toast.Viewport}
        sx={{
          "--viewport-padding": "25px",
          position: "fixed",
          bottom: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          padding: "var(--viewport-padding)",
          gap: "10px",
          margin: 0,
          listStyle: "none",
          zIndex: 2147483647,
          outline: "none",
        }}
      />
    </Toast.Provider>
  );
}
