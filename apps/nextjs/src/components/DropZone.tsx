/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as React from "react";
import { useState } from "react";
import { Tooltip } from "@mui/joy";
import Box from "@mui/joy/Box";
import Card, { type CardProps } from "@mui/joy/Card";
import Link from "@mui/joy/Link";
import Typography from "@mui/joy/Typography";

import { acceptExtensions } from "~/features/Datastore/mimeTypes";
import { type UploadResponse } from "../pages/api/docs/upload";

interface ContainerProps {
  onDrop: (files: FileList) => void;
  children: React.ReactNode;
}

const DropZoneContainer = (props: ContainerProps) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleDragEnter: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(true);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
    props.onDrop(e.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: isHovering ? "rgba(0, 0, 0, 0.05)" : "transparent",
      }}
    >
      {props.children}
    </div>
  );
};

interface DropZoneProps extends CardProps {
  onFileChange?: (
    files: {
      name: string;
      size: number;
      type: string;
      content: string;
    }[],
  ) => void;
}
export default function DropZone({
  sx,
  onFileChange,
  ...props
}: DropZoneProps) {
  const fileInput = React.useRef<HTMLInputElement>(null);
  const shadowFormRef = React.useRef<HTMLFormElement>(null);
  const [_files, setFiles] = React.useState([]);
  const [analysisResults, setAnalysisResults] = React.useState([""]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!shadowFormRef.current) return;

    const formData = new FormData(shadowFormRef.current);
    const response = await fetch("/api/docs/upload", {
      method: "POST",
      body: formData,
    });

    if (response.status === 200) {
      const uploadResponse = (await response.json()) as UploadResponse;
      setAnalysisResults(uploadResponse.analysisResults || []);
      console.log(uploadResponse.analysisResults);
    } else {
      console.error(response);
      // error toast
    }
  };

  const handleClick = () => {
    if (!fileInput.current) return;
    fileInput.current.click();
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event?.target?.files || []);
    for (const file of uploadedFiles) {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onerror = () => {
        console.error("Error reading file");
      };
      fileReader.onload = () => {
        const newFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          content: fileReader.result,
        };

        // @ts-ignore TODO: gotta come back to this one, its tricky
        setFiles(async (prevFiles) => {
          const updatedFiles = [...prevFiles, newFile];
          if (onFileChange) {
            // @ts-ignore TODO: gotta come back to this one, its tricky
            onFileChange(updatedFiles);
          }
          // @ts-ignore TODO: gotta come back to this one, its tricky
          await handleSubmit(event);
          return updatedFiles;
        });
      };
    }
  };
  return (
    <DropZoneContainer
      onDrop={(files: FileList) => {
        // @ts-ignore TODO: gotta come back to this one, its tricky
        handleUpload({ target: { files: [...files] } });
      }}
    >
      {analysisResults.length > 0 &&
        analysisResults.map((result, idx) => {
          return (
            <Typography
              key={idx}
              variant="soft"
              className="text-center"
              color="warning"
              level="body2"
            >
              {result}
            </Typography>
          );
        })}
      <Card
        variant="outlined"
        {...props}
        sx={[
          {
            borderRadius: "sm",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            alignItems: "center",
            px: 3,
            flexGrow: 1,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <Box sx={{ p: 1, bgcolor: "background.level1", borderRadius: "50%" }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: "background.level2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i data-feather="upload-cloud" />
          </Box>
        </Box>
        <Link component="button" overlay onClick={handleClick} type="button">
          Click to upload
        </Link>{" "}
        <form
          onSubmit={(event) => void handleSubmit(event)}
          ref={shadowFormRef}
        >
          <input
            type="file"
            name="files"
            accept={acceptExtensions}
            multiple
            onChange={handleUpload}
            style={{ display: "none" }}
            ref={fileInput}
          />
        </form>
        or drag and drop
        <br />{" "}
        <Tooltip title={acceptExtensions}>
          <Link href="">File types and limits</Link>
        </Tooltip>
      </Card>
    </DropZoneContainer>
  );
}
