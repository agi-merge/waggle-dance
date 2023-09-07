// AddDocuments.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CheckCircle } from "@mui/icons-material";
import Box, { type BoxProps } from "@mui/joy/Box";
import IconButton from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import LinearProgress from "@mui/joy/LinearProgress";
import Stack from "@mui/joy/Stack";
import Table from "@mui/joy/Table";
import Typography from "@mui/joy/Typography";

import DropZoneUploader from "~/features/AddDocuments/DropZoneUploader";
import Title from "~/features/MainLayout/components/PageTitle";

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

type Props = BoxProps & {
  onClose?: () => void;
};
const AddDocuments = ({ onClose: _onClose, ...props }: Props) => {
  const [ingestFiles, setIngestFiles] = useState<IngestFiles>({});
  const [ingestUrls, setIngestUrls] = useState<IngestUrls>({});

  // const isAnyFileUploading = useMemo(() => {
  //   return Object.values(ingestFiles).some(
  //     (x) => x.uploadState.status === "uploading",
  //   );
  // }, [ingestFiles]);
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
    <Box {...props}>
      <Title title="💰 Documents, Data, and Tools">
        <Typography
          level="body-lg"
          sx={{
            userSelect: "none",
            marginBottom: { xs: -1, sm: 0 },
          }}
        >
          {
            "Add websites, documents, and tools to ensure better planning and execution."
          }
        </Typography>
      </Title>
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
      </Stack>
    </Box>
  );
};

export default AddDocuments;
