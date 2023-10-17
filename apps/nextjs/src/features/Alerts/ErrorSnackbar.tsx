import { useMemo, useState } from "react";
import { Card, Link, Tooltip } from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import * as Toast from "@radix-ui/react-toast";

import useApp from "~/stores/appStore";
import JoySnackbar from "../HeadlessUI/JoySnackbar";

export default function ErrorSnackbar() {
  const { error, setError } = useApp();
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const open = useMemo(() => !!error, [error]);

  return (
    <Toast.Provider swipeDirection="right">
      <JoySnackbar
        open={open}
        variant="plain"
        color="danger"
        type="foreground"
        duration={60000}
        sx={{
          borderRadius: "lg",
          shadowRadius: "xl",
          p: 0,
        }}
        onOpenChange={(open) => !open && setError(null)}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            maxHeight: "20rem",
            overflowY: "scroll",
            overflowX: "clip",
            maxWidth: "sm",
          }}
        >
          <Box component={Card} variant="soft" color="danger">
            <Typography
              level="title-lg"
              sx={(theme) => ({
                whiteSpace: "nowrap",
                position: "sticky",
                top: "-1rem",
                m: "-1rem",
                p: "1rem",
                textOverflow: "ellipsis",
                zIndex: 10,
                backgroundColor: theme.palette.background.popup,
              })}
              variant="plain"
            >
              {error?.name}
            </Typography>
            <Box sx={{ pt: 1 }}>
              <Tooltip
                open={isTooltipOpen}
                title={error?.message}
                enterDelay={Infinity}
              >
                <Typography
                  component={Link}
                  onClick={() => setIsTooltipOpen((prev) => !prev)}
                  level="body-sm"
                  color="danger"
                  fontFamily="monospace"
                  sx={{
                    whiteSpace: "break-word",
                  }}
                >
                  {error?.message}
                </Typography>
              </Tooltip>
            </Box>
          </Box>
          <Box
            sx={{
              alignSelf: "end",
              position: "sticky",
              bottom: 0,
              right: 0,
            }}
          >
            <Button
              size="lg"
              color="neutral"
              component={Toast.Action}
              altText="Dismiss message"
              variant="soft"
            >
              Dismiss
            </Button>
          </Box>
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
  );
}
