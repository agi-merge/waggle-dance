// AddDocuments.tsx
import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  KeyboardArrowUp,
} from "@mui/icons-material";
import {
  Button,
  Input,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Typography,
} from "@mui/joy";

import DropZone from "~/components/DropZone";
import FileUpload from "~/components/FileUpload";
import { useAppContext } from "./_app";

const AddDocuments: NextPage = () => {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const { goal } = useAppContext();

  const handleFileChange = (files) => {
    debugger;
    setUploadedFiles(files);
  };
  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      router.push("/");
    }
  }, [goal, router]);

  return (
    <>
      <List className="m-0 p-0">
        <ListItem>
          <ListItemButton
            onClick={(e) => {
              e.preventDefault();
              setHeaderExpanded(!headerExpanded);
            }}
          >
            <Stack>
              <Typography level="body1" style={{ userSelect: "none" }}>
                {headerExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                Enrich with context
              </Typography>
              {headerExpanded && (
                <>
                  <Typography level="body3" style={{ userSelect: "none" }}>
                    such as PDFs, URLs, Excel Spreadsheets, entire git repos,
                    Google Docs, Databases, your vacation photos, and more!
                  </Typography>
                  <Typography level="body3" style={{ userSelect: "none" }}>
                    The swarm will remember information that you deem important
                    to completing the task.
                  </Typography>
                </>
              )}
            </Stack>
          </ListItemButton>
        </ListItem>
      </List>
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
      <Input
        variant="outlined"
        placeholder="https://some-important-url.com/data.csv"
      />
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
