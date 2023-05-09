 
import * as React from "react";
import { useState } from "react";
import { Tooltip } from "@mui/joy";
import Box from "@mui/joy/Box";
import Card, { type CardProps } from "@mui/joy/Card";
import Link from "@mui/joy/Link";
import Typography from "@mui/joy/Typography";

import {
  acceptExtensions,
  getAllExtensions,
} from "~/features/Datastore/mimeTypes";
import { UploadResponse } from "../pages/api/docs/upload";

const DropZoneContainer = (props) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
  };

  const handleDrop = (e) => {
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
  const fileInput = React.useRef(null);
  const shadowFormRef = React.useRef(null);
  const [files, setFiles] = React.useState([]);
  const [analysisResults, setAnalysisResults] = React.useState([""]);
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(shadowFormRef.current);
    const response = await fetch("/api/docs/upload", {
      method: "POST",
      body: formData,
    });

    if (response.status === 200) {
      const uploadResponse: UploadResponse = await response.json();
      setAnalysisResults(uploadResponse.analysisResults);
      console.log(uploadResponse.analysisResults);
    } else {
      console.error(response);
      // error toast
    }
  };

  const handleClick = () => {
    if (fileInput.current) {
      fileInput.current.click();
    }
  };

  const handleUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    for (const file of uploadedFiles) {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onerror = () => {};
      fileReader.onload = () => {
        const newFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          content: fileReader.result,
        };

        setFiles((prevFiles) => {
          const updatedFiles = [...prevFiles, newFile];
          if (onFileChange) {
            onFileChange(updatedFiles);
          }
          shadowFormRef.current?.submit();
          return updatedFiles;
        });
      };
    }
  };
  return (
    <DropZoneContainer
      onDrop={(files) => {
        handleUpload({ target: { files: [...files] } });
      }}
    >
      {analysisResults.length > 0 &&
        analysisResults.map((result) => {
          return (
            <Typography
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
        <form onSubmit={handleSubmit} ref={shadowFormRef}>
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
