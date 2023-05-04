import React, { useState } from "react";
import { Close, Warning } from "@mui/icons-material";
import { Alert, Box, IconButton, Typography } from "@mui/joy";

const Alerts = () => {
  const [systemAlertOpen, setSystemAlertOpen] = useState(true);

  const color = "warning";
  const title = "Limited Demo";
  const description =
    "Core features may be missing and things are frequently changing.";
  const icon = <Warning />;
  return (
    <>
      {systemAlertOpen && (
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
                  setSystemAlertOpen(false);
                }}
              >
                <Close />
              </IconButton>
            }
          >
            <div>
              <Typography fontWeight="lg" mt={0.25}>
                {title}
              </Typography>
              <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                {description}
              </Typography>
            </div>
          </Alert>
        </Box>
      )}
    </>
  );
};

export default Alerts;
