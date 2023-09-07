// components/Latency.tsx
import { QuestionMarkOutlined } from "@mui/icons-material";
import { IconButton, Tooltip, Typography } from "@mui/joy";

import { type LatencyScaleItem } from "./utils/latencyEstimate";

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
        <IconButton
          color={latencyLevel.color}
          variant="outlined"
          size="sm"
          sx={{ p: 0, m: 0, borderRadius: "50%" }}
        >
          <QuestionMarkOutlined
            sx={{
              fontSize: "8pt",
              p: 0,
              m: "auto",
              minWidth: 20,
            }}
          />
        </IconButton>
      </Typography>
    </Tooltip>
  );
}
