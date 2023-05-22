import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Card, LinearProgress, Sheet, useColorScheme } from "@mui/joy";

import { type CombinedResponse } from "~/utils/openAIUsageAPI";
import { app } from "~/constants";
import useApp from "~/stores/appStore";
import Alerts from "./components/Alerts";
import Footer from "./components/Footer";
import Header from "./components/Header";

type Props = {
  children: React.ReactNode;
  openAIUsage?: CombinedResponse | null; // Add this prop
};

const MainLayout = ({ children, openAIUsage }: Props) => {
  const { mode } = useColorScheme();
  const { isPageLoading } = useApp();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // necessary for server-side renderingπ
  // because mode is undefined on the server
  useEffect(() => {
    setMounted(true);
  }, [router]);
  const progressOpacity = useMemo(() => {
    return isPageLoading ? 100 : 0;
  }, [isPageLoading]);

  if (!mounted) {
    return null;
  }
  return (
    <div className={`bg-honeycomb ${mode === "dark" ? " dark" : "light"}`}>
      <div className="max-h-screen min-h-screen overflow-y-auto px-2 pb-2">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta
            name="theme-color"
            content={mode === "dark" ? "#2e1900" : "#FAB561"}
          />
          <meta
            name="viewport"
            content="initial-scale=1, width=device-width, viewport-fit=cover"
          />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content={app.name} />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content={mode === "dark" ? "black" : "default"}
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="mx" />
        <Sheet
          // variant="outlined"
          className="mx-auto sm:w-full md:w-3/4 lg:max-w-screen-md"
          sx={{
            borderRadius: "lg",
            shadowRadius: "xl",
          }}
          invertedColors
          variant="soft"
        >
          <LinearProgress
            thickness={3}
            sx={{ opacity: progressOpacity }}
            color="primary"
          />
          <Header openAIUsage={openAIUsage} />
          <Card
            invertedColors
            color="primary"
            variant="outlined"
            className="-m-2 p-0"
          >
            <Alerts />
            {children}
          </Card>
          <Footer />
        </Sheet>
      </div>
    </div>
  );
};

export default MainLayout;
