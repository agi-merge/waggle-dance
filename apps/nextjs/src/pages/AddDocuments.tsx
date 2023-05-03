// AddDocuments.tsx
import React, { useEffect } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/joy";

import DropZone from "~/components/DropZone";
import FileUpload from "~/components/FileUpload";
import MainLayout from "~/MainLayout";
import { useAppContext } from "./_app";

const AddDocuments: NextPage = () => {
  const router = useRouter();
  return (
    <MainLayout>
      {/* <Typography>*DEMO CLICK NEXT* Add Documents</Typography> */}
      {/* <FileUpload /> */}
      <DropZone />
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
    </MainLayout>
  );
};

export default AddDocuments;
