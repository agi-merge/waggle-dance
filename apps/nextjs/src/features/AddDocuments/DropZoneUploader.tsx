// DropZone.tsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import { UploadFile } from "@mui/icons-material";
import { Tooltip } from "@mui/joy";
import Box from "@mui/joy/Box";
import Card, { type CardProps } from "@mui/joy/Card";
import Link from "@mui/joy/Link";

import routes from "~/utils/routes";
import { acceptExtensions } from "~/features/AddDocuments/mimeTypes";
import { useIngest, type IngestFile } from "~/pages/add-documents";
import { type UploadResponse } from "../../pages/api/docs/ingest";

type DropZoneProps = CardProps;
interface ContainerProps {
  onDrop: (files: FileList) => void;
  children: React.ReactNode;
}

const DropZoneContainer = (props: ContainerProps) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

export default function DropZoneUploader({ sx, ...props }: DropZoneProps) {
  const { ingestFiles: uploadedFiles, setIngestFiles } = useIngest();
  const handleFileChange = (file: IngestFile) => {
    const updatedFiles = {
      ...uploadedFiles,
      [file.file.name]: file,
    };

    setIngestFiles(updatedFiles);
  };
  const fileInput = React.useRef<HTMLInputElement>(null);
  const shadowFormRef = React.useRef<HTMLFormElement>(null);
  const router = useRouter();

  const handleSubmit = async (
    event: ProgressEvent<FileReader>,
  ): Promise<UploadResponse | undefined> => {
    event.preventDefault();
    if (!shadowFormRef.current) return;
    const formData = new FormData(shadowFormRef.current);
    const response = await fetch("/api/docs/ingest", {
      method: "POST",
      body: formData,
    });

    if (response.status === 200) {
      const uploadResponse = (await response.json()) as UploadResponse;
      return uploadResponse;
    } else {
      console.error(response);
      await router.push(routes.auth);
      throw new Error(response.statusText);
    }
  };

  const handleClick = () => {
    if (!fileInput.current) return;
    fileInput.current.click();
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files === null) return;
    const uploadedFiles = event.target.files;
    for (const file of uploadedFiles) {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onerror = (event) => {
        const initialFile: IngestFile = {
          file,
          content: "",
          uploadState: {
            status: "error",
            message: event.target?.error?.message ?? "Unknown error",
          },
        };
        handleFileChange(initialFile);
      };
      fileReader.onload = async (event) => {
        const content = fileReader.result as string;
        const initialFile: IngestFile = {
          file,
          content,
          uploadState: {
            status: "uploading",
            progress: 0,
          },
        };
        handleFileChange(initialFile);
        try {
          const _uploadResults = (await handleSubmit(event)) ?? [];
          console.log("success");
          const analyzedFile: IngestFile = {
            file,
            content,
            uploadState: {
              status: "complete",
            },
          };
          handleFileChange(analyzedFile);
        } catch (error) {
          const message = (error as Error).message;
          console.error(message);
          if (error as Error) {
            const analyzedFile: IngestFile = {
              file,
              content,
              uploadState: {
                status: "error",
                message,
              },
            };
            handleFileChange(analyzedFile);
          }
        }
      };
    }
  };

  return (
    <DropZoneContainer
      onDrop={(files: FileList) => {
        handleUpload({
          target: { files },
        } as React.ChangeEvent<HTMLInputElement>);
      }}
    >
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
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
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
            <UploadFile className="m-2" />
          </Box>
        </Box>
        <Link component="button" overlay onClick={handleClick} type="button">
          Click to upload
        </Link>{" "}
        <form ref={shadowFormRef}>
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
