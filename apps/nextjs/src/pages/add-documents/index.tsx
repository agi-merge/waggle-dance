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
import { useRouter } from "next/router";
import { CheckCircle, KeyboardArrowRight } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  IconButton,
  Input,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/joy";
import Table from "@mui/joy/Table";

import DropZoneUploader from "~/features/AddDocuments/DropZoneUploader";
import Title from "~/features/MainLayout/components/PageTitle";
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
  ingestFiles: IngestFiles;
  ingestUrls: IngestUrls;
  setIngestFiles: React.Dispatch<React.SetStateAction<IngestFiles>>;
  setIngestUrls: React.Dispatch<React.SetStateAction<IngestUrls>>;
}>({
  ingestFiles: {},
  ingestUrls: {},
  setIngestFiles: () => {
    // intentionally blank
  },
  setIngestUrls: () => {
    // intentionally blank
  },
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

type Props = {
  hideTitleGoal?: boolean;
  onClose?: () => void;
};
const AddDocuments = ({ hideTitleGoal, onClose }: Props) => {
  const router = useRouter();
  const [ingestFiles, setIngestFiles] = useState<IngestFiles>({});
  const [ingestUrls, setIngestUrls] = useState<IngestUrls>({});
  const { goal } = useGoal();

  useEffect(() => {
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
    <>
      <Title
        title="🌺 Add Documents & Data"
        description="
                Providing up to date and relevant information upfront will
                ensure better planning and execution by the waggling swarm of
                bees. You can keep adding documents later as well."
        hideGoal={hideTitleGoal}
      />
      <Stack gap="1rem" className="mt-6">
        <IngestContext.Provider
          value={{
            ingestFiles,
            setIngestFiles,
            ingestUrls,
            setIngestUrls,
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
                  <td>
                    {ingestFile[1].file.name.slice(
                      0,
                      Math.min(30, ingestFile[1].file.name.length),
                    )}
                  </td>
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
          URLs
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
            onClick={void handleUrlSubmit}
          >
            <CheckCircle />
          </IconButton>
        </Box>
        <Typography className="mt-2" color="primary">
          Files
        </Typography>
        <DropZoneUploader />
        <Typography className="mt-6" color="primary">
          Plugins
        </Typography>
        <Card className="mt-2 p-2" variant="outlined">
          <Typography className="mt-6" level="body3">
            <Typography level="body2" color="info">
              Coming soon:
            </Typography>{" "}
            Use waggledance.ai to automatically automate your life w/ Zapier,
            IFTTT, Email, Discord, and more!
          </Typography>
        </Card>
        <Stack direction="row-reverse" className="mt-2" gap="1rem">
          <Button
            disabled={isAnyFileUploading}
            className="col-end mt-2"
            color="primary"
            href="waggle-dance"
            onClick={() => {
              if (!hideTitleGoal) {
                void router.push("/waggle-dance");
              } else {
                if (onClose) onClose();
              }
            }}
          >
            {onClose ? (
              <>
                Next <KeyboardArrowRight />
              </>
            ) : (
              "Done"
            )}
          </Button>
        </Stack>
      </Stack>
    </>
  );
};

export default AddDocuments;
