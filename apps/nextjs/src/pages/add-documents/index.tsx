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
import {
  CheckCircle,
  KeyboardArrowDown,
  KeyboardArrowRight,
  KeyboardArrowUp,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  IconButton,
  Input,
  LinearProgress,
  Link,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import Table from "@mui/joy/Table";

import DropZoneUploader from "~/features/AddDocuments/DropZoneUploader";
import useGoal from "~/stores/goalStore";

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
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const [ingestFiles, setIngestFiles] = useState<IngestFiles>({});
  const [ingestUrls, setIngestUrls] = useState<IngestUrls>({});
  const { goal } = useGoal();

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
  const [urlInput, setUrlInput] = useState("");
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
    <Card variant="soft" className="mb-3">
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
            <Typography level="h4">Accelerate goal</Typography>
          </Link>
          {headerExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </Stack>
        {headerExpanded && (
          <>
            <Typography level="body3" style={{ userSelect: "none" }}>
              In order to achieve your goal, you may need to add any relevant
              data. GPT-4 has no knowledge of anything since September 2021, so
              anything newer than that would be a good target. You can also
              shortcut research steps by providing relevant data. For example,
              if you are working on a GitHub code project, it would save time to
              provide the GitHub URL.
            </Typography>
          </>
        )}
      </Stack>
      <Stack gap="1rem" className="mt-6">
        <IngestContext.Provider
          value={{
            ingestFiles: ingestFiles,
            setIngestFiles: setIngestFiles,
            ingestUrls: ingestUrls,
            setIngestUrls: setIngestUrls,
          }}
        >
          <Table
            className="mt-6"
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
        </IngestContext.Provider>
        <Typography className="mt-6" color="primary">
          URLs to Ingest
        </Typography>
        <Box className="flex pr-3">
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
        </Box>
        <Typography className="mt-2" color="primary">
          Files to Ingest
        </Typography>
        <DropZoneUploader />
        <Typography className="mt-6" color="primary">
          Service Connectors
        </Typography>
        <Sheet className="m-2 p-2">
          <Typography className="mt-6" level="body3">
            <Typography level="body2" color="info">
              Coming soon:
            </Typography>{" "}
            Use waggledance.ai to automatically automate your life w/ Zapier,
            IFTTT, Email, Discord, and more!
          </Typography>
        </Sheet>
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
    </Card>
  );
};

export default AddDocuments;
