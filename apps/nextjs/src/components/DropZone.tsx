 
import * as React from "react";
import { useState } from "react";
import { Tooltip } from "@mui/joy";
import Box from "@mui/joy/Box";
import Card, { type CardProps } from "@mui/joy/Card";
import Link from "@mui/joy/Link";
import Typography from "@mui/joy/Typography";

const accept = [
  "application/msword",
  "application/pdf",
  "application/postscript",
  "application/rtf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/xml",
  "application/zip",
  "audio/mpeg",
  "audio/x-wav",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/tiff",
  "image/vnd.adobe.photoshop",
  "image/webp",
  "text/css",
  "text/csv",
  "text/html",
  "text/plain",
  "text/richtext",
  "text/tab-separated-values",
  "text/x-chdr",
  "text/x-csrc",
  "text/x-diff",
  "text/x-java",
  "text/x-perl",
  "text/x-python",
  "text/x-ruby",
  "text/x-shellscript",
  "text/x-sql",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-ms-wmv",
  "video/x-msvideo",
  "application/atom+xml",
  "application/javascript",
  "application/json",
  "application/octet-stream",
  "application/ogg",
  "application/sql",
  "application/x-font-ttf",
  "application/x-javascript",
  "application/x-pkcs12",
  "application/x-shockwave-flash",
  "application/x-www-form-urlencoded",
  "application/xhtml+xml",
  "application/xslt+xml",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-html+xml",
  "application/vnd.mozilla.xul+xml",
  "application/vnd.ms-xpsdocument",
  "application/x-7z-compressed",
  "application/x-bzip",
  "application/x-font-otf",
  "application/x-gzip",
  "application/x-httpd-php",
  "application/x-lzh",
  "application/x-lzx",
  "application/x-rar-compressed",
  "application/x-stuffit",
  "application/x-tar",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/midi",
  "audio/mp3",
  "audio/ogg",
  "audio/vorbis",
  "audio/x-aiff",
  "audio/x-au",
  "audio/x-ms-wma",
  "audio/x-ms-wax",
  "image/x-icon",
  "image/x-ms-bmp",
  "image/x-xpixmap",
  "image/x-xwindowdump",
  "message/rfc822",
  "multipart/form-data",
  "multipart/mixed",
  "multipart/related",
  "text/calendar",
  "text/x-chdr",
  "text/xml",
  "video/3gpp",
  "video/3gpp2",
  "video/h261",
  "video/h263",
  "video/h264",
  "video/jpeg",
  "application/x-font-woff",
].join(", ");

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
  const [files, setFiles] = React.useState([]);

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
        <Typography level="body2" textAlign="center">
          <input
            type="file"
            accept="accept"
            multiple
            onChange={handleUpload}
            style={{ display: "none" }}
            ref={fileInput}
          />
          <Link component="button" overlay onClick={handleClick}>
            Click to upload
          </Link>{" "}
          or drag and drop
          <br />{" "}
          <Tooltip title={accept}>
            <Link href="">File types and limits</Link>
          </Tooltip>
        </Typography>
      </Card>
    </DropZoneContainer>
  );
}
