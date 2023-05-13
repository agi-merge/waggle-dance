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
import { type UploadFileDescriptor } from "~/pages/add-documents";

export interface FileUploadProps extends CardProps {
  uploadFile: UploadFileDescriptor;
  icon?: React.ReactElement;
}

export default function FileUploadStatus({
  uploadFile,
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
        {uploadState.status === "complete" && (
          <>
            <Typography level="body1">Summarization:</Typography>
            <Typography
              variant="soft"
              className="text-center"
              color="warning"
              level="body3"
            >
              {uploadState.analysisResult}
            </Typography>
          </>
        )}
        <Typography fontSize="sm">{name}</Typography>
        <Typography level="body3">{formatBytes(size)}</Typography>
        {uploadState.status === "uploading" ||
          (uploadState.status === "processing" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography fontSize="xs">
                {/* {uploadState.type === "uploading" && uploadState.progress}% */}
                {uploadState.status}
              </Typography>
              <LinearProgress
                // value={
                //   uploadState.type === "uploading" ? uploadState.progress : 100
                // }
                // determinate
                variant="plain"
                sx={{ bgcolor: "neutral.softBg" }}
              />
            </Box>
          ))}
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
