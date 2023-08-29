import { useMemo } from "react";
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
          color="danger"
          variant="solid"
          sx={(theme) => ({
            borderRadius: "lg",
            shadowRadius: "xl",
            backgroundColor: theme.palette.background.backdrop,
            backdropFilter: "blur(3px)",
          })}
          invertedColors
          onOpenChange={(open) => !open && setError(null)}
          endDecorator={
            <Button
              component={Toast.Action}
              altText="Dismiss message"
              variant="soft"
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
            <Typography component="time" level="body-sm" color="danger">
              {error?.message}
            </Typography>
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
            width: "390px",
            maxWidth: "100dvw",
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
