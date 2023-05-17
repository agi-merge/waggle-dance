import React from "react";
import { Close, Warning } from "@mui/icons-material";
import { Alert, Box, IconButton, Typography } from "@mui/joy";

import useApp from "~/stores/appStore";

const Alerts = () => {
  const { isDemoAlertOpen, setIsDemoAlertOpen } = useApp();
  const color = "warning";
  const title = "Limited Demo";
  const description = "Expect frequent changes.";
  const icon = <Warning />;
  return (
    <>
      {isDemoAlertOpen && (
        <Box
          className="my-2"
          sx={{
            display: "flex",
            gap: 2,
            width: "100%",
            flexDirection: "column",
          }}
        >
          <Alert
            key={title}
            sx={{ alignItems: "flex-start" }}
            startDecorator={React.cloneElement(icon, {
              sx: { mt: "2px", mx: "4px" },
              fontSize: "xl2",
            })}
            variant="soft"
            color={color}
            endDecorator={
              <IconButton
                variant="soft"
                size="sm"
                color={color}
                onClick={() => {
                  setIsDemoAlertOpen(false);
                }}
              >
                <Close />
              </IconButton>
            }
          >
            <div>
              <Typography fontWeight="lg" mt={0.25}>
                {title} •••{" "}
                <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                  {description}
                </Typography>{" "}
                •••
              </Typography>

              <Box>
                Known issues:{" "}
                <Typography level="body4">
                  - url upload works but file does not.
                  <br /> - the swarm doesnt use data yet
                  <br /> - planning takes a long time
                  <br /> - Stops after planning
                </Typography>
              </Box>
            </div>
          </Alert>
        </Box>
      )}
    </>
  );
};

export default Alerts;
