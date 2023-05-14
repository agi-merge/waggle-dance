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
import { useRouter } from "next/router";
import { CheckCircle, KeyboardArrowRight } from "@mui/icons-material";
import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  LinearProgress,
  Sheet,
  Stack,
} from "@mui/joy";
import Table from "@mui/joy/Table";

import DropZoneUploader from "~/features/AddDocuments/DropZoneUploader";
import { useAppContext } from "../_app";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "processing" }
  | { status: "complete" }
  | { status: "error"; message: string };
export interface IngestFile {
  file: File;
  content: string;
  uploadState: UploadState;
}
export interface IngestUrl {
  url: string;
  uploadState: UploadState;
}

export type IngestFiles = Record<string, IngestFile>;
export type IngestUrls = Record<string, IngestUrl>;

const IngestContext = createContext<{
  // Add uploadedUrls to the context
  ingestFiles: IngestFiles;
  ingestUrls: IngestUrls;
  setIngestFiles: React.Dispatch<React.SetStateAction<IngestFiles>>;
  setIngestUrls: React.Dispatch<React.SetStateAction<IngestUrls>>;
}>({
  // Same initial values as earlier
  ingestFiles: {},
  ingestUrls: {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setIngestFiles: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setIngestUrls: () => {},
});

export function useIngest() {
  const context = useContext(IngestContext);
  return { ...context, uploadedUrls: context.ingestUrls };
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
  const [ingestFiles, setIngestFiles] = useState<IngestFiles>({});
  const [ingestUrls, setIngestUrls] = useState<IngestUrls>({});
  const { goal } = useAppContext();

  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      void router.push("/");
    }
  }, [goal, router]);
  const isAnyFileUploading = useMemo(() => {
    return Object.values(ingestFiles).some(
      (x) => x.uploadState.status === "uploading",
    );
  }, [ingestFiles]);
  const [urlInput, setUrlInput] = useState(
    "https://github.com/agi-merge/waggle-dance",
  );
  const urlInputRef = useRef<HTMLInputElement>(null);
  const handleUrlSubmit = useCallback(async () => {
    setIngestUrls((prev) => ({
      ...prev,
      [urlInput]: {
        url: urlInput,
        uploadState: { status: "processing" },
      },
    }));
    if (isValidUrl(urlInput)) {
      const response = await fetch("/api/docs/urls/ingest", {
        method: "POST",
        body: JSON.stringify({ url: urlInput }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        setUrlInput("");
        setIngestUrls((prev) => ({
          ...prev,
          [urlInput]: {
            url: urlInput,
            uploadState: { status: "complete" },
          },
        }));
      } else {
        setIngestUrls((prev) => ({
          ...prev,
          [urlInput]: {
            url: urlInput,
            uploadState: {
              status: "error",
              message: "Failed to ingest URL",
            },
          },
        }));
      }
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
    <IngestContext.Provider
      value={{
        ingestFiles: ingestFiles,
        setIngestFiles: setIngestFiles,
        ingestUrls: ingestUrls,
        setIngestUrls: setIngestUrls,
      }}
    >
      <Table
        variant="outlined"
        className="mb-3 p-3"
        hidden={
          Object.entries(ingestFiles).length === 0 &&
          Object.entries(ingestUrls).length === 0
        }
      >
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(ingestFiles).map((ingestFile) => (
            <tr key={ingestFile[0]}>
              <td>{ingestFile[1].file.name}</td>
              <td>{ingestFile[1].file.type}</td>
              <td>
                <div>
                  {ingestFile[1].uploadState.status === "uploading" ||
                    (ingestFile[1].uploadState.status === "processing" && (
                      <LinearProgress
                        variant="plain"
                        sx={{ bgcolor: "neutral.softBg" }}
                      />
                    ))}
                  {ingestFile[1].uploadState.status}{" "}
                  {ingestFile[1].uploadState.status === "error" &&
                    ingestFile[1].uploadState.message}
                </div>
              </td>
            </tr>
            // <FileUploadStatus key={ingestFile[0]} ingestFile={ingestFile[1]} />
          ))}
          {Object.entries(ingestUrls).map((ingestUrl) => (
            <tr key={ingestUrl[0]}>
              <td>{ingestUrl[1].url}</td>
              <td>URL</td>
              <td>{ingestUrl[1].uploadState.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>

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
    </IngestContext.Provider>
  );
};

export default AddDocuments;
