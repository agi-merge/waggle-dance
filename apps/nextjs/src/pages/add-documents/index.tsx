// AddDocuments.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  CheckCircle,
  KeyboardArrowDown,
  KeyboardArrowRight,
  KeyboardArrowUp,
} from "@mui/icons-material";
import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  List,
  ListItem,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";

import DropZoneUploader from "~/features/AddDocuments/DropZoneUploader";
import FileUploadStatus from "~/features/AddDocuments/FileUploadStatus";
import { useAppContext } from "../_app";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "processing" }
  | { status: "complete" }
  | { status: "error"; message: string };
export interface UploadFileDescriptor {
  file: File;
  content: string;
  uploadState: UploadState;
}

export type UploadedFiles = Record<string, UploadFileDescriptor>;

const UploadedFilesContext = createContext<{
  uploadedFiles: UploadedFiles;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFiles>>;
}>({
  uploadedFiles: {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setUploadedFiles: () => {},
});

export function useUploadedFiles() {
  return useContext(UploadedFilesContext);
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

const AddDocuments: NextPage = () => {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({});
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const { goal } = useAppContext();

  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      void router.push("/");
    }
  }, [goal, router]);
  const isAnyFileUploading = useMemo(() => {
    return Object.values(uploadedFiles).some(
      (x) => x.uploadState.status === "uploading",
    );
  }, [uploadedFiles]);
  const [urlInput, setUrlInput] = useState(
    "https://github.com/agi-merge/waggle-dance",
  );
  const urlInputRef = useRef<HTMLInputElement>(null);
  const handleUrlSubmit = useCallback(async () => {
    if (isValidUrl(urlInput)) {
      const response = await fetch("/api/docs/urls/ingest", {
        method: "POST",
        body: JSON.stringify({ url: urlInput }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response);
      setUrlInput("https://github.com/agi-merge/waggle-dance");
    } else {
      console.error("Invalid URL:", urlInput);
    }
  }, [urlInput]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        void handleUrlSubmit();
      }
    },
    [handleUrlSubmit],
  );

  return (
    <UploadedFilesContext.Provider value={{ uploadedFiles, setUploadedFiles }}>
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
                    The swarm will remember information that you deem important
                    to completing the task.
                  </Typography>
                </>
              )}
            </Stack>
          </ListItem>
        </List>
        {Object.entries(uploadedFiles).map((uploadFile) => (
          <FileUploadStatus
            key={uploadFile[0]}
            uploadFile={uploadFile[1]}
            icon={
              uploadFile[1].file.type.startsWith("image/") ? (
                // <img
                //   src={uploadFile.file.sli}
                //   alt={uploadFile.file.name}
                //   style={{
                //     width: "16px",
                //     height: "16px",
                //     objectFit: "cover",
                //     borderRadius: "50%",
                //   }}
                // />
                <></>
              ) : undefined
            }
          />
        ))}

        <FormControl>
          <FormLabel>URLs to Ingest</FormLabel>
          <Sheet className="flex">
            <Input
              className="flex-grow"
              ref={urlInputRef}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={handleKeyPress}
              variant="outlined"
              placeholder="e.g. https://github.com/agi-merge/waggle-dance"
            />
            <IconButton
              disabled={!isValidUrl(urlInput)}
              // edge="end"
              onClick={void handleUrlSubmit}
            >
              <CheckCircle />
            </IconButton>
          </Sheet>
          <FormHelperText>Enter URLs to ingest.</FormHelperText>
        </FormControl>
        <DropZoneUploader />
        <Stack direction="row-reverse" className="mt-2" gap="1rem">
          <Button
            disabled={isAnyFileUploading}
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
    </UploadedFilesContext.Provider>
  );
};

export default AddDocuments;
