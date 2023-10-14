import { useMemo } from "react";
import { Tooltip } from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import * as Toast from "@radix-ui/react-toast";

import useApp from "~/stores/appStore";
import JoySnackbar from "../HeadlessUI/JoySnackbar";

export default function ErrorSnackbar() {
  const { error, setError } = useApp();

  const open = useMemo(() => !!error, [error]);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Toast.Provider swipeDirection="right">
        <JoySnackbar
          open={open}
          variant="soft"
          color="danger"
          sx={(theme) => ({
            borderRadius: "lg",
            shadowRadius: "xl",
            backgroundColor: theme.palette.background.backdrop,
            backdropFilter: "blur(3px)",
            "@supports not ((-webkit-backdrop-filter: blur) or (backdrop-filter: blur))":
              {
                backgroundColor: theme.palette.background.surface, // Add opacity to the background color
              },
          })}
          onOpenChange={(open) => !open && setError(null)}
          endDecorator={
            <Button
              color="danger"
              component={Toast.Action}
              altText="Dismiss message"
              variant="outlined"
              sx={{ ml: 2 }}
            >
              Dismiss
            </Button>
          }
        >
          <Box>
            <Typography color="danger" level="title-lg">
              {error?.name}
            </Typography>
            <Tooltip title={error?.message} enterDelay={500}>
              <Typography
                component="time"
                level="body-sm"
                color="danger"
                fontFamily="monospace"
              >
                {error?.message.slice(0, 250)}
              </Typography>
            </Tooltip>
          </Box>
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
            minWidth: "xs",
            maxWidth: { sm: "sm", md: "60dvw", lg: "40dvw" },
            margin: 0,
            listStyle: "none",
            zIndex: 2147483647,
            outline: "none",
          }}
        />
      </Toast.Provider>
    </Box>
  );
}
