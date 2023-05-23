import { useMemo } from "react";
import Link from "next/link";
import { LinearProgress, Sheet, Typography } from "@mui/joy";

import { type CombinedResponse } from "~/utils/openAIUsageAPI";
import { app } from "~/constants";

const OpenAIUsage = ({ openAIUsage }: { openAIUsage: CombinedResponse }) => {
  const percent = useMemo(
    () => (openAIUsage.currentUsage / openAIUsage.allottedUsage) * 100,
    [openAIUsage.currentUsage, openAIUsage.allottedUsage],
  );

  return (
    <Sheet
      variant="soft"
      className="m-1 flex min-w-fit flex-grow flex-col p-1"
      color="neutral"
    >
      <Typography level="body3">Global Free OpenAI Limit:</Typography>
      <Link
        className="flex flex-grow"
        color="neutral"
        target="_blank"
        href={app.routes.donate}
      >
        <LinearProgress
          determinate
          variant="outlined"
          color="neutral"
          size="sm"
          thickness={32}
          value={percent}
          sx={{
            "--LinearProgress-radius": "0px",
            "--LinearProgress-progressThickness": "24px",
            boxShadow: "sm",
            borderColor: "neutral.500",
          }}
        >
          <Typography
            level="body3"
            fontWeight="sm"
            textColor="common.white"
            sx={{ mixBlendMode: "difference" }}
          >
            ${Math.round(openAIUsage.currentUsage)} / $
            {Math.round(openAIUsage.allottedUsage)} ($
            {Math.round(
              openAIUsage.allottedUsage - openAIUsage.currentUsage,
            )}{" "}
            remaining)
          </Typography>
        </LinearProgress>
      </Link>
    </Sheet>
  );
};

export default OpenAIUsage;
