// AddDocuments.tsx
import React, { useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/joy";

import DropZone from "~/components/DropZone";
import FileUpload from "~/components/FileUpload";

const AddDocuments: NextPage = () => {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = (files) => {
    debugger;
    setUploadedFiles(files);
  };

  return (
    <>
      <Typography level="body1">Enrich with context</Typography>
      <Typography level="body3">
        such as PDFs, URLs, Excel Spreadsheets, entire git repos, Google Docs,
        Databases, your vacation photos, and more!
      </Typography>
      <Typography level="body3">
        The swarm will remember information that you deem important to
        completing the task.
      </Typography>
      <br />
      {uploadedFiles.map((file, index) => (
        <FileUpload
          key={index}
          fileName={file.name}
          fileSize={`${Math.round(file.size / 1000)} KB`}
          progress={file.progress}
          icon={
            file.type.startsWith("image/") ? (
              <img
                src={file.content}
                alt={file.name}
                style={{
                  width: "16px",
                  height: "16px",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : null
          }
        />
      ))}
      <DropZone onFileChange={handleFileChange} />
      <Stack direction="row-reverse" className="mt-2" gap="1rem">
        <Button
          className="col-end mt-2"
          color="primary"
          href="waggle-dance"
          onClick={() => {
            router.push("/waggle-dance");
          }}
        >
          Start
          <KeyboardArrowRight />
        </Button>
      </Stack>
      <Typography color="warning" level="body4">
        Demo currently does not support uploading files lol
      </Typography>
    </>
  );
};

export default AddDocuments;
