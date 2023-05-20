import React from "react";
import { Close, Warning } from "@mui/icons-material";
import { Alert, Box, Button, IconButton, Typography } from "@mui/joy";

import usePreferences from "~/stores/preferencesStore";

const Alerts = () => {
  const { isDemoAlertOpen, setIsDemoAlertOpen } = usePreferences();
  const color = "info";
  const title = "Limited Demo";
  const description = "Expect frequent changes and bugs";
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
            sx={{ alignItems: "flex-start text-center" }}
            startDecorator={React.cloneElement(icon, {
              sx: { mt: "2px", mx: "4px" },
              fontSize: "xl2",
            })}
            variant="soft"
            color={color}
            endDecorator={
              <Button
                variant="outlined"
                size="sm"
                className=""
                color={color}
                onClick={() => {
                  setIsDemoAlertOpen(false);
                }}
              >
                I understand
              </Button>
            }
          >
            <div>
              <Typography fontWeight="lg" mt={0.25}>
                {title}
              </Typography>
              <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                ••• {description} •••
              </Typography>
            </div>
          </Alert>
        </Box>
      )}
    </>
  );
};

export default Alerts;
