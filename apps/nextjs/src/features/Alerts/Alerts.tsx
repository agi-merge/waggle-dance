import React from "react";
import type { InferGetStaticPropsType } from "next";
import { Warning } from "@mui/icons-material";
import { Alert, Box, Button, Typography } from "@mui/joy";

import { type getStaticProps } from "~/pages/goal/[[...goal]]";
import usePreferences from "~/stores/preferencesStore";

const Alerts = ({
  alertConfigs,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { isDemoAlertOpen, setIsDemoAlertOpen } = usePreferences();

  return (
    <>
      {isDemoAlertOpen &&
        alertConfigs.map((alert) => (
          <Box
            key={alert.title}
            className="mb-6"
            sx={{
              display: "flex",
              gap: 2,
              width: "100%",
              flexDirection: "column",
            }}
          >
            <Alert
              key={alert.title}
              sx={{ alignItems: "flex-start text-center" }}
              startDecorator={React.cloneElement(<Warning />, {
                sx: { mt: "2px", mx: "4px" },
                color: "warning",
                fontSize: "xl2",
              })}
              variant="soft"
              // color={alert.color}
              endDecorator={
                <Button
                  variant="outlined"
                  size="sm"
                  // color={alert.color}
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
                  {alert.title}
                </Typography>
                <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                  {alert.description}
                </Typography>
                <Typography fontSize="xs" sx={{ opacity: 0.5 }}>
                  {alert.footer}
                </Typography>
              </div>
            </Alert>
          </Box>
        ))}
    </>
  );
};

export default Alerts;

export const config = {
  runtime: "edge",
};
