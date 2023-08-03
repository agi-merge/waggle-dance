// FileUpload.tsx

import * as React from "react";
import AspectRatio from "@mui/joy/AspectRatio";
import Box from "@mui/joy/Box";
import Card, { type CardProps } from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import IconButton from "@mui/joy/IconButton";
import LinearProgress from "@mui/joy/LinearProgress";
import Typography from "@mui/joy/Typography";

import formatBytes from "~/utils/formatBytes";
import { type IngestFile } from "~/pages/add-documents";

export interface FileUploadProps extends CardProps {
  ingestFile: IngestFile;
  icon?: React.ReactElement;
}

export default function FileUploadStatus({
  ingestFile: uploadFile,
  icon,
  sx,
  ...props
}: FileUploadProps) {
  const { file, uploadState } = uploadFile;
  const { name, size } = file;
  return (
    <Card
      variant="outlined"
      orientation="horizontal"
      {...props}
      sx={[
        {
          gap: 1.5,
          alignItems: "flex-start",
          ...(uploadState.status === "complete" && {
            borderColor: "primary.500",
          }),
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <AspectRatio
        ratio="1"
        variant="soft"
        color="primary"
        sx={{
          minWidth: 32,
          borderRadius: "50%",
          "--Icon-fontSize": "16px",
        }}
      >
        <div>{icon ?? <i data-feather="file" />}</div>
      </AspectRatio>
      <CardContent>
        <Typography fontSize="sm">{name}</Typography>
        <Typography level="body-md">{formatBytes(size)}</Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography fontSize="xs">
            {uploadState.status}{" "}
            {uploadState.status === "error" && uploadState.message}
          </Typography>
          {uploadState.status === "uploading" ||
            (uploadState.status === "processing" && (
              <LinearProgress
                // value={
                //   uploadState.type === "uploading" ? uploadState.progress : 100
                // }
                // determinate
                variant="plain"
                sx={{ bgcolor: "neutral.softBg" }}
              />
              /* {uploadState.type === "uploading" && uploadState.progress}% */
            ))}
        </Box>
      </CardContent>
      {uploadState.status === "complete" ? (
        <AspectRatio
          ratio="1"
          variant="solid"
          color="primary"
          sx={{
            minWidth: 20,
            borderRadius: "50%",
            "--Icon-fontSize": "14px",
          }}
        >
          <div>
            <i data-feather="check" />
          </div>
        </AspectRatio>
      ) : (
        <IconButton
          variant="plain"
          color="neutral"
          size="sm"
          sx={{ mt: -1, mr: -1 }}
        >
          <i data-feather="trash-2" />
        </IconButton>
      )}
    </Card>
  );
}
