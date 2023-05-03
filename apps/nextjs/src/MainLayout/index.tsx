import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Card, Divider, Sheet, useColorScheme } from "@mui/joy";

import { app } from "~/constants";
import { useAppContext } from "~/pages/_app";
import Header from "./components/Header";
import PageLoading from "./components/PageLoading";

const MainLayout = ({ children }) => {
  const { mode } = useColorScheme();
  const { goal } = useAppContext();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { slug } = router.query;

  // necessary for server-side renderingπ
  // because mode is undefined on the server
  useEffect(() => {
    setMounted(true);
  }, [goal, router]);
  if (!mounted) {
    return null;
  }

  // useEffect(() => {}, [goal, router]);

  return (
    <div
      className={mode === "dark" ? "bg-honeycomb dark" : "light bg-honeycomb"}
    >
      <div className="h-screen p-2 ">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Sheet
          // variant="outlined"
          className="full w-xl mx-auto max-w-xl items-center p-5"
          sx={{
            borderRadius: "lg",
            shadowRadius: "xl",
          }}
          invertedColors
        >
          <Header />
          <PageLoading />
          <Card className="w-full">{children}</Card>
        </Sheet>
      </div>
    </div>
  );
};

export default MainLayout;
