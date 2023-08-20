// features/MainLayout/index.tsx

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import GlobalStyles from "@mui/joy/GlobalStyles";
import LinearProgress from "@mui/joy/LinearProgress";
import { useColorScheme } from "@mui/joy/styles";

import { app } from "~/constants";
import useApp from "~/stores/appStore";
import GoalTabs from "../WaggleDance/components/GoalTabs";
import Alerts from "./components/Alerts";
import Footer from "./components/Footer";
import Header from "./components/Header";

type Props = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: Props) => {
  const { mode } = useColorScheme();
  const { isPageLoading } = useApp();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // necessary for server-side renderingπ
  // because mode is undefined on the server
  useEffect(() => {
    setMounted(true);
    if (mode) {
      if (document.body.classList.contains("dark")) {
        document.body.classList.remove("dark");
      }
      if (document.body.classList.contains("light")) {
        document.body.classList.remove("light");
      }
      if (document.body.classList.contains("system")) {
        document.body.classList.remove("system");
      }
      document.body.classList.add(mode);
    }
  }, [router, mode]);

  const progressOpacity = useMemo(() => {
    return isPageLoading ? 100 : 0;
  }, [isPageLoading]);

  const pageOpacity = useMemo(() => {
    return isPageLoading ? 50 : 100;
  }, [isPageLoading]);

  if (!mounted) {
    return null;
  }
  return (
    <Box className={`xs:pt-0 overflow-clip sm:pt-2`}>
      <Box
        className={`overflow-x-clip overflow-y-scroll px-2 pb-2`}
        sx={{
          height: "calc(100dvh + env(safe-area-inset-bottom))",
          minHeight: "calc(100dvh + env(safe-area-inset-bottom))",
        }}
      >
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta
            name="theme-color"
            content={mode === "dark" ? "#2e1900" : "#FAB561"}
          />
          <meta
            name="viewport"
            content="initial-scale=1, viewport-fit=cover width=device-width height=device-height"
          />
          <meta name="apple-mobile-web-app-title" content={app.name} />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content={mode === "dark" ? "black-translucent" : "default"}
          />
        </Head>

        <GlobalStyles
          styles={(_theme) => ({
            ":root": {
              "--Header-height": "2.9rem",
            },
          })}
        />
        <Card
          className=" mx-auto md:max-w-screen-lg xl:max-w-screen-lg"
          sx={(theme) => ({
            borderRadius: "lg",
            shadowRadius: "xl",
            backgroundColor: theme.palette.background.backdrop,
            backdropFilter: "blur(3px)",
          })}
          variant="soft"
        >
          <Header />
          <Card
            invertedColors
            color="primary"
            variant="outlined"
            className="-m-2 p-0"
            sx={{
              borderRadius: "lg",
              paddingBottom: 0,
              zIndex: 1,
              opacity: pageOpacity,
            }}
          >
            <Alerts />
            <GoalTabs>
              <LinearProgress
                thickness={3}
                sx={{ opacity: progressOpacity }}
                color="neutral"
              />
              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                data-callback="javascriptCallback"
                data-theme={mode === "dark" ? "dark" : "light"}
              ></div>
              {children}
            </GoalTabs>
          </Card>
          <Footer
            className="xs:scale-75 sticky bottom-0 flex w-full pb-2 pt-10 md:scale-100"
            style={{
              bottom: "calc(env(safe-area-inset-bottom))",
            }}
          />
        </Card>
      </Box>
    </Box>
  );
};

export default MainLayout;
