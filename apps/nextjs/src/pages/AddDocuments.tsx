// AddDocuments.tsx
import React, { useEffect } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Button, Typography } from "@mui/joy";

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
      <Button
        color="primary"
        href="waggle-dance"
        onClick={() => {
          router.push("/waggle-dance");
        }}
      >
        Next
      </Button>
    </MainLayout>
  );
};

export default AddDocuments;
