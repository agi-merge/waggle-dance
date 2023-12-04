import React, { useMemo } from "react";
import type { InferGetStaticPropsType } from "next";
import { Warning } from "@mui/icons-material";
import { Alert, Button, Stack, Typography } from "@mui/joy";

import type { getStaticProps } from "~/pages/goal/[[...goal]]";
import useAlertsStore from "~/stores/alertsStore";

const Alerts = ({
  alertConfigs,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { dismissAlertId, dismissedAlertIds } = useAlertsStore();
  const dismissedAlertIdsSet = useMemo(
    () => new Set(dismissedAlertIds),
    [dismissedAlertIds],
  );
  const nonDismissedAlertConfigs = useMemo(
    () => alertConfigs.filter((a) => !dismissedAlertIdsSet.has(a.id)),
    [alertConfigs, dismissedAlertIdsSet],
  );
  if (nonDismissedAlertConfigs.length === 0) {
    return null;
  }
  return (
    <Stack
      className="mb-6"
      sx={{
        display: "flex",
        gap: 2,
        width: "100%",
        flexDirection: "column",
      }}
    >
      {nonDismissedAlertConfigs.map((alert) => (
        <Alert
          key={alert.title}
          sx={{ alignItems: "flex-start text-center" }}
          startDecorator={React.cloneElement(<Warning />, {
            sx: { mt: "2px", mx: "4px" },
            color: "warning",
            fontSize: "xl2",
          })}
          variant="soft"
          color={alert.color}
          endDecorator={
            <Button
              variant="outlined"
              size="sm"
              color={alert.color}
              onClick={() => {
                dismissAlertId(alert.id);
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
      ))}
    </Stack>
  );
};

export default Alerts;

export const config = {
  runtime: "edge",
};
