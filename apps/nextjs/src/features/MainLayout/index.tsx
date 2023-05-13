import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Card, LinearProgress, Sheet, useColorScheme } from "@mui/joy";

import { app } from "~/constants";
import { useAppContext } from "~/pages/_app";
import Alerts from "./components/Alerts";
import Footer from "./components/Footer";
import Header from "./components/Header";

type Props = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: Props) => {
  const { mode } = useColorScheme();
  const { isPageLoading } = useAppContext();
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
      <div className="min-h-screen px-2 pb-4">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta
            name="viewport"
            content="initial-scale=1, width=device-width, viewport-fit=cover"
          />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Sheet
          // variant="outlined"
          className="mx-auto sm:w-full md:max-w-2xl"
          sx={{
            borderRadius: "lg",
            shadowRadius: "xl",
          }}
          invertedColors
          variant="soft"
        >
          <Header />
          <LinearProgress thickness={2} sx={{ opacity: progressOpacity }} />
          <Card
            invertedColors
            color="primary"
            variant="outlined"
            className="-m-2 my-5 p-2"
          >
            {children}
          </Card>
          <Alerts />
          <Footer />
        </Sheet>
      </div>
    </div>
  );
};

export default MainLayout;
