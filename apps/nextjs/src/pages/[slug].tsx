// pages/[slug].tsx
import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";

import MainLayout from "~/MainLayout";
import AddDocuments from "./AddDocuments";
import WaggleDance from "./WaggleDance";

const SlugPage: NextPage = () => {
  const router = useRouter();
  // console.log(JSON.stringify(router));
  const { slug } = router.query;

  let content;
  if (slug === "add-documents") {
    content = <AddDocuments />;
  } else if (slug === "waggle-dance") {
    content = <WaggleDance />;
  } else {
    // Handle unknown slugs or show a 404 error message
    content = <h1>Page not found</h1>;
  }

  return content;
};

export default SlugPage;
