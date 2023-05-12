// AddDocuments.tsx
import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  KeyboardArrowUp,
} from "@mui/icons-material";
import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/joy";

import DropZone from "~/components/DropZone";
import FileUpload from "~/components/FileUpload";
import { useAppContext } from "./_app";

type FileContainer = {
  name: string;
  size: number;
  type: string;
  content: string;
  progress?: number;
};

const AddDocuments: NextPage = () => {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<FileContainer[]>([]);
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const { goal } = useAppContext();

  const handleFileChange = (files: FileContainer[]) => {
    debugger;
    setUploadedFiles(files);
  };
  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      void router.push("/");
    }
  }, [goal, router]);

  return (
    <Stack gap="1rem">
      <List className="m-0 p-0">
        <ListItem>
          <Stack
            className="flex flex-grow cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              setHeaderExpanded(!headerExpanded);
            }}
          >
            <Stack direction="row" className="flex">
              <Link
                href="#"
                className="flex-grow select-none pr-5 text-white"
                style={{ userSelect: "none" }}
              >
                <Typography level="h4">
                  Add data to automate even faster
                </Typography>
              </Link>
              {headerExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </Stack>
            {headerExpanded && (
              <>
                <Typography level="body3" style={{ userSelect: "none" }}>
                  such as PDFs, URLs, Excel Spreadsheets, entire git repos,
                  Google Docs, Databases, your vacation photos, and more!
                </Typography>
                <Typography level="body3" style={{ userSelect: "none" }}>
                  The swarm will remember information that you deem important to
                  completing the task.
                </Typography>
              </>
            )}
          </Stack>
        </ListItem>
      </List>
      {uploadedFiles.map((file: FileContainer, index: number) => (
        <FileUpload
          key={index}
          fileName={file.name}
          fileSize={`${Math.round(file.size / 1000)} KB`}
          progress={file.progress ?? 0}
          icon={
            file.type.startsWith("image/") ? (
              <Image
                src={file.content}
                alt={file.name}
                width={16}
                height={16}
                style={{
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <></>
            )
          }
        />
      ))}
      <FormControl>
        <FormLabel>URLs to Ingest</FormLabel>
        <Input
          variant="outlined"
          placeholder="e.g. https://some-important-url.com/data.csv"
        />
        <FormHelperText>Enter URLs to ingest.</FormHelperText>
      </FormControl>
      <DropZone onFileChange={(event) => void handleFileChange(event)} />
      <Stack direction="row-reverse" className="mt-2" gap="1rem">
        <Button
          className="col-end mt-2"
          color="primary"
          href="waggle-dance"
          onClick={() => {
            void router.push("/waggle-dance");
          }}
        >
          Next
          <KeyboardArrowRight />
        </Button>
      </Stack>
    </Stack>
  );
};

export default AddDocuments;
