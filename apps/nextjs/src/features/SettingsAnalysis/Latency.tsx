// components/Latency.tsx
import { Tooltip, Typography } from "@mui/joy";

import { type LatencyScaleItem } from "./hooks/useLatencyEstimate";

type LatencyProps = {
  latencyLevel: LatencyScaleItem;
};
export function Latency({ latencyLevel }: LatencyProps) {
  return (
    <Tooltip
      title={`(Lower is better) ${latencyLevel.description}`}
      sx={{ cursor: "pointer" }}
    >
      <Typography noWrap level="title-sm" color="neutral">
        Latency:{" "}
        <Typography color={latencyLevel.color} level="body-sm">
          {latencyLevel.label}
        </Typography>{" "}
      </Typography>
    </Tooltip>
  );
}
